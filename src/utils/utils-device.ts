import { DEVICES } from '@/constants/constants-devices'

export type DeviceName = keyof typeof DEVICES
export type DesignBaseMode = DeviceName | 'all'

const SELECTED_DEVICE_STORAGE_KEY = 'selected-design-device'

const DESIGN_BASE_DEVICE_ALIASES = {
  all: 'all',
  mobile: 'mobile',
  tablet: 'tablet',
  desktop: 'desktop',
} as const satisfies Record<string, DesignBaseMode>

export const getDesignBaseMode = (designBase?: string): DesignBaseMode => {
  const normalized = designBase?.trim().toLowerCase()

  return normalized
    ? DESIGN_BASE_DEVICE_ALIASES[normalized as keyof typeof DESIGN_BASE_DEVICE_ALIASES] || 'mobile'
    : 'mobile'
}

export const getDesignBaseDevice = (designBase?: string) => {
  const deviceName = getDesignBaseDeviceName(designBase)

  return DEVICES[deviceName]
}

export const getDesignBaseDeviceName = (designBase?: string): DeviceName => {
  const designBaseMode = getDesignBaseMode(designBase)

  return designBaseMode === 'all' ? 'mobile' : designBaseMode
}

export const getSavedDevice = (): DeviceName | null => {
  const savedDevice = localStorage.getItem(SELECTED_DEVICE_STORAGE_KEY)

  return savedDevice as DeviceName || null
}

export const saveDevice = (device: DeviceName): void => {
  localStorage.setItem(SELECTED_DEVICE_STORAGE_KEY, device)
}
