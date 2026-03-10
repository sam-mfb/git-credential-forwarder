import { buildCredentialQuerier } from "../server/buildCredentialQuerier"
import { writeFileSync, mkdtempSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

// We need PATH in the env so spawn can find `node`
const baseEnv = { PATH: process.env.PATH ?? "" }

let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gcf-test-"))
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeMockScript(name: string, code: string): string {
  const path = join(tmpDir, name)
  writeFileSync(path, code)
  return path
}

describe("buildCredentialQuerier", () => {
  it("pipes serialized credentials via stdin and parses stdout", async () => {
    const script = writeMockScript("echo-cred.js", `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        const lines = d.trim().split("\\n");
        lines.push("password=secret123");
        process.stdout.write(lines.join("\\n"));
      });
    `)
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    const result = await handler("get", { protocol: "https", host: "example.com" })

    expect(result).toEqual({
      protocol: "https",
      host: "example.com",
      password: "secret123"
    })
  })

  it("succeeds when process writes to stderr and calls debug", async () => {
    const script = writeMockScript("stderr-cred.js", `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        process.stderr.write("warning: something happened");
        const lines = d.trim().split("\\n");
        lines.push("password=pw");
        process.stdout.write(lines.join("\\n"));
      });
    `)
    const debugMessages: string[] = []
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`,
      debugger: (msg) => debugMessages.push(msg)
    })

    const result = await handler("get", { username: "user" })

    expect(result).toEqual({ username: "user", password: "pw" })
    expect(debugMessages.some(m => m.includes("warning: something happened"))).toBe(true)
  })

  it("throws when process exits with non-zero code", async () => {
    const script = writeMockScript("fail.js", `process.exit(1);`)
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    await expect(handler("get", { protocol: "https" })).rejects.toThrow()
  })

  it("passes environment variables to the spawned process", async () => {
    const script = writeMockScript("env-cred.js", `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        const lines = d.trim().split("\\n");
        lines.push("password=" + process.env.TEST_SECRET);
        process.stdout.write(lines.join("\\n"));
      });
    `)
    const handler = buildCredentialQuerier({
      externalEnv: { ...baseEnv, TEST_SECRET: "env-value-42" },
      gitPath: `node ${script}`
    })

    const result = await handler("get", { protocol: "https" })

    expect(result.password).toBe("env-value-42")
  })

  it("handles store operation without expecting meaningful output", async () => {
    const script = writeMockScript("noop.js", `
      process.stdin.on("data", () => {});
      process.stdin.on("end", () => process.exit(0));
    `)
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    // store maps to "approve" action — the output is empty which deserializes to {}
    const result = await handler("store", { username: "user", password: "pass" })
    expect(result).toEqual({})
  })
})
