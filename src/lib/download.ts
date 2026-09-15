/**
 * Saves a file on the user's device.
 * Single integration point to replace with native file APIs in Electron/Capacitor.
 */
export function downloadFile(filename: string, content: string, mimeType = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
