import { execSync, spawn } from "child_process"
import { EnvKey } from "../env"

let serverProcess: ReturnType<typeof spawn>

beforeAll(() => {
  execSync(`pnpm build`, { stdio: "inherit" })
  execSync(`pnpm build-mock-git`, { stdio: "inherit" })

  serverProcess = spawn("node", ["./dist/gcf-server.js"], {
    detached: true,
    env: {
      [EnvKey.GIT_PATH]: "node ./src/__tests__/dist/mock-git.js",
      [EnvKey.PORT]: "47472"
    },
    stdio: "inherit"
  })
})

afterAll(() => {
  serverProcess.kill()
})

it("On client 'get' command, host output is received", async () => {
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
      expect(outputData).toEqual("username=sam\npassword=myMockSecretPassword")
      resolve(undefined)
    })
  })

  clientProcess.stdin.write("username=sam")
  clientProcess.stdin.end()
  await done
})
