import { HIGH_WATER_MARK } from "./protocol"

export class FlowController {
  private paused = false
  private resumeWaiters: Array<() => void> = []

  constructor(private readonly channel: RTCDataChannel) {}

  public async awaitDrain(signal?: AbortSignal): Promise<void> {
    if (this.channel.bufferedAmount <= HIGH_WATER_MARK) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const onResume = () => {
        cleanup()
        resolve()
      }

      const onAbort = () => {
        cleanup()
        reject(new Error("Transfer aborted during drain"))
      }

      const cleanup = () => {
        this.channel.removeEventListener("bufferedamountlow", onResume)
        signal?.removeEventListener("abort", onAbort)
      }

      this.channel.addEventListener("bufferedamountlow", onResume)
      signal?.addEventListener("abort", onAbort)
      
      if (signal?.aborted) onAbort()
    })
  }

  public async awaitUserResume(signal?: AbortSignal): Promise<void> {
    if (!this.paused) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        this.resumeWaiters = this.resumeWaiters.filter(w => w !== resolve)
        reject(new Error("Transfer aborted while paused"))
      }

      this.resumeWaiters.push(resolve)
      signal?.addEventListener("abort", onAbort)
      if (signal?.aborted) onAbort()
    })
  }

  public pause(): void {
    this.paused = true
  }

  public resume(): void {
    this.paused = false
    const waiters = this.resumeWaiters
    this.resumeWaiters = []
    for (const w of waiters) w()
  }

  public get isPaused(): boolean {
    return this.paused
  }
}
