import type { FileMetadata } from "./types"

export const CURRENT_PROTOCOL_VERSION = "1.0.0"

export type ControlMessage =
  | { t: "TRANSFER_INIT"; files: FileMetadata[]; protocolVersion: string }
  | { t: "TRANSFER_ACCEPT"; ids: string[] }
  | { t: "TRANSFER_REJECT"; ids: string[] }
  | { t: "TRANSFER_METADATA"; metadata: FileMetadata }
  | { t: "TRANSFER_PROGRESS"; id: string; percentage: number }
  | { t: "TRANSFER_COMPLETE"; id: string; checksum?: string }
  | { t: "TRANSFER_VERIFY"; id: string }
  | { t: "TRANSFER_SUCCESS"; id: string }
  | { t: "TRANSFER_FAILED"; id: string; reason: string }
  | { t: "TRANSFER_CANCEL"; id: string }
  | { t: "TRANSFER_ABORT"; id: string }
  | { t: "BUFFER_PAUSE"; id: string } // Kept for flow control over DataChannel
  | { t: "BUFFER_RESUME"; id: string } // Kept for flow control over DataChannel

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

// -----------------------------------------------------------------------------
// Binary chunk protocol:
// -----------------------------------------------------------------------------
// Format:
// [ 36 bytes ] Transfer ID (UUID string, 36 bytes ascii)
// [ 4 bytes  ] Chunk Index (Uint32, little-endian)
// [ 8 bytes  ] Offset (BigUint64, little-endian)
// [ 4 bytes  ] Length (Uint32, little-endian)
// [ 1 byte   ] Flags: bit 0 is isLastChunk
// [ ...      ] Chunk payload bytes

export const HEADER_SIZE = 36 + 4 + 8 + 4 + 1
// A larger send window keeps a high-bandwidth, low-latency LAN link busy.
// The low-water mark is half the high-water mark to prevent rapid stop/start
// cycles while the browser drains a small buffer.
export const HIGH_WATER_MARK = 8 * 1024 * 1024
export const LOW_WATER_MARK = 4 * 1024 * 1024

const encoder = new TextEncoder()
const decoder = new TextDecoder()

import type { ChunkHeader } from "./types"

export function encodeChunk(header: ChunkHeader, data: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + data.byteLength)
  const view = new DataView(buf)

  const idBytes = encoder.encode(header.transferId)
  for (let i = 0; i < 36; i++) {
    view.setUint8(i, i < idBytes.length ? idBytes[i] : 0)
  }

  view.setUint32(36, header.chunkIndex, true)
  view.setBigUint64(40, BigInt(header.offset), true)
  view.setUint32(48, header.length, true)
  view.setUint8(52, header.isLastChunk ? 1 : 0)

  new Uint8Array(buf, HEADER_SIZE).set(new Uint8Array(data))
  return buf
}

export function decodeChunk(buffer: ArrayBuffer): { header: ChunkHeader; data: ArrayBuffer } {
  const view = new DataView(buffer)

  const idBytes = new Uint8Array(buffer, 0, 36)
  const transferId = decoder.decode(idBytes).replace(/\0/g, "")

  const chunkIndex = view.getUint32(36, true)
  const offset = Number(view.getBigUint64(40, true))
  const length = view.getUint32(48, true)
  const isLastChunk = view.getUint8(52) === 1

  const data = buffer.slice(HEADER_SIZE)

  return {
    header: {
      transferId,
      chunkIndex,
      offset,
      length,
      isLastChunk
    },
    data
  }
}
