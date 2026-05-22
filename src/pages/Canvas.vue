<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import prototypePages from 'virtual:prototype-pages'
import { DEVICES } from '@/constants/constants-devices'
import { getDesignBaseMode, getSavedDevice, saveDevice, type DeviceName } from '@/utils/utils-device'
import CanvasDocPanel from './canvas/CanvasDocPanel.vue'
import CanvasPageNode from './canvas/CanvasPageNode.vue'
import CanvasToolbar from './canvas/CanvasToolbar.vue'
import { getTagContent, parseApis, parseJumps, renderMarkdown } from './canvas/parsePrototypeSource'
import {
  JUMP_ENTRY_MARKER_RADIUS,
  JUMP_REASON_MARKER_RADIUS,
  MARKER_LINE_GAP,
  getEdgeColor,
  getLaneOffset,
  getMarkerOffset,
  routeEdge,
} from './canvas/edgeRouting'
import type { DrawnLine, Edge, JumpMarker, PageApi, PageNode } from './canvas/types'

const router = useRouter()

const pages = ref<Map<string, PageNode>>(new Map())
const edges = ref<Edge[]>([])
const selectedPageId = ref<string | null>(null)
const showRelatedLines = ref(false)
const activeDocPageId = ref<string | null>(null)
const activeJumpLineKey = ref<string | null>(null)
const copiedPageId = ref<string | null>(null)
let copyFeedbackTimer: number | null = null

const activeDocPage = computed(() => {
  if (!activeDocPageId.value) return null
  return pages.value.get(activeDocPageId.value) || null
})

const selectedPage = computed(() => {
  if (selectedPageId.value && pages.value.has(selectedPageId.value)) {
    return pages.value.get(selectedPageId.value) || null
  }
  return pages.value.values().next().value || null
})


// Position and dimensions
const designBase = import.meta.env.VITE_DESIGN_BASE
const designBaseMode = getDesignBaseMode(designBase)
const canSwitchDevices = computed(() => designBaseMode === 'all')

const isDeviceName = (value: string | null): value is DeviceName => {
  return !!value && value in DEVICES
}

const getInitialDevice = (): DeviceName => {
  if (designBaseMode !== 'all') return designBaseMode
  const savedDevice = getSavedDevice()

  return isDeviceName(savedDevice) ? savedDevice : 'mobile'
}

const activeDevice = ref<DeviceName>(getInitialDevice())
const currentDevice = computed(() => DEVICES[activeDevice.value])

const isDeviceDisabled = (device: DeviceName) => {
  return !canSwitchDevices.value && device !== activeDevice.value
}

const getPageSize = () => ({
  width: currentDevice.value.width,
  height: currentDevice.value.height,
})

const autoPositionPages = (pageMap: Map<string, PageNode>) => {
  const { width, height, gapX, gapY } = currentDevice.value
  const placed = new Set<string>()
  const queue: { id: string, layer: number, row: number }[] = []

  if (pageMap.has('index')) {
    queue.push({ id: 'index', layer: 0, row: 0 })
  } else {
    const firstId = pageMap.keys().next().value
    if (firstId) queue.push({ id: firstId, layer: 0, row: 0 })
  }

  const layerCounts: Record<number, number> = {}

  while (queue.length > 0) {
    const current = queue.shift()!
    if (placed.has(current.id)) continue

    const node = pageMap.get(current.id)
    if (!node) continue

    if (layerCounts[current.layer] === undefined) {
      layerCounts[current.layer] = 0
    }

    node.x = 100 + current.layer * (width + gapX)
    node.y = 100 + layerCounts[current.layer] * (height + gapY)
    node.width = width
    node.height = height

    layerCounts[current.layer]++
    placed.add(current.id)

    for (const childId of node.jumps.map((jump) => jump.targetId)) {
      if (!placed.has(childId)) {
        queue.push({ id: childId, layer: current.layer + 1, row: 0 })
      }
    }
  }

  const maxRows = Math.max(0, ...Object.values(layerCounts))
  let isolatedX = 0
  for (const node of pageMap.values()) {
    node.width = width
    node.height = height
    if (!placed.has(node.id)) {
      node.x = 100 + isolatedX * (width + gapX)
      node.y = 100 + maxRows * (height + gapY)
      isolatedX++
    }
  }
}

const pageVersion = ref(Date.now())

const buildPrototypeUrl = (path: string, version = pageVersion.value) => {
  const url = new URL(path, import.meta.env.VITE_PROTOTYPE_ORIGIN)
  if (version) {
    url.searchParams.set('_t', String(version))
  }
  return url.href
}

