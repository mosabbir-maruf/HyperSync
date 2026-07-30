export interface SaveProvider {
  /** Accumulate or write a chunk to the destination */
  write(chunk: ArrayBuffer, offset: number): Promise<void> | void;
  
  /** 
   * Complete the save operation.
   * Returns a temporary downloadUrl (must be revoked by caller when done)
   * and optionally the constructed Blob for integrity verification if not saved directly to disk.
   */
  close(): Promise<{ downloadUrl?: string; blob?: Blob }>;
  
  /** Abort the save operation and clean up any resources */
  abort(): Promise<void> | void;
}
