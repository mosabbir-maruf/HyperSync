import {
  detectCameraPermission,
  detectCapabilities,
  getCapabilities,
  isSupported,
  type Capabilities,
} from "../lib/capabilities"

export interface CapabilityService {
  get(): Capabilities
  refresh(): Capabilities
  getCameraPermission(): Promise<Capabilities["cameraPermission"]>
  supportsTransfers(): boolean
}

/** The only capability entry point exposed to application and presentation layers. */
export class DefaultCapabilityService implements CapabilityService {
  get(): Capabilities {
    return getCapabilities()
  }

  refresh(): Capabilities {
    return detectCapabilities()
  }

  getCameraPermission(): Promise<Capabilities["cameraPermission"]> {
    return detectCameraPermission()
  }

  supportsTransfers(): boolean {
    return isSupported(this.get())
  }
}

export const capabilityService: CapabilityService =
  new DefaultCapabilityService()
