import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

const buildHelper = require("../config/build-helper");
const tsconfig = "tsconfig.json";

const plugins = [
  resolve({
    mainFields: ["module", "main"]
  }),
  json()
];

export default buildHelper([
  {
    name: "App",
    input: "./viewer/src/index.ts",
    output: "./viewer/dist/app.js",
    format: "umd",
    tsconfig,
    resolve: false,
    plugins,
  }
]);
