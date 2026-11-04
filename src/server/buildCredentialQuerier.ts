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

  return async (operation, input, signal) => {
    switch (operation) {
      case gitCredentialHelperOperation.GET:
        return runCredentialAction(
          gitCredentialAction.FILL,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug,
          signal
        )
      case gitCredentialHelperOperation.STORE:
        return runCredentialAction(
          gitCredentialAction.APPROVE,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug,
          signal
        )
      case gitCredentialHelperOperation.ERASE:
        return runCredentialAction(
          gitCredentialAction.REJECT,
          input,
          deps.externalEnv,
          deps.gitPath,
          debug,
          signal
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
  debug: (str: string) => void,
  signal: AbortSignal | undefined
): Promise<GitCredentialInputOutput> {
  const env = {
    ...externalEnv,
    GIT_TERMINAL_PROMPT: "0"
  }
  const GIT_CREDENTIAL_ARG = "credential"
  const inputSerialized = gitCredentialIoApi.serialize(input)

  // On POSIX, `exec` makes the shell replace itself with git, so cancelling
  // (which kills the spawned process) kills git rather than only the shell.
  // Windows' cmd.exe has no equivalent; there only the shell is killed.
  const execPrefix = process.platform === "win32" ? "" : "exec "
  const fullCmd = `${execPrefix}${gitCmd} ${GIT_CREDENTIAL_ARG} ${action}`

  debug(`Running: ${fullCmd} (with stdin piping)`)

  const { stdout, stderr } = await spawnWithStdin(
    fullCmd,
    inputSerialized + "\n",
    env,
    signal
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

/**
 * Runs `cmd` in a shell, writes `stdinData` to it, and collects its output.
 *
 * Rejects if the process cannot start, exits with a non-zero code, or is
 * cancelled through `signal`. On cancellation the process is killed.
 */
function spawnWithStdin(
  cmd: string,
  stdinData: string,
  env: NodeJS.ProcessEnv,
  signal: AbortSignal | undefined
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(`Cancelled before running: ${cmd}`))
      return
    }

    const child = spawn(cmd, {
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"]
    })

    const onAbort = (): void => {
      child.kill()
      reject(new Error(`Cancelled: ${cmd}`))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    child.on("close", () => {
      signal?.removeEventListener("abort", onAbort)
    })

    // If the process exits without reading all of stdin, writing to it fails
    // (e.g. EPIPE). That must fail only this operation. The exit code, which
    // 'close' reports, is the more useful error, so keep this one as detail.
    let stdinError: Error | undefined
    child.stdin.on("error", err => {
      stdinError = err
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
        const stdinDetail = stdinError
          ? ` (writing stdin failed: ${stdinError.message})`
          : ""
        reject(
          new Error(
            `Process exited with code ${code}${stdinDetail}. stderr: "${stderr}"`
          )
        )
      }
    })

    child.stdin.write(stdinData)
    child.stdin.end()
  })
}
