import { StdioOptions, execSync, spawn } from "child_process"
import { EnvKey } from "../env"
import { GitCredentialHelperOperation } from "../git-credential-types"

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

it("Returns output of host on a valid git credential operation", async () => {
  return runClient("get", "username=myUser", output => {
    expect(output).toEqual("username=myUser\npassword=myMockSecretPassword")
  })
})

it("Returns no output on unsupported git command", async () => {
  return runClient(
    "move" as GitCredentialHelperOperation,
    "username=myUser",
    output => {
      expect(output).toEqual("")
    }
  )
})

async function runClient(
  operation: GitCredentialHelperOperation,
  input: string,
  expectations: (output: string) => void
): Promise<void> {
  const clientProcess = spawn("node", ["./dist/gcf-client.js", operation], {
    env: {
      [EnvKey.SERVER]: "localhost:47472"
    }
  })

  let outputData = ""
  clientProcess.stdout.on("data", data => {
    outputData += data.toString()
  })

  const done = new Promise((resolve, reject) => {
    clientProcess.on("close", () => {
      try {
        expectations(outputData)
        resolve(undefined)
      } catch (err) {
        reject(err)
      }
    })
  })

  clientProcess.stdin.write(input)
  clientProcess.stdin.end()
  await done
}
