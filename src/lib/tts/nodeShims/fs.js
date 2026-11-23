/**
 * Browser stub for the Node `fs` module.
 *
 * The Piper phonemizer ships an Emscripten build that still contains its
 * Node-only branches (`ENVIRONMENT_IS_NODE` -> `require("fs")`). Those never
 * run in a worker, but the bundler still resolves the import, so it needs a
 * target.
 */
export function readFile() {
  throw new Error("[piper] fs.readFile is not available in the browser");
}

export function readFileSync() {
  throw new Error("[piper] fs.readFileSync is not available in the browser");
}

const fsShim = { readFile, readFileSync };
export default fsShim;