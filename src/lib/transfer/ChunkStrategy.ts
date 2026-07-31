import { HEADER_SIZE } from "./protocol"

// Chrome/Firefox SCTP max message size = 262144 bytes (256 * 1024)
// Total wire size = HEADER_SIZE (53 bytes) + DATA
// So max safe data payload = 262144 - 53 = 262091 bytes
const SCTP_MAX = 256 * 1024 // 256KB — browser SCTP hard limit
const MAX_DATA_SIZE = SCTP_MAX - HEADER_SIZE // 262091 bytes — safe data payload

export const DEFAULT_CHUNK_SIZE = MAX_DATA_SIZE

export class ChunkStrategy {
  /**
   * Adaptive chunk size. Total wire packet (header + data) must stay within
   * the SCTP 256KB limit enforced by Chrome, Firefox, and Safari WebRTC.
   * 512KB chunks caused channel.send() to throw "Message too large" on large files.
   */
  static getOptimalChunkSize(_fileSize: number): number {
    // Use the maximum safe size for all file sizes.
    // With backpressure flow control, this is always safe regardless of file size.
    return MAX_DATA_SIZE
  }
}
