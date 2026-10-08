/**
 * Shrinks a phone photo before it leaves the browser. A 12MP shot of a
 * discharge sheet is 4MB or more, while 1800px on the long edge is plenty to
 * read handwriting and keeps the upload quick on mobile data.
 */
export async function downscaleImage(file: File, maxEdge = 1800, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('That needs to be a photo.')

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob ?? file
}
