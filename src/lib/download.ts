/**
 * Saves a file on the user's device.
 * Single integration point to replace with native file APIs in Electron/Capacitor.
 */
export function downloadFile(
  filename: string,
  content: string | Blob,
  mimeType = 'application/json',
) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
