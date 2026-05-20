<script setup lang="ts">
import type { PageApi, PageNode } from './types'

defineProps<{
  activeDocPage: PageNode
  activeApiDescriptionKey: string | null
}>()

defineEmits<{
  toggleApiDescription: [event: MouseEvent, pageId: string, api: PageApi]
  focusPage: [pageId: string]
}>()

const getApiKey = (pageId: string, api: PageApi) => `${pageId}:${api.id}`
</script>

<template>
  <aside
    class="page-doc-stack"
    :style="{
      left: `${activeDocPage.x + activeDocPage.width + 16}px`,
      top: `${activeDocPage.y}px`
    }"
    @mousedown.stop
    @dblclick.stop
  >
    <section class="page-doc-popover">
      <div class="page-doc-title">页面说明</div>
      <div class="page-doc-content" v-html="activeDocPage.docHtml"></div>
    </section>
    <section class="page-apis-panel" aria-label="接口列表">
      <div class="page-apis-title">接口说明</div>
      <div v-if="activeDocPage.apis.length" class="page-api-list">
        <div v-for="api in activeDocPage.apis" :key="api.id" class="page-api-item">
          <a
            v-if="api.url"
            class="page-api-link"
            :href="api.url"
            target="_blank"
            rel="noreferrer"
          >
            {{ api.name }}
          </a>
          <div v-else class="page-api-inline">
            <span class="page-api-name">{{ api.name }}</span>
            <button
              class="page-api-help"
              type="button"
              :aria-expanded="activeApiDescriptionKey === getApiKey(activeDocPage.id, api)"
              :aria-label="`查看 ${api.name} 的接口说明`"
              title="查看接口说明"
              @click="$emit('toggleApiDescription', $event, activeDocPage.id, api)"
            >
              ?
            </button>
          </div>
          <div
            v-if="!api.url && activeApiDescriptionKey === getApiKey(activeDocPage.id, api)"
            class="page-api-description page-doc-content"
            v-html="api.descriptionHtml"
          ></div>
        </div>
      </div>
      <div v-else class="page-apis-empty">暂无接口</div>
    </section>
  </aside>
</template>
