import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

const buildHelper = require("../config/build-helper");
const tsconfig = "tsconfig.json";

const plugins = [
  resolve({
    mainFields: ["module", "main"]
  }),
  json(),
  serve({
    open: true,
    contentBase: "viewer",
  }),
  livereload("viewer"),
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
