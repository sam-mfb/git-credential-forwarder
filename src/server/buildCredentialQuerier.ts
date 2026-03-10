import {
  GitCredentialAction,
  GitCredentialInputOutput,
  gitCredentialAction,
  gitCredentialHelperOperation
} from "../git-credential-types"
import { Result } from "../result"
import { CredentialOperationHandler } from "../types"
import { spawn } from "child_process"
import { gitCredentialIoApi } from "../gitcredential-io"

export function buildCredentialQuerier(deps: {
  // it needs the external env variables for certain external
  // credential helpers, e.g., git-credential-manager, to work
  // correctly
  externalEnv: NodeJS.ProcessEnv
  gitPath: string
  debugger?: (str: string) => void
}): CredentialOperationHandler {
  const debug = deps.debugger ? deps.debugger : () => {}

  return async (operation, input) => {
    switch (operation) {
      case gitCredentialHelperOperation.GET:
        return runCredentialAction(
          gitCredentialAction.FILL,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug
        )
      case gitCredentialHelperOperation.STORE:
        return runCredentialAction(
          gitCredentialAction.APPROVE,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug
        )
      case gitCredentialHelperOperation.ERASE:
        return runCredentialAction(
          gitCredentialAction.REJECT,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug
        )
      default:
        operation satisfies never
        return {}
    }
  }
}

async function runCredentialAction(
  action: GitCredentialAction,
  input: GitCredentialInputOutput,
  externalEnv: NodeJS.ProcessEnv,
  gitCmd: string,
  debug: (str: string) => void
): Promise<GitCredentialInputOutput> {
  const env = {
    ...externalEnv,
    GIT_TERMINAL_PROMPT: "0"
  }
  const GIT_CREDENTIAL_ARG = "credential"
  const inputSerialized = gitCredentialIoApi.serialize(input)

  const [cmd, ...cmdArgs] = gitCmd.split(/\s+/) as [string, ...string[]]
  const args = [...cmdArgs, GIT_CREDENTIAL_ARG, action]

  debug(`Running: ${cmd} ${args.join(" ")} (with stdin piping)`)

  const { stdout, stderr } = await spawnWithStdin(
    cmd,
    args,
    inputSerialized + "\n",
    env
  ).catch(err => {
    debug(err)
    throw err
  })

  if (stderr.length > 0) {
    debug(`Received stderr: "${stderr}"`)
  }

  const outputResult = gitCredentialIoApi.deserialize(stdout)
  if (Result.isSuccess(outputResult)) {
    return outputResult.value
  } else {
    throw new Error(
      `Error in git action. stderr output: "${stderr}". validation result: "${outputResult.error}"`
    )
  }
}

function spawnWithStdin(
  cmd: string,
  args: string[],
  stdinData: string,
  env: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env,
      stdio: ["pipe", "pipe", "pipe"]
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString()
    })
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString()
    })

    child.on("error", err => {
      reject(err)
    })

    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(
          new Error(
            `Process exited with code ${code}. stderr: "${stderr}"`
          )
        )
      }
    })

    child.stdin.write(stdinData)
    child.stdin.end()
  })
}
