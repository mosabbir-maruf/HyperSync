import type { FileMetadata } from "./types"

export const CURRENT_PROTOCOL_VERSION = "1.0.0"

export type ControlMessage = {
  t: "TRANSFER_INIT"
  files: FileMetadata[]
  protocolVersion: string
} | { t: "TRANSFER_ACCEPT"; ids: string[] } | {
  t: "TRANSFER_REJECT"
  ids: string[]
} | { t: "TRANSFER_METADATA"; metadata: FileMetadata } | {
  t: "TRANSFER_PROGRESS"
  id: string
  percentage: number
} | { t: "TRANSFER_COMPLETE"; id: string; checksum?: string } | {
  t: "TRANSFER_VERIFY"
  id: string
} | { t: "TRANSFER_SUCCESS"; id: string } | {
  t: "TRANSFER_FAILED"
  id: string
  reason: string
} | { t: "TRANSFER_CANCEL"; id: string } | { t: "TRANSFER_ABORT"; id: string } | {
  t: "TRANSFER_PAUSE"
  id: string
} | { t: "TRANSFER_RESUME"; id: string }

export function encodeControl(msg: ControlMessage): string {
  return JSON.stringify(msg)
}

export function decodeControl(raw: string): ControlMessage | null {
  try {
    return JSON.parse(raw) as ControlMessage
  } catch {
    return null
  }
}

export const HEADER_SIZE = 36 + 4 + 8 + 4 + 1

export const HIGH_WATER_MARK = 2 * 1024 * 1024
export const LOW_WATER_MARK = 1 * 1024 * 1024

import type { ChunkHeader } from "./types"

const _encoder = new TextEncoder()
const _decoder = new TextDecoder()

export function encodeChunkInto(
  sendBuf: Uint8Array,
  sendDV: DataView,
  header: ChunkHeader,
  data: ArrayBuffer,
): Uint8Array {
  const idBytes = _encoder.encode(header.transferId)
  sendBuf.set(idBytes, 0)
  if (idBytes.length < 36) sendBuf.fill(0, idBytes.length, 36)

  sendDV.setUint32(36, header.chunkIndex, true)
  sendDV.setBigUint64(40, BigInt(header.offset), true)
  sendDV.setUint32(48, header.length, true)
  sendDV.setUint8(52, header.isLastChunk ? 1 : 0)

  sendBuf.set(new Uint8Array(data), HEADER_SIZE)

  return sendBuf.subarray(0, HEADER_SIZE + header.length)
}

/**
 * Legacy encode for callers that need a standalone ArrayBuffer.
 * Kept for compatibility; the hot-path sender uses encodeChunkInto instead.
 */
export function encodeChunk(
  header: ChunkHeader,
  data: ArrayBuffer,
): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + data.byteLength)
  const u8 = new Uint8Array(buf)
  const dv = new DataView(buf)
  encodeChunkInto(u8, dv, header, data)
  return buf
}

export function decodeChunk(
  buffer: ArrayBuffer,
): { header: ChunkHeader; data: Uint8Array } {
  const view = new DataView(buffer)

  const idBytes = new Uint8Array(buffer, 0, 36)
  const transferId = _decoder.decode(idBytes).replace(/\0/g, "")

  const chunkIndex = view.getUint32(36, true)
  const offset = Number(view.getBigUint64(40, true))
  const length = view.getUint32(48, true)
  const isLastChunk = view.getUint8(52) === 1

  const data = new Uint8Array(buffer, HEADER_SIZE, length)

  return {
    header: { transferId, chunkIndex, offset, length, isLastChunk },
    data,
  }
}