const escapeMarkdownLinkText = (value: string) => {
  return value.replace(/([\\\[\]])/g, '\\$1')
}

const buildApiDocUrl = (path: string) => {
  const server = import.meta.env.VITE_REDOCLY_CLI_SERVER
  if (!server || !path) return ''

  return new URL(path, server.endsWith('/') ? server : `${server}/`).href
}

const resolveDocApiReferences = (doc: string, apis: PageApi[]) => {
  return doc.replace(/<apis\.([A-Za-z0-9_-]+)>/g, (_, apiId: string) => {
    const api = apis.find((item) => item.id === apiId)
    const apiName = escapeMarkdownLinkText(api?.name || apiId)

    if (api?.docUrl) {
      return `【[${apiName}](${api.docUrl})】`
    }

    return `【**接口文档地址未配置：${apiName}**】`
  })
}

const loadPageSources = async () => {
  try {
    const response = await fetch(`/__prototype_pages?t=${pageVersion.value}`, { cache: 'no-store' })
    if (response.ok) {
      return await response.json() as typeof prototypePages
    }
  } catch (error) {
    console.warn('Failed to fetch prototype pages, falling back to bundled sources:', error)
  }

  return prototypePages
}

const loadPages = async () => {
  const loadedPages: Record<string, PageNode> = {}
  const pageSources = await loadPageSources()
  
  for (const pageSource of pageSources) {
    const name = pageSource.name
    const rawContent = pageSource.content
    
    const jumps = parseJumps(rawContent).filter((jump) => jump.targetId !== name)

    const apis = parseApis(rawContent).map((api) => ({
      ...api,
      docUrl: buildApiDocUrl(api.path),
    }))
    const doc = resolveDocApiReferences(getTagContent(rawContent, 'doc') || '暂无页面说明', apis)
    
    const pageSize = getPageSize()
    loadedPages[name] = {
      id: name,
      name,
      url: buildPrototypeUrl(`/pages/${name}`),
      doc,
      docHtml: renderMarkdown(doc),
      apis,
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
      jumps
    }
  }

  const loadedPageMap = new Map<string, PageNode>()
  for (const id in loadedPages) {
    loadedPageMap.set(id, loadedPages[id])
  }
  // 2. Position pages logically based on links (BFS traversal)
  autoPositionPages(loadedPageMap)
  pages.value = loadedPageMap

  // 2.5 Restore saved layout from localStorage
  restoreLayout()

  // 3. Populate Edges
  const tempEdges: Edge[] = []
  for (const [id, node] of pages.value.entries()) {
    for (const jump of node.jumps) {
      if (pages.value.has(jump.targetId)) {
        tempEdges.push({
          id: `${id}-${jump.targetId}-${jump.id}`,
          sourceId: id,
          targetId: jump.targetId,
          jumpId: jump.id,
          reason: jump.reason
        })
      }
    }
  }
  edges.value = tempEdges
  selectedPageId.value = pages.value.has('index') ? 'index' : (pages.value.keys().next().value || null)

  // Initial edge calculation after DOM renders
  await nextTick()
  updateEdges()
}

// Graph processing
onMounted(async () => {
  await loadPages()

  if (import.meta.hot) {
    import.meta.hot.on('prototype-pages:update', async () => {
      pageVersion.value = Date.now()
      await loadPages()
    })
  }
})

onBeforeUnmount(() => {
  if (copyFeedbackTimer !== null) {
    window.clearTimeout(copyFeedbackTimer)
  }
})

const drawnLines = ref<DrawnLine[]>([])

const incomingMarkers = computed<JumpMarker[]>(() => {
  const markers: JumpMarker[] = []
  for (const page of pages.value.values()) {
    const pageEdges = edges.value.filter((edge) => edge.targetId === page.id)
    pageEdges.forEach((edge, index) => {
      const source = pages.value.get(edge.sourceId)
      if (!source) return
      markers.push({
        key: edge.id,
        edge,
        x: page.x,
        y: page.y + page.height / 2 + getMarkerOffset(index, pageEdges.length),
        sourceName: source.name,
        targetName: page.name,
      })
    })
  }
  return markers
})

const outgoingMarkers = computed<JumpMarker[]>(() => {
  const markers: JumpMarker[] = []
  for (const page of pages.value.values()) {
    const pageEdges = edges.value.filter((edge) => edge.sourceId === page.id)
    pageEdges.forEach((edge, index) => {
      const target = pages.value.get(edge.targetId)
      if (!target) return
      markers.push({
        key: edge.id,
        edge,
        x: page.x + page.width,
        y: page.y + page.height / 2 + getMarkerOffset(index, pageEdges.length),
        sourceName: page.name,
        targetName: target.name,
      })
    })
  }
  return markers
})

