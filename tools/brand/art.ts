export const palette = {
  coral: "#ff5f45",
  cream: "#fff7f2",
  peach: "#ffbf9f",
  light: {
    ink: "#12161b",
    soft: "#3c4550",
    canvas: "#f7f8f9",
    raised: "#ffffff",
    bird: "#e8611c",
    beak: "#f0a315",
  },
  dark: {
    ink: "#e9ecef",
    soft: "#b9c0c7",
    canvas: "#101316",
    raised: "#171b1f",
    bird: "#ff8b52",
    beak: "#ffbe3d",
  },
}

export type Scheme = "light" | "dark"

const BEAK = "M41.6 22.6 54.5 26.4 45 33.4 30 32Z"
const HEAD = { cx: 30, cy: 32, r: 15 }
const TAIL = "M23.2 45.3 12.6 50.5 16.8 39.3 30 32Z"
export const BIRD_BOX = { x: 12.6, y: 17, width: 41.9, height: 33.5 }

type Eye = { cx: number; cy: number; r: number }
const EYE: Eye = { cx: 36.2, cy: 27, r: 2.9 }

export function bird(id: string, body: string, beak: string, transform = "", eye = EYE) {
  const at = transform && ` transform="${transform}"`
  return `<mask id="${id}"><rect x="0" y="0" width="64" height="64" fill="#fff"/><circle cx="${eye.cx}" cy="${eye.cy}" r="${eye.r}" fill="#000"/></mask><g${at} mask="url(#${id})"><path d="${BEAK}" fill="${beak}"/><circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="${body}"/><path d="${TAIL}" fill="${body}"/></g>`
}

const tile = (radius = 15) => `<rect width="64" height="64" rx="${radius}" fill="${palette.coral}"/>`

export const icon = {
  large: (id = "eye", radius = 15) =>
    tile(radius) + bird(id, palette.cream, palette.peach, "matrix(.86 0 0 .86 3.19 3.19)"),
  small: (id = "eye") =>
    tile() +
    bird(id, palette.cream, palette.cream, "matrix(.95 0 0 .95 .18 .18)", { cx: 37.71, cy: 29.28, r: 4.42 }),
}

export const svg = (viewBox: string, body: string, size = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}><title>Babblebird</title>${body}</svg>\n`
