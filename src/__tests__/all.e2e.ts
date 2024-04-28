import { StdioOptions, execSync, spawn } from "child_process"
import { EnvKey } from "../env"

let serverProcess: ReturnType<typeof spawn>

const setupStdio: StdioOptions = "ignore"

beforeAll(() => {
  execSync(`pnpm build`, { stdio: setupStdio })
  execSync(`pnpm build-mock-git`, { stdio: setupStdio })

  serverProcess = spawn("node", ["./dist/gcf-server.js"], {
    detached: true,
    env: {
      [EnvKey.GIT_PATH]: "node ./src/__tests__/dist/mock-git.js",
      [EnvKey.PORT]: "47472"
    },
    stdio: setupStdio
  })
})

afterAll(() => {
  serverProcess.kill()
})

it("On client 'get' command, host output is received", async () => {
  await runClient("username=sam", output => {
    expect(output).toEqual("username=sam\npassword=myMockSecretPassword")
  })
})

async function runClient(
  input: string,
  expectations: (output: string) => void
): Promise<void> {
  const clientProcess = spawn("node", ["./dist/gcf-client.js", "get"], {
    env: {
      [EnvKey.SERVER]: "localhost:47472"
    }
  })
  let outputData = ""
  clientProcess.stdout.on("data", data => {
    outputData += data.toString()
  })

  const done = new Promise(resolve => {
    clientProcess.on("close", () => {
      expectations(outputData)
      resolve(undefined)
    })
  })

  clientProcess.stdin.write(input)
  clientProcess.stdin.end()
  await done
}