const activeJumpLine = computed(() => {
  if (!activeJumpLineKey.value) return null
  return outgoingMarkers.value.find((marker) => marker.key === activeJumpLineKey.value) || null
})

const visibleEdges = computed(() => {
  if (!showRelatedLines.value || !selectedPage.value) return []
  return edges.value.filter((edge) => edge.sourceId === selectedPage.value?.id || edge.targetId === selectedPage.value?.id)
})

const updateEdges = () => {
  if (!edges.value || !pages.value) return
  const edgesToDraw = visibleEdges.value
  if (!edgesToDraw.length) {
    drawnLines.value = []
    return
  }

  const pagesMap = pages.value
  const routes = edgesToDraw
    .map((edge) => {
      const source = pagesMap.get(edge.sourceId)
      const target = pagesMap.get(edge.targetId)
      const outMarker = outgoingMarkers.value.find((marker) => marker.key === edge.id)
      const inMarker = incomingMarkers.value.find((marker) => marker.key === edge.id)

      if (!source || !target || !outMarker || !inMarker) return null

      return {
        edge,
        source,
        target,
        sourcePort: {
          x: outMarker.x + JUMP_REASON_MARKER_RADIUS + MARKER_LINE_GAP,
          y: outMarker.y,
          dx: 1,
          dy: 0,
        },
        targetPort: {
          x: inMarker.x - JUMP_ENTRY_MARKER_RADIUS - MARKER_LINE_GAP,
          y: inMarker.y,
          dx: -1,
          dy: 0,
        },
      }
    })
    .filter((route): route is NonNullable<typeof route> => route !== null)
    .sort((a, b) => {
      const aY = (a.sourcePort.y + a.targetPort.y) / 2
      const bY = (b.sourcePort.y + b.targetPort.y) / 2
      return aY - bY || a.source.name.localeCompare(b.source.name) || a.target.name.localeCompare(b.target.name)
    })

  const lineCount = routes.length
  drawnLines.value = routes.map((route, index) => ({
    key: route.edge.id,
    path: routeEdge(route.source, route.target, route.sourcePort, route.targetPort, getLaneOffset(index, lineCount), index),
    color: getEdgeColor(route.edge.id, index),
  }))

  if (activeJumpLineKey.value && !outgoingMarkers.value.some((line) => line.key === activeJumpLineKey.value)) {
    activeJumpLineKey.value = null
  }
}

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
let isDraggingCanvas = false

// --- Node Dragging ---
let isDraggingNode = false
const draggingNodeId = ref<string | null>(null)
let dragStartX = 0
let dragStartY = 0
let nodeStartX = 0
let nodeStartY = 0
let edgeUpdateRafId: number | null = null

const scheduleEdgeUpdate = () => {
  if (edgeUpdateRafId !== null) return
  edgeUpdateRafId = requestAnimationFrame(() => {
    updateEdges()
    edgeUpdateRafId = null
  })
}

const selectPage = (pageId: string) => {
  selectedPageId.value = pageId
  if (showRelatedLines.value) {
    scheduleEdgeUpdate()
  }
}

const toggleRelatedLinesForPage = async (pageId: string) => {
  const shouldHideCurrentPage = showRelatedLines.value && selectedPageId.value === pageId
  selectedPageId.value = pageId
  showRelatedLines.value = !shouldHideCurrentPage
  await nextTick()
  updateEdges()
}

const getPageFrameUrl = (page: PageNode) => {
  const fallbackUrl = new URL(page.url, window.location.origin).href
  const iframe = document.getElementById(`iframe-${page.id}`) as HTMLIFrameElement | null

  try {
    return iframe?.contentWindow?.location.href || fallbackUrl
  } catch (error) {
    return fallbackUrl
  }
}

const copyTextToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

const copyPageLink = async (e: MouseEvent, page: PageNode) => {
  e.stopPropagation()
  selectPage(page.id)

  try {
    await copyTextToClipboard(getPageFrameUrl(page))
    copiedPageId.value = page.id
    if (copyFeedbackTimer !== null) {
      window.clearTimeout(copyFeedbackTimer)
    }
    copyFeedbackTimer = window.setTimeout(() => {
      if (copiedPageId.value === page.id) {
        copiedPageId.value = null
      }
      copyFeedbackTimer = null
    }, 1400)
  } catch (error) {
    alert('复制链接失败，请检查浏览器剪贴板权限')
  }
}

