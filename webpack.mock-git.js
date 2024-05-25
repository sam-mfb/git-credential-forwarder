const path = require("path")

module.exports = {
  entry: {
    "mock-git": "./src/__tests__/mock-git.ts"
  },
  mode: "production",
  target: "node",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.prod.json"
          }
        }
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "mock-git.js",
    path: path.resolve(__dirname, "src", "__tests__", "dist"),
    library: {
      name: "git-credential-forwarder",
      type: "umd"
    },
    globalObject: "this"
  }
}
