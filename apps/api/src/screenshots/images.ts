const PNG = [0x89, 0x50, 0x4e, 0x47]

const readUint24 = (bytes: Uint8Array, at: number) =>
  bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16)

export function imageSize(
  bytes: Uint8Array,
): { width: number; height: number; type: string; extension: string } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (PNG.every((byte, index) => bytes[index] === byte))
    return { width: view.getUint32(16), height: view.getUint32(20), type: "image/png", extension: "png" }
  const riff = new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF"
  const chunk = new TextDecoder().decode(bytes.subarray(12, 16))
  if (!riff) return null
  if (chunk === "VP8X")
    return {
      width: readUint24(bytes, 24) + 1,
      height: readUint24(bytes, 27) + 1,
      type: "image/webp",
      extension: "webp",
    }
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      type: "image/webp",
      extension: "webp",
    }
  }
  if (chunk === "VP8 ")
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
      type: "image/webp",
      extension: "webp",
    }
  return null
}
