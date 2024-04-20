export function sanitize(input: string): string {
  const regex = /("?\bpassword"?\s*[=:]\s*)("[^"]*"|\S*)/gi
  return input.replace(regex, (match, p1, p2) => {
    if (p2.startsWith('"') && p2.endsWith('"')) {
      return `${p1}"********"`
    } else {
      return `${p1}********`
    }
  })
}
