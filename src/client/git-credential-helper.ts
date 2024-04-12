import type { GitCredentialHelperOperation } from "../git-credential-types"
import { isGitCredentialHelperOperation } from "../git-credential-types.guards"
import { Result } from "../result"

type CustomError = {
  errorType: "generic" | "silent"
  message: string
}

export function gitCredentialHelper(args: {
  argv: string[]
  input: NodeJS.ReadStream
  output: NodeJS.WriteStream
  error: NodeJS.WriteStream
  options?: {
    // pass a debugger function for extra output, e.g., console.log()
    debugger?: (message: string) => void
    // VS Code's helper inserts a command before the standard git operation
    vsCodeCompatible?: boolean
  }
}): void {
  const debug = args.options?.debugger ? args.options?.debugger : () => {}

  const operationResult = extractOperation(args.argv, {
    expectedLocation: args.options?.vsCodeCompatible ? 3 : 2
  })
  if (Result.isFailure(operationResult)) {
    switch (operationResult.error.errorType) {
      case "generic":
        debug(operationResult.error.message)
        throw new Error(operationResult.error.message)
      case "silent":
        debug(operationResult.error.message)
        return
      default:
        operationResult.error.errorType satisfies never
        return
    }
  }
  const operation = operationResult.value
  debug(`Received operation ${operation}`)
}

function extractOperation(
  argv: string[],
  options: {
    expectedLocation: number
  }
): Result<GitCredentialHelperOperation, CustomError> {
  const operation = argv[options.expectedLocation]
  if (typeof operation !== "string") {
    return Result.failure({
      errorType: "generic",
      message: `No value found at expected operation location ${options.expectedLocation}`
    })
  }
  if (!isGitCredentialHelperOperation(operation)) {
    return Result.failure({
      errorType: "silent",
      message: `${operation} is not a currently supported operation`
    })
  }
  return Result.success(operation)
}
