<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { DEVICES } from '@/constants/constants-devices'
import { getDesignBaseMode, getSavedDevice, saveDevice, type DeviceName } from '@/utils/utils-device'

const router = useRouter()

interface DeviceProfile {
  label: string
  icon: string
  width: number
  height: number
}

const devices: Record<string, DeviceProfile> = {
  mobile: {
    label: 'Mobile',
    icon: 'mobile',
    width: DEVICES.mobile.width,
    height: DEVICES.mobile.height,
  },
  tablet: {
    label: 'Tablet',
    icon: 'tablet',
    width: DEVICES.tablet.width,
    height: DEVICES.tablet.height,
  },
  desktop: {
    label: 'Desktop',
    icon: 'desktop',
    width: DEVICES.desktop.width,
    height: DEVICES.desktop.height,
  },
}

const designBaseMode = getDesignBaseMode(import.meta.env.VITE_DESIGN_BASE)
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

const currentDevice = computed(() => devices[activeDevice.value])

const isDeviceDisabled = (device: DeviceName) => {
  return !canSwitchDevices.value && device !== activeDevice.value
}

const switchDevice = (device: DeviceName) => {
  if (isDeviceDisabled(device)) return
  activeDevice.value = device
  if (canSwitchDevices.value) {
    saveDevice(device)
  }
}

const iframeSrc = new URL('/pages/index', import.meta.env.VITE_PROTOTYPE_ORIGIN).href

const goBack = () => {
  router.push('/')
}

// --- Auto-scale to fit preview area ---
const previewAreaRef = ref<HTMLElement | null>(null)
const areaWidth = ref(0)
const areaHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (previewAreaRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        areaWidth.value = entry.contentRect.width
        areaHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(previewAreaRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const padding = {
  mobile: 12,
  tablet: 10,
  desktop: 0,
}

const frameScale = computed(() => {
  if (!areaWidth.value || !areaHeight.value) return 1
  const pad = (padding as any)[activeDevice.value] || 0
  const totalW = currentDevice.value.width + pad * 2
  const totalH = currentDevice.value.height + pad * 2
  const margin = 64 // breathing room around the frame
  const scaleX = (areaWidth.value - margin) / totalW
  const scaleY = (areaHeight.value - margin) / totalH
  return Math.min(1, scaleX, scaleY)
})

const scalePercent = computed(() => Math.round(frameScale.value * 100))
</script>

<template>
  <div class="prototype-wrapper system-design-token">
    <!-- Toolbar -->
    <div class="prototype-toolbar">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回画布
      </button>

      <div class="device-switcher">
        <!-- Mobile -->
        <button
          class="device-btn"
          :class="{ active: activeDevice === 'mobile' }"
          :disabled="isDeviceDisabled('mobile')"
          @click="switchDevice('mobile')"
          title="Mobile (375×812)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="device-label">Mobile</span>
        </button>

        <!-- Tablet -->
        <button
          class="device-btn"
          :class="{ active: activeDevice === 'tablet' }"
          :disabled="isDeviceDisabled('tablet')"
          @click="switchDevice('tablet')"
          title="Tablet (768×1024)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="device-label">Tablet</span>
        </button>

        <!-- Desktop -->
        <button
          class="device-btn"
          :class="{ active: activeDevice === 'desktop' }"
          :disabled="isDeviceDisabled('desktop')"
          @click="switchDevice('desktop')"
          title="Desktop (1440×900)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="device-label">Desktop</span>
        </button>
      </div>

      <div class="device-dimensions">
        {{ currentDevice.width }} × {{ currentDevice.height }}
        <span v-if="scalePercent < 100" class="scale-badge">{{ scalePercent }}%</span>
      </div>
    </div>

    <!-- Preview Area -->
    <div class="preview-area" ref="previewAreaRef">
      <div
        class="device-frame-container"
        :style="{ transform: `scale(${frameScale})` }"
      >
        <!-- Device bezel -->
        <div
          class="device-frame"
          :class="`device-${activeDevice}`"
          :style="{
            width: `${currentDevice.width}px`,
            height: `${currentDevice.height}px`,
          }"
        >
          <iframe
            :src="iframeSrc"
            class="prototype-iframe"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prototype-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  overflow: hidden;
}

/* Toolbar */
.prototype-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #16213e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

/* Device Switcher */
.device-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.device-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: #94a3b8;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}

.device-btn:hover {
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.05);
}

.device-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.device-btn:disabled:hover {
  color: #94a3b8;
  background: transparent;
}

.device-btn.active {
  color: white;
  background: var(--color-primary, #6366f1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.device-label {
  white-space: nowrap;
}

.device-dimensions {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  min-width: 120px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.scale-badge {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Preview Area */
.preview-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}

.device-frame-container {
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.device-frame {
  background: white;
  overflow: hidden;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 25px 50px -12px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(99, 102, 241, 0.08);
  flex-shrink: 0;
}

.device-frame.device-mobile {
  border-radius: 40px;
  padding: 12px;
}

.device-frame.device-tablet {
  border-radius: 24px;
  padding: 10px;
}

.device-frame.device-desktop {
  border-radius: 12px;
  padding: 0;
}

.prototype-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.device-frame.device-mobile .prototype-iframe {
  border-radius: 28px;
}

.device-frame.device-tablet .prototype-iframe {
  border-radius: 14px;
}

.device-frame.device-desktop .prototype-iframe {
  border-radius: 0;
}
</style>
