import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-paths-loader.mjs", pathToFileURL(import.meta.filename));