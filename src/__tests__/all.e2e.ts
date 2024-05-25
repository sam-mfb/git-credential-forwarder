import { StdioOptions, execSync, spawn } from "child_process"
import { EnvKey } from "../env"
import { GitCredentialHelperOperation } from "../git-credential-types"

let serverProcess: ReturnType<typeof spawn>

const setupStdio: StdioOptions = "ignore"
const PORT_FOR_TEST_SERVER = 47472
const TEST_PASSWORD = "myMockSecretPassword"

beforeAll(() => {
  execSync(`pnpm build`, { stdio: setupStdio })
  execSync(`pnpm build-mock-git`, { stdio: setupStdio })

  serverProcess = spawn("node", ["./dist/gcf-server.js"], {
    detached: true,
    env: {
      // use the mock git app on the server side
      [EnvKey.GIT_PATH]: "node ./src/__tests__/dist/mock-git.js",
      [EnvKey.PORT]: PORT_FOR_TEST_SERVER.toString(),
      // will be read by mock git and used in its mock return
      TEST_PASSWORD: TEST_PASSWORD
    },
    stdio: setupStdio
  })
})

afterAll(() => {
  serverProcess.kill()
})

it("Returns output of host on a valid git credential operation", async () => {
  // this test validates that the entire round trip is working: the client
  // makes a 'get' request, that is forwarded to the server, the server
  // passes it to `git`, gets the response, and passes it back to the
  // client
  return runClient({
    operation: "get",
    input: "username=myUser",
    expectations: output => {
      expect(output).toEqual(`username=myUser\npassword=${TEST_PASSWORD}`)
    }
  })
})

it("Returns no output on unsupported git command", async () => {
  return runClient({
    // not an actual git command
    operation: "move" as GitCredentialHelperOperation,
    input: "username=myUser",
    expectations: output => {
      expect(output).toEqual("")
    }
  })
})

/**
 * Helper function to run e2e tests
 *
 * @async
 * @param  operation - the git credential helper operation to test
 * @param  input - the git input string to pass
 * @param  expectations - callback that allows running assertions on the output returned to the client
 */
async function runClient({
  operation,
  input,
  expectations
}: {
  operation: GitCredentialHelperOperation
  input: string
  expectations: (output: string) => void
}): Promise<void> {
  const clientProcess = spawn("node", ["./dist/gcf-client.js", operation], {
    env: {
      [EnvKey.SERVER]: "localhost:" + PORT_FOR_TEST_SERVER.toString()
    }
  })

  let outputData = ""
  clientProcess.stdout.on("data", data => {
    outputData += data.toString()
  })

  // Promise that will resolve when the client process is complete (i.e.,
  // when all output has been received back
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
