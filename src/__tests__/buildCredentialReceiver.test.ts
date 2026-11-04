import http from "http"
import net from "net"
import { mkdtempSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
  type RunningReceiver,
  buildCredentialReceiver,
  toStatusMessage
} from "../server/buildCredentialReceiver"
import type { CredentialOperationHandler } from "../types"

type Response = { status?: number; message?: string; body: string }

let tmpDir: string
let socketCount = 0
const running: RunningReceiver[] = []

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gcf-receiver-test-"))
})

afterEach(async () => {
  await Promise.all(running.splice(0).map(r => r.close()))
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

/** Starts a receiver on a fresh unix socket; returns its path and the logs. */
async function startReceiver(
  handler: CredentialOperationHandler
): Promise<{ socketPath: string; errors: string[] }> {
  const socketPath = join(tmpDir, `s${socketCount++}.sock`)
  const errors: string[] = []
  running.push(
    await buildCredentialReceiver({
      type: "ipc",
      socketPath,
      credentialOperationHandler: handler,
      errorLogger: str => errors.push(str)
    })()
  )
  return { socketPath, errors }
}

/** Sends a raw HTTP request; `parts` are written separately, in order. */
function rawRequest(
  socketPath: string,
  parts: Buffer[],
  options: { gapMs: number }
): Promise<Response> {
  const length = parts.reduce((sum, p) => sum + p.length, 0)
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath,
        method: "POST",
        path: "/",
        headers: { "Content-Length": length }
      },
      res => {
        let body = ""
        res.setEncoding("utf8")
        res.on("data", (c: string) => (body += c))
        res.on("end", () =>
          resolve({ status: res.statusCode, message: res.statusMessage, body })
        )
      }
    )
    req.on("error", reject)
    const writeNext = (i: number): void => {
      if (i === parts.length) {
        req.end()
        return
      }
      req.write(parts[i])
      setTimeout(() => writeNext(i + 1), options.gapMs)
    }
    writeNext(0)
  })
}

function post(socketPath: string, body: string): Promise<Response> {
  return rawRequest(socketPath, [Buffer.from(body)], { gapMs: 0 })
}

const validBody = JSON.stringify({
  operation: "get",
  input: { protocol: "https", host: "example.com" }
})

const echoHandler: CredentialOperationHandler = async (_op, input) => ({
  ...input,
  password: "pw"
})

describe("buildCredentialReceiver: bad request bodies", () => {
  it.each([
    ["malformed JSON", "{not json"],
    ["an empty body", ""],
    ["JSON null", "null"],
    ["JSON of the wrong shape", '{"foo":1}'],
    ["an unknown operation", '{"operation":"nope","input":{}}']
  ])("answers %s with 400, logs it, and keeps serving", async (_name, body) => {
    const { socketPath, errors } = await startReceiver(echoHandler)

    const bad = await post(socketPath, body)
    expect(bad.status).toBe(400)
    expect(errors).toHaveLength(1)

    const good = await post(socketPath, validBody)
    expect(good.status).toBe(200)
    expect(good.body).toBe("protocol=https\nhost=example.com\npassword=pw")
  })
})

describe("buildCredentialReceiver: request body decoding", () => {
  it("decodes a multi-byte character split across chunks", async () => {
    let received: unknown
    const { socketPath } = await startReceiver(async (_op, input) => {
      received = input
      return input
    })
    const body = Buffer.from(
      JSON.stringify({
        operation: "get",
        input: { protocol: "https", username: "josé" }
      })
    )
    // cut between the two bytes of "é"
    const cut = body.indexOf(Buffer.from("é")) + 1

    const res = await rawRequest(
      socketPath,
      [body.subarray(0, cut), body.subarray(cut)],
      { gapMs: 50 }
    )

    expect(res.status).toBe(200)
    expect(received).toEqual({ protocol: "https", username: "josé" })
  })
})

describe("buildCredentialReceiver: failed operations", () => {
  it("answers 500 with a readable, printable reason, and keeps serving", async () => {
    let calls = 0
    const { socketPath, errors } = await startReceiver(async (_op, input) => {
      calls++
      if (calls === 1) {
        throw new Error("git failed: échec\nsecond line")
      }
      return input
    })

    const failed = await post(socketPath, validBody)
    expect(failed.status).toBe(500)
    expect(failed.message).toBe("git failed: ?chec second line")
    expect(errors.join("\n")).toContain("git failed")

    const good = await post(socketPath, validBody)
    expect(good.status).toBe(200)
  })

  it("answers 500 when the handler throws instead of rejecting", async () => {
    const throwing: CredentialOperationHandler = () => {
      throw new Error("sync failure")
    }
    const { socketPath } = await startReceiver(throwing)

    const res = await post(socketPath, validBody)

    expect(res.status).toBe(500)
    expect(res.message).toBe("sync failure")
  })

  it("does not put a password from an error into the status message", async () => {
    const { socketPath } = await startReceiver(async () => {
      throw new Error("helper said password=hunter2")
    })

    const res = await post(socketPath, validBody)

    expect(res.status).toBe(500)
    expect(res.message).not.toContain("hunter2")
  })
})

describe("buildCredentialReceiver: client disconnects", () => {
  it("aborts the operation's signal and keeps serving", async () => {
    let signal: AbortSignal | undefined
    let release: () => void = () => {}
    const { socketPath, errors } = await startReceiver((_op, input, s) => {
      if (signal) {
        return Promise.resolve(input)
      }
      // first call: answer only when released, after the client is gone
      return new Promise(resolve => {
        signal = s
        release = () => resolve(input)
      })
    })

    await new Promise<void>(resolve => {
      const sock = net.connect(socketPath, () => {
        sock.write(
          `POST / HTTP/1.1\r\nHost: x\r\nContent-Length: ${Buffer.byteLength(
            validBody
          )}\r\n\r\n${validBody}`
        )
        const wait = setInterval(() => {
          if (signal) {
            clearInterval(wait)
            sock.destroy()
            resolve()
          }
        }, 10)
      })
    })
    await new Promise<void>(resolve => {
      const wait = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(wait)
          resolve()
        }
      }, 10)
    })
    expect(signal?.aborted).toBe(true)

    // a late answer for the gone client must not break anything
    release()
    const good = await post(socketPath, validBody)
    expect(good.status).toBe(200)
    expect(errors).toEqual([])
  })
})

describe("buildCredentialReceiver: startup", () => {
  it("rejects when the port is already in use", async () => {
    const blocker = net.createServer()
    await new Promise<void>(resolve => blocker.listen(0, "127.0.0.1", resolve))
    const port = (blocker.address() as net.AddressInfo).port

    try {
      await expect(
        buildCredentialReceiver({
          type: "tcp",
          host: "127.0.0.1",
          port,
          credentialOperationHandler: echoHandler,
          errorLogger: () => {}
        })()
      ).rejects.toThrow(/EADDRINUSE/)
    } finally {
      blocker.close()
    }
  })
})

describe("toStatusMessage", () => {
  it("keeps printable ASCII as is", () => {
    expect(toStatusMessage("exit code 128")).toBe("exit code 128")
  })

  it("joins lines and replaces non-ASCII characters", () => {
    expect(toStatusMessage("a\r\nb\tc ü")).toBe("a b c ?")
  })

  it("cuts long messages", () => {
    const msg = toStatusMessage("x".repeat(500))
    expect(msg).toHaveLength(200)
    expect(msg.endsWith("...")).toBe(true)
  })
})
