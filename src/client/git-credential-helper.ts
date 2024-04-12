import { Result } from "../result"
import { extractOperation } from "./extractOperation"
import type {
  CredentialHandlerOptions,
  CredentialOperationHandler
} from "./types"
import type { GitCredentialHelperOperation } from "../git-credential-types"

export function gitCredentialHelper(args: {
  argv: string[]
  streams: {
    input: NodeJS.ReadStream
    output: NodeJS.WriteStream
    error: NodeJS.WriteStream
  }
  credentialOperationHandler: CredentialOperationHandler
  options?: CredentialHandlerOptions
}): void {
  const debug = args.options?.debugger ? args.options?.debugger : () => {}

  debug(`Extracting git credential operation...`)
  const operationResult = extractOperation(args.argv, {
    expectedLocation: 2
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

  let rawInput = ""
  args.streams.input.setEncoding("utf8")
  args.streams.input.on("data", (data: string) => {
    debug(`Received input data: ${data}`)
    rawInput += data
    if (rawInput.trim() === "" || rawInput.endsWith("\n\n")) {
      debug(`Pausing input stream...`)
      args.streams.input.pause()
      debug(`Running credential operation handler...`)
      runCredentialOperationHandler({
        operation: operation,
        rawInput: rawInput,
        credentialOperationHandler: args.credentialOperationHandler,
        streams: args.streams,
        options: args.options
      })
    }
  })
  args.streams.input.on("end", () => {
    debug(`Input stream ended`)
    debug(`Running credential operation handler...`)
    runCredentialOperationHandler({
      operation: operation,
      rawInput: rawInput,
      credentialOperationHandler: args.credentialOperationHandler,
      streams: args.streams,
      options: args.options
    })
  })
}

function runCredentialOperationHandler(args: {
  operation: GitCredentialHelperOperation
  rawInput: string
  credentialOperationHandler: CredentialOperationHandler
  streams: {
    output: NodeJS.WriteStream
    error: NodeJS.WriteStream
  }
  options?: CredentialHandlerOptions
}): void {
  const debug = args.options?.debugger ? args.options?.debugger : () => {}
}
