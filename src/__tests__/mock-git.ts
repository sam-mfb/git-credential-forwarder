// Mock of git that will accept commands in the form 'credential [ACTION] and
// if the action is 'fill' will return a fake password appended to the input

import {
  GitCredentialInputOutput,
  gitCredentialAction
} from "../git-credential-types"
import { gitCredentialIoApi } from "../gitcredential-io"
import { Result } from "../result"

const TEST_PASSWORD = "myMockSecretPassword"

const firstArg = process.argv[2]
const secondArg = process.argv[3]

if (firstArg !== "credential") {
  console.log("Did not receive 'credential' command")
  process.exit(1)
}

if (secondArg !== gitCredentialAction.FILL) {
  process.exit(0)
}

let rawInput = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (data: string) => {
  rawInput += data
  if (rawInput.trim() === "" || rawInput.endsWith("\n\n")) {
    process.stdin.pause()
    processInput(rawInput)
  }
})
process.stdin.on("end", () => {
  processInput(rawInput)
})

function processInput(inputRaw: string): void {
  const inputResult = gitCredentialIoApi.deserialize(rawInput)
  if (Result.isFailure(inputResult)) {
    process.stderr.write(inputResult.error.message)
    process.exit(1)
  }
  const input = inputResult.value
  const output: GitCredentialInputOutput = { ...input, password: TEST_PASSWORD }
  process.stdout.write(gitCredentialIoApi.serialize(output))
  process.exit(0)
}
