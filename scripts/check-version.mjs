// Fails when the release tag, package.json, package-lock.json or the built bundle disagree on the version.
// Usage: node scripts/check-version.mjs [tag]   (tag e.g. v0.7.1, passed by the release workflow)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const { version } = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

assert.match(version, /^\d+\.\d+\.\d+$/, `package.json version "${version}" is not X.Y.Z`);
assert.equal(lock.version, version, "package-lock.json version differs, run `npm install`");
assert.equal(lock.packages[""].version, version, "package-lock.json version differs, run `npm install`");
assert.ok(
  read("dist/ha-mermaid.js").includes(`HA-MERMAID  %c v${version} `),
  `dist/ha-mermaid.js does not log v${version}, run \`npm run build\``
);

const tag = process.argv[2];
if (tag) assert.equal(tag, `v${version}`, `release tag ${tag} does not match package.json version ${version}`);

console.log(`version ${version} consistent${tag ? ` with tag ${tag}` : ""}`);
