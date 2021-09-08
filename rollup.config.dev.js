import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import config from "./rollup.config";

config[0].plugins.push(
  serve({
    open: true,
    contentBase: "viewer",
  }),
  livereload("viewer"),
)

export default config;
