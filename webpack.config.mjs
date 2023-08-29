import path from "node:path";
import process from "node:process";

export default {
  entry: "./src/main.ts",
  mode: "production",
  module: {
    rules: [
      {
        test: /\.m?ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    filename: "main.bundle.js",
    path: path.join(process.cwd(), "build"),
  },
  resolve: {
    extensions: [".mts", ".mjs", ".ts", ".js"],
  },
  target: "node",
};