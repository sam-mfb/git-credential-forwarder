import { promisify } from "util"
import {
  GitCredentialAction,
  GitCredentialInputOutput,
  gitCredentialAction,
  gitCredentialHelperOperation
} from "../git-credential-types"
import { Result } from "../result"
import { CredentialOperationHandler, CustomError } from "../types"
import { exec } from "child_process"
import { gitCredentialIoApi } from "../gitcredential-io"

const execAsync = promisify(exec)

export function buildCredentialQuerier(deps: {
  debugger?: (str: string) => void
}): CredentialOperationHandler {
  const debug = deps.debugger ? deps.debugger : () => {}

  return async (operation, input) => {
    switch (operation) {
      case gitCredentialHelperOperation.GET:
        return runCredentialAction(gitCredentialAction.FILL, input, debug)
      case gitCredentialHelperOperation.STORE:
        return runCredentialAction(gitCredentialAction.APPROVE, input, debug)
      case gitCredentialHelperOperation.ERASE:
        return runCredentialAction(gitCredentialAction.REJECT, input, debug)
      default:
        operation satisfies never
        return {}
    }
  }
}

async function runCredentialAction(
  action: GitCredentialAction,
  input: GitCredentialInputOutput,
  debug: (str: string) => void
): Promise<GitCredentialInputOutput> {
  const env = {
    GIT_TERMINAL_PROMPT: "0"
  }
  const GIT_CMD = "git"
  const GIT_CREDENTIAL_ARG = "credential"
  const inputSerialized = gitCredentialIoApi.serialize(input)
  debug(
    `echo '${inputSerialized}' | ${GIT_CMD} ${GIT_CREDENTIAL_ARG} ${action}`,
  )
  const { stdout, stderr } = await execAsync(
    `echo '${inputSerialized}' | ${GIT_CMD} ${GIT_CREDENTIAL_ARG} ${action}`,
    {
      encoding: "utf8",
      env
    }
  )

  debug(`Received stdout: "${stdout}"\nReceived stderr: "${stderr}"`)

  const outputResult = gitCredentialIoApi.deserialize(stdout)
  if (Result.isSuccess(outputResult)) {
    return outputResult.value
  } else {
    throw new Error(
      `Error in git action. stderr output: "${stderr}". validation result: "${outputResult.error}"`
    )
  }
}