const resetPageFrame = (e: MouseEvent, page: PageNode) => {
  e.stopPropagation()
  selectPage(page.id)
  activeDocPageId.value = null
  activeJumpLineKey.value = null

  const iframe = document.getElementById(`iframe-${page.id}`) as HTMLIFrameElement | null
  if (iframe) {
    iframe.src = page.url
  }
}

const onNodeHeaderMouseDown = (e: MouseEvent, pageId: string) => {
  e.stopPropagation()
  const page = pages.value.get(pageId)
  if (!page) return
  selectPage(pageId)
  isDraggingNode = true
  draggingNodeId.value = pageId
  dragStartX = e.clientX
  dragStartY = e.clientY
  nodeStartX = page.x
  nodeStartY = page.y
}

const onMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.page-wrapper') || target.closest('.proto-btn') || target.closest('.jump-reason-btn') || target.closest('.jump-entry-marker') || target.closest('.jump-reason-popover')) return
  activeDocPageId.value = null
  activeJumpLineKey.value = null
  isDraggingCanvas = true
}

const onMouseMove = (e: MouseEvent) => {
  if (isDraggingNode && draggingNodeId.value) {
    const page = pages.value.get(draggingNodeId.value)
    if (!page) return
    const dx = (e.clientX - dragStartX) / scale.value
    const dy = (e.clientY - dragStartY) / scale.value
    page.x = nodeStartX + dx
    page.y = nodeStartY + dy
    scheduleEdgeUpdate()
    return
  }
  if (!isDraggingCanvas) return
  translateX.value += e.movementX
  translateY.value += e.movementY
}

const onMouseUp = () => {
  if (isDraggingNode && draggingNodeId.value) {
    saveLayout()
  }
  isDraggingCanvas = false
  isDraggingNode = false
  draggingNodeId.value = null
}

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const zoomFactor = 0.1
    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor
    const newScale = Math.max(0.1, Math.min(3, Math.round((scale.value + delta) * 10) / 10))
    
    if (newScale !== scale.value) {
      const ratio = newScale / scale.value
      translateX.value = e.clientX - (e.clientX - translateX.value) * ratio
      translateY.value = e.clientY - (e.clientY - translateY.value) * ratio
      scale.value = newScale
    }
  }
}

const onDoubleClickPage = (page: PageNode) => {
  selectPage(page.id)
  const targetScale = 1
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  
  scale.value = targetScale
  translateX.value = centerX - (page.x + page.width / 2) * targetScale
  translateY.value = centerY - (page.y + page.height / 2) * targetScale
}

const startPrototype = () => {
  router.push('/prototype')
}

const togglePageDoc = (e: MouseEvent, pageId: string) => {
  e.stopPropagation()
  selectPage(pageId)
  activeJumpLineKey.value = null
  const isClosing = activeDocPageId.value === pageId
  activeDocPageId.value = isClosing ? null : pageId
}

const toggleJumpReason = (e: MouseEvent, marker: JumpMarker) => {
  e.stopPropagation()
  selectPage(marker.edge.sourceId)
  activeDocPageId.value = null
  activeJumpLineKey.value = activeJumpLineKey.value === marker.key ? null : marker.key
}

const focusPage = async (pageId: string) => {
  const page = pages.value.get(pageId)
  if (!page) return
  selectPage(pageId)
  activeJumpLineKey.value = null
  await nextTick()
  onDoubleClickPage(page)
}

// --- Layout Persistence ---
const layoutStorageKey = computed(() => `canvas-layout-${activeDevice.value}`)

const getLayoutData = () => {
  const positions: Record<string, { x: number, y: number }> = {}
  for (const [id, page] of pages.value.entries()) {
    positions[id] = { x: page.x, y: page.y }
  }
  return positions
}

const applyLayoutData = (positions: Record<string, { x: number, y: number }>) => {
  for (const [id, pos] of Object.entries(positions)) {
    const page = pages.value.get(id)
    if (page) {
      page.x = pos.x
      page.y = pos.y
    }
  }
  scheduleEdgeUpdate()
}

const saveLayout = () => {
  try {
    localStorage.setItem(layoutStorageKey.value, JSON.stringify(getLayoutData()))
  } catch (e) { /* quota exceeded etc */ }
}

const restoreLayout = () => {
  try {
    const raw = localStorage.getItem(layoutStorageKey.value)
    if (raw) {
      applyLayoutData(JSON.parse(raw))
    }
  } catch (e) { /* ignore parse errors */ }
}

