import { buildCredentialQuerier } from "../server/buildCredentialQuerier"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "fs"
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
    const script = writeMockScript(
      "echo-cred.js",
      `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        const lines = d.trim().split("\\n");
        lines.push("password=secret123");
        process.stdout.write(lines.join("\\n"));
      });
    `
    )
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    const result = await handler("get", {
      protocol: "https",
      host: "example.com"
    })

    expect(result).toEqual({
      protocol: "https",
      host: "example.com",
      password: "secret123"
    })
  })

  it("succeeds when process writes to stderr and calls debug", async () => {
    const script = writeMockScript(
      "stderr-cred.js",
      `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        process.stderr.write("warning: something happened");
        const lines = d.trim().split("\\n");
        lines.push("password=pw");
        process.stdout.write(lines.join("\\n"));
      });
    `
    )
    const debugMessages: string[] = []
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`,
      debugger: msg => debugMessages.push(msg)
    })

    const result = await handler("get", { username: "user" })

    expect(result).toEqual({ username: "user", password: "pw" })
    expect(
      debugMessages.some(m => m.includes("warning: something happened"))
    ).toBe(true)
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
    const script = writeMockScript(
      "env-cred.js",
      `
      let d = "";
      process.stdin.on("data", c => d += c);
      process.stdin.on("end", () => {
        const lines = d.trim().split("\\n");
        lines.push("password=" + process.env.TEST_SECRET);
        process.stdout.write(lines.join("\\n"));
      });
    `
    )
    const handler = buildCredentialQuerier({
      externalEnv: { ...baseEnv, TEST_SECRET: "env-value-42" },
      gitPath: `node ${script}`
    })

    const result = await handler("get", { protocol: "https" })

    expect(result.password).toBe("env-value-42")
  })

  it("handles store operation without expecting meaningful output", async () => {
    const script = writeMockScript(
      "noop.js",
      `
      process.stdin.on("data", () => {});
      process.stdin.on("end", () => process.exit(0));
    `
    )
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    // store maps to "approve" action — the output is empty which deserializes to {}
    const result = await handler("store", {
      username: "user",
      password: "pass"
    })
    expect(result).toEqual({})
  })
})

describe("buildCredentialQuerier: process failures", () => {
  it("rejects, without an unhandled error, when the process exits without reading stdin", async () => {
    const script = writeMockScript("exit-now.js", `process.exit(1);`)
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    // large enough that the write cannot finish before the process exits
    await expect(
      handler("get", { protocol: "https", path: "x".repeat(2_000_000) })
    ).rejects.toThrow(/exited with code 1/)
  })

  it("rejects when the git command does not exist", async () => {
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: join(tmpDir, "no-such-git")
    })

    await expect(
      handler("get", { protocol: "https", path: "x".repeat(2_000_000) })
    ).rejects.toThrow(/exited with code/)
  })
})

describe("buildCredentialQuerier: cancellation", () => {
  function isRunning(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  it("kills the process and rejects when the signal is aborted", async () => {
    const pidFile = join(tmpDir, "hang.pid")
    const script = writeMockScript(
      "hang.js",
      `
      require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
      setInterval(() => {}, 1000);
    `
    )
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })
    const controller = new AbortController()

    const result = handler("get", { protocol: "https" }, controller.signal)
    const pid = await new Promise<number>(resolve => {
      const wait = setInterval(() => {
        try {
          const text = readFileSync(pidFile, "utf8")
          clearInterval(wait)
          resolve(Number(text))
        } catch {
          // not written yet
        }
      }, 20)
    })
    expect(isRunning(pid)).toBe(true)

    controller.abort()

    await expect(result).rejects.toThrow(/Cancelled/)
    await new Promise<void>(resolve => {
      const wait = setInterval(() => {
        if (!isRunning(pid)) {
          clearInterval(wait)
          resolve()
        }
      }, 20)
    })
    expect(isRunning(pid)).toBe(false)
  })

  it("does not start the process when the signal is already aborted", async () => {
    const marker = join(tmpDir, "should-not-exist")
    const script = writeMockScript(
      "marker.js",
      `require("fs").writeFileSync(${JSON.stringify(marker)}, "ran");`
    )
    const handler = buildCredentialQuerier({
      externalEnv: baseEnv,
      gitPath: `node ${script}`
    })

    await expect(
      handler("get", { protocol: "https" }, AbortSignal.abort())
    ).rejects.toThrow(/Cancelled/)
    expect(existsSync(marker)).toBe(false)
  })
})
