/**
 * Browser stub for the Node `path` module — see `./fs.js`.
 * Only the entry points the Emscripten glue touches are present, and all of
 * them are unreachable in a browser.
 */
export function normalize(value) {
  return String(value ?? "");
}

export function dirname(value) {
  const index = String(value).lastIndexOf("/");
  return index <= 0 ? "/" : String(value).slice(0, index);
}

export function join(...parts) {
  return parts.filter(Boolean).join("/");
}

const pathShim = { normalize, dirname, join };
export default pathShim;