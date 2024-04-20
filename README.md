# git-credential-forwarder

A helper that allows forwarding git credential requests from one git instance (the "client") to another (the "server"). The purpose is to allow the client to use the git credentials or credential helper present on the host.

This was created for the specific use case of being able to run git inside a docker container while using the credential helper configured on the docker host. This, for example, allows development inside a linux-based docker development container while relying on credentials being managed by [git-credential-manager](https://github.com/git-ecosystem/git-credential-manager) on the host. This helper is particularly useful in that scenario because the tools for using git-credential-manager inside a CLI-only linux container have [some](https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/credstores.md) [limitations](https://github.com/git-ecosystem/git-credential-manager/issues/1549), particularly when used with [MSAL oauth2](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/issues/3033).

Similar functionality is provided by VS Code's [Remote Containers extension](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials#_using-a-credential-helper), however using that requires using VS Code and allowing that extension to manage the containers. This helper allows this type of functionality with any Docker containers.

Because this helper is designed to allow sharing credentials on the same machine, it is setup to share credentials either over a file socket or a tcp connection on `localhost` using http. There is nothing in principle that would prevent listening for tcp connections from arbitrary locations on the network, and it would be trivial to edit this code to do that. But unless you take additional protections, this is a _bad idea_. The server's connections are not encrypted and not protected by any authentication. Accordingly if it's socket is exposed on your network, it will accept any request for credentials and respond with the credentials in plaintext. See the [Security](#security) section for more information.

## Installation and Usage

This helper is written in Typescript and compiles down to two Javascript scripts, one for the server and one for the client. At this point, there is no installation tooling or bundling.  The simplest way to install it is to clone this repo on both the host machine and inside the Docker container. Once that is done, do the following:

### On the host

Run `pnpm install & pnpm build` or your favorite package tool to install dependencies and compile the app.

At the root of the repository, run `node dist/server/index.js`. This will launch the server and it will listen for TCP connections on localhost at a random port which will be displayed in the console. You will need to keep this console/terminal open.

Notes:

- You can tell it to use a specific port by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_PORT`

### In the container

Run `pnpm install & pnpm build` or your favorite package tool to install dependencies and compile the app.

Run `export GIT_CREDENTIAL_FORWARDER_SERVER="host.docker.internal:PORT` where PORT is replaced with the port displayed when you ran the server.

Edit your git configuration file to call the client you just complied as a git credential helper, as follows:

```
[credential]
  helper = "!f() { node ~/git-credential-forwarder/dist/client/index.js $*; }; f"
```

Run git normally and all requests for credentials should be passed through to the host which will handle appropriately on the host side.

Notes:

- You can turn on more verbose debugging information by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_DEBUG` to `true`

## Using a File Socket

By default the server uses a tcp server listening on `localhost`. You can tell it to use a file socket instead of tcp by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_SOCKET` to the location you want the socket created. You must have permission to create a socket at that location.

On the client/container side, you need to bind mount the socket into your container and then run `export GIT_CREDENTIAL_FORWARDER_SERVER="/path/to/socket"`.

Note that this will not work from a Mac OS host per [this docker issue](https://github.com/docker/for-mac/issues/483), which is a signficant limitation.

## Debugging

You can enable debugging on either the server or the client by setting the environmental variable `GIT_CREDENTIAL_FORWARDER_DEBUG` to `true`.

## Security

Nothing is perfectly secure, but I have tried to think through the security implications of running a helper like this. Here are some thoughts and I would definitely welcome any others in the issues or discussions sections:

- This app shouldn't expose your credentials outside of your machine, unless you go into the script and manually force the server to listen on an interface other than the `localhost`. That means that to gain access to your credentials, an attacker would need to make a request on your local machine. If they can do that, they could also run `git credential fill` and get your credentials, so I don't think this changes the threat model.

- OK, the above point isn't entirely correct. At least when the server is running in tcp mode (which is the default), in theory it is less secure than the `git credential fill` scenario because an attacker only needs to be running as _any user_ on your machine that has access to localhost, rather than as you (which they would need to run the direct `git credential` attack). I don't think that's a huge expansion of the threat model, at least for a developer on their own machine, but I'm interested in thinking of ways to make that harder.

- A key aspect of this utility is that the credentials will only exist in memory, i.e., the chain of `container-git <-> client-helper <-> server-helper <-> host-git` is ephemeral and will be destroyed when the processes shut down. That should limit the threat exposure to the same as when you normally run git (i.e., if someone can dump your memory they could dump your git memory as well). But it is worth thinking through places where the credentials could get accidentally stored to disk:
  - When you have debug mode turned on. The helper tries to sanitize debug login to avoid this, but it is still a risk.
  - Crash dumps. I'm not aware of any way to crash this app in a way that will dump credentials, but it's a vector to keep in mind.
  - Other? I can't think of any other way, but let me know if you can...

## To Do

- Test more extensively. Mostly it's only be tested on Azure Devops and GitHub using git credential manager as the host credential helper.
- Bundle the scripts and make the install easier.
- More tests.
- Maybe some utilities to make setting up the docker part easier to do as part of a Dockerfile
