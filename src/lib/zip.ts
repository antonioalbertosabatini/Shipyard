import { strToU8, zipSync } from 'fflate'

/** Packs UTF-8 text files into a zip archive (in-memory). */
export function zipUtf8Files(files: { path: string; content: string }[]): Blob {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    entries[file.path] = strToU8(file.content)
  }
  const bytes = zipSync(entries)
  // BlobPart rejects Uint8Array<ArrayBufferLike> under TypeScript 6.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return new Blob([buffer], { type: 'application/zip' })
}
