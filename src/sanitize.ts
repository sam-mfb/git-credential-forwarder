export function sanitize(input: string): string {
  return input.replace(/(password=)[^\r\n]+/gi, "$1********")
}
