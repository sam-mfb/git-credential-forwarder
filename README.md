# git-credential-forwarder

A helper that allows forwarding git credential requests from one git instance (the "client") to another (the "server"). The purpose is to allow the client to use the git credentials or credential helper present on the server.

This was created for the specific use case of being able to run git inside a Docker container while using the credential helper configured on the Docker host. This, for example, allows development inside a linux-based Docker development container while relying on credentials being managed by [git-credential-manager](https://github.com/git-ecosystem/git-credential-manager) on the host. This helper is particularly useful in that scenario because the tools for using git-credential-manager inside a CLI-only linux container have [some](https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/credstores.md) [limitations](https://github.com/git-ecosystem/git-credential-manager/issues/1549), particularly when used with [MSAL oauth2](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/issues/3033).

Similar functionality is provided by VS Code's [Remote Containers extension](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials#_using-a-credential-helper), however using that requires using VS Code and allowing that extension to manage the containers. This helper allows this type of functionality with a vanilla Docker container.

Because this helper is designed to allow sharing credentials on the same machine, it is setup to share credentials either over a file socket or a tcp connection on `localhost` using http. There is nothing in principle that would prevent listening for tcp connections from arbitrary locations on the network, and it would be trivial to edit this code to do that. But unless you take additional protections, this is a _bad idea_. The server's connections are not encrypted and not protected by any authentication. Accordingly if its socket is exposed on your network, it will accept any request for credentials and respond with the credentials in plaintext. See the [Security](#security) section for more information.

## Installation and Usage

This helper is written in TypeScript and can be installed globally via npm or pnpm.

### Installation Options

#### Global Installation (Recommended)

Install the package globally using npm or pnpm:

```
npm install -g git-credential-forwarder
# or
pnpm add -g git-credential-forwarder
```

This will make the commands `gcf-server` and `gcf-client` available globally.

#### Manual Download

Alternatively, you can download the latest release from this repo. The release consists of a file named `git-credential-forwarder.zip` which contains two JavaScript scripts: `gcf-server.js` and `gcf-client.js`. These can be placed wherever you want.

After downloading, make the scripts executable:

```
chmod +x gcf-server.js gcf-client.js
```

### On the host

If installed globally:
```
gcf-server
```

If using manual download:
```
./gcf-server.js
```

This will launch the server and it will listen for TCP connections on localhost at a random port which will be displayed in the console. You will need to keep this console/terminal open.

Notes:

- You can tell it to use a specific port by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_PORT`

### In the container

Run `export GIT_CREDENTIAL_FORWARDER_SERVER="host.docker.internal:PORT"` where PORT is replaced with the port displayed when you ran the server.

Edit your git configuration file to call the client as a git credential helper:

If installed globally:
```
[credential]
  helper = "!f() { gcf-client $*; }; f"
```

If using manual download:
```
[credential]
  helper = "!f() { /path/to/gcf-client.js $*; }; f"
```

Run git normally and all requests for credentials should be passed through to the host which will handle appropriately on the host side.

Notes:

- You can turn on more verbose debugging information by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_DEBUG` to `true`
- You can explicitly specify the path to your `git` executable by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_GIT_PATH`. This shouldn't be necessary if `git` is in your `PATH`.

### Using a Dockerfile

Here's a strategy to make this fairly easy to use with a Docker container built with a Dockerfile.

#### Option 1: Using npm or pnpm (Recommended)

On the host, set a specific port that you will listen on by configuring the env variable `GIT_CREDENTIAL_FORWARDER_PORT`.

Add these lines in the Dockerfile:

```
# Install Node.js and npm/pnpm first if needed
RUN npm install -g git-credential-forwarder
# or
RUN pnpm add -g git-credential-forwarder

RUN git config --global credential.helper '!f(){ gcf-client $*; }; f'
ENV GIT_CREDENTIAL_FORWARDER_SERVER host.docker.internal:[PORT]
```

#### Option 2: Using direct download

On the host, set a specific port that you will listen on by configuring the env variable `GIT_CREDENTIAL_FORWARDER_PORT`.

Add these lines in the Dockerfile:

```
RUN curl -LO https://github.com/sam-mfb/git-credential-forwarder/releases/download/v[VERSION]/git-credential-forwarder.zip
RUN unzip git-credential-forwarder.zip -d /usr/local/bin
RUN chmod +x /usr/local/bin/gcf-*.js
RUN git config --global credential.helper '!f(){ /usr/local/bin/gcf-client.js $*; }; f'
ENV GIT_CREDENTIAL_FORWARDER_SERVER host.docker.internal:[PORT]
```

Of course, replace `[VERSION]` and `[PORT]` with the actual version number and port number (or use Docker's `ARG` command).

Note that you may need to add some other things to your git configuration. For example, to work with Azure DevOps OAuth2 authentication add:

```
RUN git config --global credential.https://dev.azure.com.useHttpPath true
```

## Using a File Socket

By default the server uses a tcp server listening on `localhost`. You can tell it to use a file socket instead of tcp by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_SOCKET` to the location you want the socket created. You must have permission to create a socket at that location.

On the client/container side, you need to bind mount the socket into your container and then run `export GIT_CREDENTIAL_FORWARDER_SERVER="/path/to/socket"`.

Note that this will not work from a Mac OS host per [this Docker issue](https://github.com/Docker/for-mac/issues/483), which is a significant limitation.

## Debugging

You can enable debugging on either the server or the client by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_DEBUG` to `true`.

## Development

### Publishing to npm

This project uses GitHub Actions to automatically publish to npm when a new release is created. To set this up:

1. Generate an npm token with publish permissions
2. Add the token as a GitHub repository secret named `NPM_TOKEN`
3. Update the version in package.json
4. Commit the changes and push to GitHub
5. Create a new tag for the release: `git tag v1.x.x && git push --tags`
6. Create a new release on GitHub using the tag to trigger the publishing workflow

The GitHub Actions workflow will use pnpm to build, test, and publish the package to the npm registry.

## Security

Nothing is perfectly secure, but I have tried to think through the security implications of running a helper like this. Here are some thoughts and I would definitely welcome any others in the issues or discussions sections:

- This app shouldn't expose your credentials outside of your machine, unless you go into the script and manually force the server to listen on an interface other than the `localhost`. That means that to gain access to your credentials, an attacker would need to make a request on your local machine. If they can do that, they could also run `git credential fill` and get your credentials, so I don't think this changes the threat model.

- OK, the above point isn't entirely correct. At least when the server is running in tcp mode (which is the default), in theory it is less secure than the `git credential fill` scenario because an attacker only needs to be running as _any user_ on your machine that has access to localhost, rather than as you (which they would need to run the direct `git credential` attack). I don't think that's a huge expansion of the threat model, at least for a developer on their own machine, but I'm interested in thinking of ways to make that harder.

- If you want to forward credentials between machines, DO NOT edit the server script to listen on a non-localhost interface. Instead, continue to listen on the localhost interface and use some secure means for forwarding that, e.g., `ssh`

- A key aspect of this utility is that the credentials will only exist in memory, i.e., the chain of `container-git <-> client-helper <-> server-helper <-> host-git` is ephemeral and will be destroyed when the processes shut down. That should limit the threat exposure to the same as when you normally run git (i.e., if someone can dump your memory they could dump your git memory as well). But it is worth thinking through places where the credentials could get accidentally stored to disk:
  - When you have debug mode turned on. The helper sanitizes debug login to minimize this risk.
  - Crash dumps. I'm not aware of any way to crash this app in a way that will dump credentials, but it's a vector to keep in mind.

NB: If you believe there is a security issue with the app, please reach out to me directly via email, which is just `sam` at my company's domain.
