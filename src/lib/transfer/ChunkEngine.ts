import { encodeChunkInto, HEADER_SIZE } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { SendPipeline } from "./SendPipeline"
import { PipelineProfiler } from "./PipelineProfiler"

export class ChunkEngine {
  public readonly chunkSize: number

  constructor(
    private readonly file: Blob,
    private readonly transferId: string,
  ) {
    this.chunkSize = ChunkStrategy.getOptimalChunkSize(file.size)
  }

  public get chunkCount(): number {
    return Math.ceil(this.file.size / this.chunkSize)
  }

  private static pendingEngines = new Map<
    string,
    {
      engine: ChunkEngine
      pipelines: SendPipeline[]
      signals: AbortSignal[]
      timer: ReturnType<typeof setTimeout> | null
    }
  >()

  static attachAndPump(
    file: Blob,
    transferId: string,
    pipeline: SendPipeline,
    signal: AbortSignal,
  ): Promise<void> {
    let group = this.pendingEngines.get(transferId)

    if (!group) {
      group = {
        engine: new ChunkEngine(file, transferId),
        pipelines: [],
        signals: [],
        timer: null,
      }
      this.pendingEngines.set(transferId, group)
    }

    group.pipelines.push(pipeline)
    group.signals.push(signal)

    return new Promise((resolve, reject) => {
      if (!group!.timer) {
        group!.timer = setTimeout(() => {
          this.pendingEngines.delete(transferId)
          group!.engine
            .pump(group!.pipelines, group!.signals)
            .then(resolve)
            .catch(reject)
        }, 100)
      } else {
        resolve()
      }
    })
  }

  async pump(pipelines: SendPipeline[], signals: AbortSignal[]): Promise<void> {
    const totalChunks = this.chunkCount
    if (totalChunks === 0) {
      for (const p of pipelines) p.markEof()
      return
    }

    const LOOKAHEAD = Math.min(4, totalChunks)

    type Slot = {
      promise: Promise<ArrayBuffer>
      offset: number
      index: number
      length: number
    }

    const readQueue: Slot[] = []
    let readOffset = 0
    let readIndex = 0

    const enqueue = () => {
      if (readIndex >= totalChunks) return
      const len = Math.min(this.chunkSize, this.file.size - readOffset)
      const off = readOffset
      readQueue.push({
        promise: this.file.slice(off, off + len).arrayBuffer(),
        offset: off,
        index: readIndex,
        length: len,
      })
      readOffset += len
      readIndex++
    }

    for (let i = 0; i < LOOKAHEAD; i++) enqueue()

    while (readQueue.length > 0) {
      if (signals.every(s => s.aborted)) throw new Error("Transfer aborted")

      const slot = readQueue.shift()!
      enqueue()

      const t0 = performance.now()
      const data = await slot.promise
      const t1 = performance.now()
      PipelineProfiler.get().record("read", t1 - t0, slot.length)
      if (signals.every(s => s.aborted)) throw new Error("Transfer aborted")

      const isLast = slot.index === totalChunks - 1

      await Promise.all(
        pipelines.map(async (pipeline, idx) => {
          if (signals[idx].aborted) return

          const pb = await pipeline.acquireBuffer()
          if (signals[idx].aborted) return

          const t2 = performance.now()
          const wire = encodeChunkInto(
            pb.view,
            new DataView(
              pb.view.buffer,
              pb.view.byteOffset,
              pb.view.byteLength,
            ),
            {
              transferId: this.transferId,
              chunkIndex: slot.index,
              offset: slot.offset,
              length: slot.length,
              isLastChunk: isLast,
            },
            data,
          )
          const t3 = performance.now()
          PipelineProfiler.get().record("encode", t3 - t2, slot.length)

          pipeline.push(pb, wire.length, slot.length, isLast)
        }),
      )
    }

    for (const p of pipelines) p.markEof()
  }
}
