<script setup lang="ts">
import type { DEVICES } from '@/constants/constants-devices'
import type { DeviceName } from '@/utils/utils-device'

defineProps<{
  activeDevice: DeviceName
  currentDevice: (typeof DEVICES)[DeviceName]
  isDeviceDisabled: (device: DeviceName) => boolean
}>()

defineEmits<{
  switchDevice: [device: DeviceName]
  exportLayout: []
  triggerImport: []
  startPrototype: []
}>()
</script>

<template>
  <div class="toolbar">
    <div class="device-switcher" aria-label="切换设备类型">
      <button
        class="device-btn"
        :class="{ active: activeDevice === 'mobile' }"
        type="button"
        title="Mobile (375×812)"
        :disabled="isDeviceDisabled('mobile')"
        @click="$emit('switchDevice', 'mobile')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="device-label">Mobile</span>
      </button>

      <button
        class="device-btn"
        :class="{ active: activeDevice === 'tablet' }"
        type="button"
        title="Tablet (768×1024)"
        :disabled="isDeviceDisabled('tablet')"
        @click="$emit('switchDevice', 'tablet')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="device-label">Tablet</span>
      </button>

      <button
        class="device-btn"
        :class="{ active: activeDevice === 'desktop' }"
        type="button"
        title="Desktop (1440×900)"
        :disabled="isDeviceDisabled('desktop')"
        @click="$emit('switchDevice', 'desktop')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="device-label">Desktop</span>
      </button>
    </div>
    <div class="device-dimensions">
      {{ currentDevice.width }} × {{ currentDevice.height }}
    </div>
    <button class="toolbar-btn secondary" @click="$emit('exportLayout')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      导出布局
    </button>
    <button class="toolbar-btn secondary" @click="$emit('triggerImport')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      导入布局
    </button>
    <button class="toolbar-btn primary" @click="$emit('startPrototype')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M5 3L19 12L5 21V3Z" fill="currentColor" />
      </svg>
      运行原型
    </button>
  </div>
</template>
