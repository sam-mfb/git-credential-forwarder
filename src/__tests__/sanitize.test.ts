import { sanitize } from "../sanitize"

describe(sanitize.name, () => {
  it("replaces password value with asterisks", () => {
    const input = "user=admin\npassword=secret\nemail=admin@example.com"
    const expected = "user=admin\npassword=********\nemail=admin@example.com"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password value with asterisks", () => {
    const input = "user=admin\rpassword=secure\rlocation=USA"
    const expected = "user=admin\rpassword=********\rlocation=USA"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("returns input unchanged when no password is present", () => {
    const input = "username=admin\nlocation=USA"
    const expected = "username=admin\nlocation=USA"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces multiple password occurrences with asterisks", () => {
    const input = "password=abc123\ninfo=data\npassword=xyz789\nend"
    const expected = "password=********\ninfo=data\npassword=********\nend"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("ignores case in password field names", () => {
    const input = "Password=visiblePass\nuser=user1"
    const expected = "Password=********\nuser=user1"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password value with asterisks when password is at the start", () => {
    const input = "password=initial\nuser=user1"
    const expected = "password=********\nuser=user1"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password value with asterisks when password is at the end", () => {
    const input = "user=user1\npassword=final"
    const expected = "user=user1\npassword=********"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("returns empty string when input is empty", () => {
    const input = ""
    const expected = ""
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password value with asterisks in complex content", () => {
    const input = "data=xyz\npassword=toHide\nmoreData\npassword=alsoHide"
    const expected = "data=xyz\npassword=********\nmoreData\npassword=********"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })
})
