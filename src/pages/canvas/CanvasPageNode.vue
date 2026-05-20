<script setup lang="ts">
import type { PageNode } from './types'

defineProps<{
  id: string
  page: PageNode
  draggingNodeId: string | null
  selectedPageId: string | null
  activeDocPageId: string | null
  showRelatedLines: boolean
  copiedPageId: string | null
}>()

defineEmits<{
  select: [pageId: string]
  doubleClick: [page: PageNode]
  headerMouseDown: [event: MouseEvent, pageId: string]
  toggleLines: [pageId: string]
  copyLink: [event: MouseEvent, page: PageNode]
  toggleDoc: [event: MouseEvent, pageId: string]
}>()
</script>

<template>
  <div
    class="page-wrapper"
    :class="{ 'is-dragging': draggingNodeId === id, 'is-selected': selectedPageId === id }"
    :style="{ left: `${page.x}px`, top: `${page.y}px`, width: `${page.width}px`, height: `${page.height}px` }"
    @mousedown="$emit('select', id)"
    @dblclick="$emit('doubleClick', page)"
  >
    <div class="page-header" @mousedown="$emit('headerMouseDown', $event, id)">
      <button
        class="page-line-btn"
        type="button"
        :class="{ active: showRelatedLines && selectedPageId === id }"
        :aria-label="`${showRelatedLines && selectedPageId === id ? '隐藏' : '显示'} ${page.name}.vue 的关联连线`"
        :title="showRelatedLines && selectedPageId === id ? '隐藏连线' : '显示连线'"
        @mousedown.stop
        @dblclick.stop
        @click.stop="$emit('toggleLines', id)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 7h4a4 4 0 014 4v2a4 4 0 004 4h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="5" cy="7" r="2.5" stroke="currentColor" stroke-width="2"/>
          <circle cx="20" cy="17" r="2.5" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button
        class="page-copy-link-btn"
        type="button"
        :class="{ copied: copiedPageId === id }"
        :aria-label="`复制 ${page.name}.vue 当前页面链接`"
        :title="copiedPageId === id ? '已复制链接' : '复制链接'"
        @mousedown.stop
        @dblclick.stop
        @click="$emit('copyLink', $event, page)"
      >
        <svg v-if="copiedPageId !== id" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="page-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="drag-icon">
          <circle cx="8" cy="4" r="2" fill="currentColor"/>
          <circle cx="16" cy="4" r="2" fill="currentColor"/>
          <circle cx="8" cy="12" r="2" fill="currentColor"/>
          <circle cx="16" cy="12" r="2" fill="currentColor"/>
          <circle cx="8" cy="20" r="2" fill="currentColor"/>
          <circle cx="16" cy="20" r="2" fill="currentColor"/>
        </svg>
        <span>{{ page.name }}.vue</span>
      </div>
      <button
        class="page-doc-btn"
        type="button"
        :aria-expanded="activeDocPageId === id"
        :aria-label="`查看 ${page.name}.vue 的页面说明`"
        title="查看页面说明"
        @mousedown.stop
        @dblclick.stop
        @click="$emit('toggleDoc', $event, id)"
      >
        ?
      </button>
    </div>
    <iframe
      :id="`iframe-${id}`"
      :src="page.url"
      class="page-iframe"
      sandbox="allow-scripts allow-same-origin"
    ></iframe>
  </div>
</template>
