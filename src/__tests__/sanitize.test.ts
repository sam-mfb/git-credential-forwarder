import { sanitize } from "../sanitize"

describe(sanitize.name, () => {
  it("replaces password value with asterisks", () => {
    const input = "password=secret"
    const expected = "password=********"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password value with spaces around equal sign with asterisks", () => {
    const input = "password = secret"
    const expected = "password = ********"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces quoted password value with asterisks", () => {
    const input = 'password="verySecret"'
    const expected = 'password="********"'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces JSON format password value with asterisks", () => {
    const input = '{"password": "jsonSecret"}'
    const expected = '{"password": "********"}'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces multiple password formats in mixed content with asterisks", () => {
    const input =
      'user=admin password = hidden password="visible" {"password":"json"}'
    const expected =
      'user=admin password = ******** password="********" {"password":"********"}'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("returns other key-value pairs unchanged", () => {
    const input = "username=admin\nlocation=USA"
    const expected = "username=admin\nlocation=USA"
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces multiple password fields with different formats with asterisks", () => {
    const input =
      'password=abc123\npassword = xyz789\npassword="hideThis"\n{"password":"andThis"}'
    const expected =
      'password=********\npassword = ********\npassword="********"\n{"password":"********"}'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("ignores case in password field names in different formats", () => {
    const input =
      'Password=visiblePass Password = "anotherOne" {"Password":"jsonPass"}'
    const expected =
      'Password=******** Password = "********" {"Password":"********"}'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("returns empty string when input is empty", () => {
    const input = ""
    const expected = ""
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })

  it("replaces password values in complex content with asterisks", () => {
    const input =
      'data=xyz password=toHide moreData password="alsoHide" {"password":"inJson"}'
    const expected =
      'data=xyz password=******** moreData password="********" {"password":"********"}'
    const result = sanitize(input)
    expect(result).toEqual(expected)
  })
})
