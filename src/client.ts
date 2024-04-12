type GitCredentialRequest = {
  stdinRequired: false
  command: "list"
} |
const command = getCredentialCommand()
let standard_input = null
if (stdinRequired(command)) {
  standard_input = getStandardInput()
}

type
