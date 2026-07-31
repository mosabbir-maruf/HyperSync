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
// [ 1 byte   ] Flags: bit 0 = isLastChunk
// [ ...      ] Chunk payload bytes

export const HEADER_SIZE = 36 + 4 + 8 + 4 + 1 // 53 bytes

// DataChannel flow control watermarks.
// HIGH: stop sending when bufferedAmount exceeds this.
// LOW:  resume when bufferedAmount drops below bufferedAmountLowThreshold (set to LOW_WATER_MARK).
// 8 MB window keeps a fast 5GHz LAN link continuously saturated.
// Sender re-fills from LOW to HIGH on every bufferedamountlow event — no idle gaps.
export const HIGH_WATER_MARK = 8 * 1024 * 1024   // 8 MB — stop threshold
export const LOW_WATER_MARK  = 4 * 1024 * 1024   // 4 MB — resume threshold

import type { ChunkHeader } from "./types"

// Module-level singletons — avoid per-call allocation
const _encoder = new TextEncoder()
const _decoder = new TextDecoder()

// ---------------------------------------------------------------------------
// Sender-side encoding
// ---------------------------------------------------------------------------

/**
 * Write the chunk header + payload into a pre-allocated Uint8Array view.
 * Returns a Uint8Array subarray of `sendBuf` sized to HEADER_SIZE + data.byteLength.
 *
 * IMPORTANT: channel.send() copies synchronously from the view into SCTP's
 * internal buffer before returning. The caller may reuse `sendBuf` for the
 * next chunk immediately after channel.send() returns — no extra copy needed.
 */
export function encodeChunkInto(
  sendBuf: Uint8Array,
  sendDV: DataView,
  header: ChunkHeader,
  data: ArrayBuffer
): Uint8Array {
  // Write Transfer ID (36 bytes, zero-padded)
  const idBytes = _encoder.encode(header.transferId)
  sendBuf.set(idBytes, 0)
  if (idBytes.length < 36) sendBuf.fill(0, idBytes.length, 36)

  // Write fixed-width header fields
  sendDV.setUint32(36, header.chunkIndex, true)
  sendDV.setBigUint64(40, BigInt(header.offset), true)
  sendDV.setUint32(48, header.length, true)
  sendDV.setUint8(52, header.isLastChunk ? 1 : 0)

  // Copy payload — one unavoidable copy (SCTP needs contiguous header+data)
  sendBuf.set(new Uint8Array(data), HEADER_SIZE)

  // Return a SUBARRAY VIEW — no new ArrayBuffer allocation.
  // channel.send(Uint8Array) accepts typed arrays and copies them synchronously.
  return sendBuf.subarray(0, HEADER_SIZE + header.length)
}

/**
 * Legacy encode for callers that need a standalone ArrayBuffer.
 * Kept for compatibility; the hot-path sender uses encodeChunkInto instead.
 */
export function encodeChunk(header: ChunkHeader, data: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + data.byteLength)
  const u8 = new Uint8Array(buf)
  const dv = new DataView(buf)
  encodeChunkInto(u8, dv, header, data)
  return buf
}

// ---------------------------------------------------------------------------
// Receiver-side decoding
// ---------------------------------------------------------------------------

/**
 * Decode a received chunk without copying the payload.
 * Returns a Uint8Array view into the original buffer (zero-copy).
 *
 * The view is valid as long as the caller keeps a reference to it.
 * BrowserDownloadProvider and FileSystemAccessProvider both accept Uint8Array.
 */
export function decodeChunk(buffer: ArrayBuffer): { header: ChunkHeader; data: Uint8Array } {
  const view = new DataView(buffer)

  // Decode the 36-byte ASCII transfer ID (zero-copy view)
  const idBytes = new Uint8Array(buffer, 0, 36)
  const transferId = _decoder.decode(idBytes).replace(/\0/g, "")

  const chunkIndex = view.getUint32(36, true)
  const offset     = Number(view.getBigUint64(40, true))
  const length     = view.getUint32(48, true)
  const isLastChunk = view.getUint8(52) === 1

  // Zero-copy: return a typed view of the payload region, not a slice() copy
  const data = new Uint8Array(buffer, HEADER_SIZE, length)

  return {
    header: { transferId, chunkIndex, offset, length, isLastChunk },
    data
  }
}
