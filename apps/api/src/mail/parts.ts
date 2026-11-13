import { colors, FONT } from "./theme.ts"

export interface Part {
  html: string
  text: string
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ENTITIES[char]!)

const table = (content: string, attributes = "") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${attributes}>${content}</table>`

export function paragraph(text: string): Part {
  return {
    html: `<p class="ink-soft" style="margin:0;font-family:${FONT};font-size:16px;line-height:1.6;color:${colors.inkSoft};">${escapeHtml(text)}</p>`,
    text,
  }
}

export function code(value: string): Part {
  return {
    html: table(
      `<tr><td class="well ink" bgcolor="${colors.well}" style="padding:16px 24px;border-radius:14px;background-color:${colors.well};font-family:${FONT};font-size:34px;line-height:1.2;font-weight:600;letter-spacing:6px;font-variant-numeric:tabular-nums;color:${colors.ink};-webkit-user-select:all;user-select:all;">${escapeHtml(value)}</td></tr>`,
    ),
    text: value,
  }
}

export function button(label: string, href: string): Part {
  return {
    html: table(
      `<tr><td class="button" bgcolor="${colors.accent}" style="border-radius:12px;background-color:${colors.accent};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:15px;line-height:1.2;font-weight:600;color:${colors.accentInk};text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a></td></tr>`,
    ),
    text: `${label}: ${href}`,
  }
}

export function quote(text: string): Part {
  return {
    html: `<p class="ink" style="margin:0;padding-left:14px;border-left:3px solid ${colors.well};font-family:${FONT};font-size:16px;line-height:1.6;color:${colors.ink};white-space:pre-wrap;">${escapeHtml(text)}</p>`,
    text: text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
  }
}

export function link(label: string, href: string): Part {
  return {
    html: `<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;"><a href="${escapeHtml(href)}" style="color:${colors.accent};font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`,
    text: `${label}: ${href}`,
  }
}
