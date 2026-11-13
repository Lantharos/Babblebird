const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
]

export function when(at: number) {
  const gone = at - Date.now()
  for (const [unit, size] of UNITS)
    if (Math.abs(gone) >= size) return relative.format(Math.round(gone / size), unit)
  return "just now"
}
