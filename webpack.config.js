const path = require("path")

module.exports = {
  entry: {
    "gcf-server": "./src/server/index.ts",
    "gcf-client": "./src/client/index.ts"
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
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "git-credential-forwarder",
      type: "umd"
    },
    globalObject: "this"
  }
}
