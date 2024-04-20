const ansiColors = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
} as const

export type AnsiColor = keyof typeof ansiColors

const resetString = `\x1b[0m`

export function color(str: string, color: AnsiColor) {
  return `${ansiColors[color]}${str}${resetString}`
}
