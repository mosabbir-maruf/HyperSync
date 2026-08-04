/** Exponentially-smoothed throughput + ETA estimator. Cheap, no allocations in steady state. */
export class RateMeter {
  private lastTime = 0
  private lastBytes = 0
  private speed = 0 // bytes/sec, smoothed

  constructor(private readonly total: number) {}

  start(): void {
    this.lastTime = performance.now()
    this.lastBytes = 0
    this.speed = 0
  }

  /** Feed the cumulative byte count; returns smoothed speed + ETA. */
  sample(bytesTransferred: number): { speed: number; eta: number | null } {
    const now = performance.now()
    const dt = (now - this.lastTime) / 1000
    if (dt > 0.05) {
      const instant = (bytesTransferred - this.lastBytes) / dt
      // EMA with alpha 0.3 for a stable but responsive readout.
      this.speed = this.speed === 0 ? instant : this.speed * 0.7 + instant * 0.3
      this.lastTime = now
      this.lastBytes = bytesTransferred
    }
    const remaining = this.total - bytesTransferred
    const eta = this.speed > 1 ? remaining / this.speed : null
    return { speed: Math.max(0, this.speed), eta }
  }
}
