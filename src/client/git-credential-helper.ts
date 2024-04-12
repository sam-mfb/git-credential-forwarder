import { Result } from "../result"
import { extractOperation } from "./extractOperation"
import type { CredentialOperationHandler } from "./types"
import type { GitCredentialHelperOperation } from "../git-credential-types"
import { gitCredentialIoApi } from "../gitcredential-io"

export function gitCredentialHelper(args: {
  argv: string[]
  streams: {
    input: NodeJS.ReadStream
    output: NodeJS.WriteStream
    error: NodeJS.WriteStream
  }
  onExit: {
    success: () => void
    failure: () => void
  }
  credentialOperationHandler: CredentialOperationHandler
  debugger?: (str: string) => void
}): void {
  const debug = args.debugger ? args.debugger : () => {}

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
        onExit: args.onExit,
        debugger: args.debugger
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
      onExit: args.onExit,
      debugger: args.debugger
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
  onExit: {
    success: () => void
    failure: () => void
  }
  debugger?: (str: string) => void
}): void {
  const debug = args.debugger ? args.debugger : () => {}

  const inputResult = gitCredentialIoApi.deserialize(args.rawInput)
  if (Result.isFailure(inputResult)) {
    throw new Error(inputResult.error.message)
  }
  const input = inputResult.value

  debug(
    `Running credential handler with operation ${args.operation} and input ${input}`
  )
  args
    .credentialOperationHandler(args.operation, input)
    .then(output => {
      const serializedOutput = gitCredentialIoApi.serialize(output)
      debug(`Received credential output ${serializedOutput}`)
      args.streams.output.write(JSON.stringify(serializedOutput))
      debug(`Exiting on success...`)
      args.onExit.success()
    })
    .catch(err => {
      debug(`Credential handler error ${err}`)
      args.streams.error.write(JSON.stringify(err))
      debug(`Exiting on failure...`)
      args.onExit.failure()
    })
}
