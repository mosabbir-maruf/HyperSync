export type ConnectionQuality = "unknown" | "poor" | "fair" | "good"
export type TransferDirection = "send" | "receive"

export interface FileMetadata {
  transferId: string
  fileName: string
  fileSize: number
  mimeType: string
  lastModified?: number
  chunkCount: number
  checksumMethod?: string
  protocolVersion?: string
}

export interface ChunkHeader {
  transferId: string;
  chunkIndex: number;
  offset: number;
  length: number;
  isLastChunk: boolean;
}

export interface TransferProgress {
  transferId: string
  bytesSent: number
  bytesReceived: number
  chunksSent: number
  chunksReceived: number
  totalBytes: number
  totalChunks: number
  percentage: number
  speedBytesPerSecond: number
  estimatedTimeRemainingSeconds: number
}

// Exactly mirroring the required Phase 4 Part 3 events:
export type TransferEvent =
  | { type: "TransferQueued"; metadata: FileMetadata }
  | { type: "TransferStarted"; metadata: FileMetadata }
  | { type: "MetadataReceived"; metadata: FileMetadata }
  | { type: "ChunkSent"; transferId: string; progress: TransferProgress }
  | { type: "ChunkReceived"; transferId: string; progress: TransferProgress }
  | { type: "VerificationStarted"; transferId: string }
  | { type: "VerificationFinished"; transferId: string; isValid: boolean; checksum?: string }
  | { type: "DownloadStarted"; transferId: string }
  | { type: "DownloadCompleted"; transferId: string; downloadUrl?: string }
  | { type: "TransferCancelled"; transferId: string }
  | { type: "TransferFailed"; transferId: string; error: string }
  | { type: "TransferCompleted"; transferId: string }
  | { type: "LocalProgress"; progress: TransferProgress }
  | { type: "RemoteProgress"; progress: TransferProgress }
  | { type: "TransferSpeed"; transferId: string; speedBytesPerSecond: number }
  | { type: "ETA"; transferId: string; estimatedTimeRemainingSeconds: number }
  | { type: "BufferPause"; transferId: string }
  | { type: "BufferResume"; transferId: string }

export type TransferEventHandler = (event: TransferEvent) => void;

// UI mapped type
export interface TransferItem {
  id: string
  name: string
  size: number
  mime: string
  direction: TransferDirection
  status: "pending" | "progress" | "paused" | "completed" | "failed" | "cancelled"
  bytesTransferred: number
  speed: number
  averageSpeed: number
  eta: number | null
  elapsed: number
  remainingBytes: number
  verification: "pending" | "verifying" | "success" | "failed"
  connectionQuality: ConnectionQuality
  reconnectAttempts: number
  startedAt?: number
  completedAt?: number
  error?: string
  blobUrl?: string
  checksumMethod?: string
}