const switchDevice = async (device: DeviceName) => {
  if (device === activeDevice.value || isDeviceDisabled(device)) return

  saveLayout()
  activeDevice.value = device
  if (canSwitchDevices.value) {
    saveDevice(device)
  }
  activeDocPageId.value = null
  activeJumpLineKey.value = null

  autoPositionPages(pages.value)
  restoreLayout()
  await nextTick()
  updateEdges()
}

const exportLayout = () => {
  const data = JSON.stringify(getLayoutData(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'canvas-layout.json'
  a.click()
  URL.revokeObjectURL(url)
}

const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerImport = () => {
  fileInputRef.value?.click()
}

const importLayout = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const positions = JSON.parse(reader.result as string)
      applyLayoutData(positions)
      saveLayout()
    } catch (err) {
      alert('布局文件格式错误')
    }
  }
  reader.readAsText(file)
  // Reset so same file can be re-imported
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="canvas-wrapper system-design-token">
    <!-- Hidden file input for import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="importLayout"
    />

    <CanvasToolbar
      :active-device="activeDevice"
      :current-device="currentDevice"
      :is-device-disabled="isDeviceDisabled"
      @switch-device="switchDevice"
      @export-layout="exportLayout"
      @trigger-import="triggerImport"
      @start-prototype="startPrototype"
    />

    <div 
      class="infinite-canvas"
      :class="{ 'is-dragging-node': !!draggingNodeId }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel="onWheel"
    >
      <div 
        class="canvas-content"
        :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
      >
        <!-- SVG connecting lines -->
        <svg class="canvas-svg">
          <path
            v-for="line in drawnLines"
            :key="`${line.key}-halo`"
            :d="line.path"
            class="connection-line-halo"
          />
          <path 
            v-for="line in drawnLines" 
            :key="line.key"
            :d="line.path"
            class="connection-line"
            :style="{ stroke: line.color }"
          />
        </svg>

        <button
          v-for="marker in incomingMarkers"
          :key="`${marker.key}-entry`"
          class="jump-entry-marker"
          type="button"
          :style="{ left: `${marker.x}px`, top: `${marker.y}px` }"
          :aria-label="`${marker.sourceName}.vue 跳转到 ${marker.targetName}.vue`"
          :title="`${marker.sourceName}.vue → ${marker.targetName}.vue`"
          @mousedown.stop
          @dblclick.stop
          @click.stop="selectPage(marker.edge.targetId)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <button
          v-for="marker in outgoingMarkers"
          :key="`${marker.key}-reason`"
          class="jump-reason-btn"
          :class="{ active: activeJumpLineKey === marker.key }"
          type="button"
          :style="{ left: `${marker.x}px`, top: `${marker.y}px` }"
          :aria-label="`查看跳转到 ${marker.targetName}.vue 的原因`"
          :title="`${marker.sourceName}.vue → ${marker.targetName}.vue`"
          @mousedown.stop
          @dblclick.stop
          @click="toggleJumpReason($event, marker)"
        >
          ?
        </button>

        <aside
          v-if="activeJumpLine"
          class="jump-reason-popover"
          :style="{
            left: `${activeJumpLine.x + 18}px`,
            top: `${activeJumpLine.y + 18}px`
          }"
          @mousedown.stop
          @dblclick.stop
        >
          <div class="jump-reason-title">{{ activeJumpLine.sourceName }}.vue → {{ activeJumpLine.targetName }}.vue</div>
          <div class="jump-reason-content">{{ activeJumpLine.edge.reason }}</div>
          <button class="jump-target-btn" type="button" @click="focusPage(activeJumpLine.edge.targetId)">
            跳转到该页面
          </button>
        </aside>

        <CanvasPageNode
          v-for="[id, page] in pages"
          :id="id"
          :key="id"
          :page="page"
          :dragging-node-id="draggingNodeId"
          :selected-page-id="selectedPageId"
          :active-doc-page-id="activeDocPageId"
          :show-related-lines="showRelatedLines"
          :copied-page-id="copiedPageId"
          @select="selectPage"
          @double-click="onDoubleClickPage"
          @header-mouse-down="onNodeHeaderMouseDown"
          @toggle-lines="toggleRelatedLinesForPage"
          @copy-link="copyPageLink"
          @reset-frame="resetPageFrame"
          @toggle-doc="togglePageDoc"
        />

        <CanvasDocPanel
          v-if="activeDocPage"
          :active-doc-page="activeDocPage"
        />
      </div>
    </div>
  </div>
</template>

<style>
@import './canvas/Canvas.css';
</style>
