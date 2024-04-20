import { type AnsiColor, color } from "./color"
import { sanitize } from "./sanitize"

export function buildOutputWriter(deps: {
  color: AnsiColor
  stream: NodeJS.WriteStream
}): (str: string) => void {
  return str => {
    deps.stream.write(color(sanitize(str), deps.color) + "\n")
  }
}
