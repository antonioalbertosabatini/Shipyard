import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { zipUtf8Files } from './zip'

describe('zipUtf8Files', () => {
  it('round-trips nested paths and unicode content', async () => {
    const blob = zipUtf8Files([
      { path: 'vault/Shipyard.md', content: '# Hi' },
      { path: 'vault/Projects/My-App/My-App.md', content: 'café' },
    ])
    expect(blob.type).toBe('application/zip')
    const unzipped = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    expect(strFromU8(unzipped['vault/Shipyard.md'] ?? new Uint8Array())).toBe('# Hi')
    expect(strFromU8(unzipped['vault/Projects/My-App/My-App.md'] ?? new Uint8Array())).toBe('café')
  })
})
