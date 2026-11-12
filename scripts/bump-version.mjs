#!/usr/bin/env node
// Bumps the version declared in .harness.json and prints the new version.
// Usage: node scripts/bump-version.mjs [--bump <type>] [--preid <id>] [--version <explicit>]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function parse(version) {
  const core = version.includes("-") ? version.slice(0, version.indexOf("-")) : version;
  const pre = version.includes("-") ? version.slice(version.indexOf("-") + 1) : "";
  const parts = core.split(".").map((part) => parseInt(part, 10) || 0);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    pre,
  };
}

function nextPre(pre, preid) {
  const pieces = pre.split(".");
  if (pieces[0] !== preid) return `${preid}.0`;
  const number = parseInt(pieces[pieces.length - 1], 10);
  if (Number.isNaN(number)) return `${preid}.0`;
  return `${preid}.${number + 1}`;
}

function nextVersion(current, bump, preid) {
  const { major, minor, patch, pre } = parse(current);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "premajor":
      return `${major + 1}.0.0-${nextPre("", preid)}`;
    case "preminor":
      return `${major}.${minor + 1}.0-${nextPre("", preid)}`;
    case "prepatch":
      return `${major}.${minor}.${patch + 1}-${nextPre("", preid)}`;
    case "prerelease":
      return pre
        ? `${major}.${minor}.${patch}-${nextPre(pre, preid)}`
        : `${major}.${minor}.${patch + 1}-${nextPre("", preid)}`;
    default:
      console.error(`Unknown bump type: ${bump}`);
      process.exit(1);
  }
}

function getPath(object, pointer) {
  return pointer.split(".").reduce((value, key) => (value == null ? value : value[key]), object);
}

function setPath(object, pointer, value) {
  const keys = pointer.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => {
    if (typeof current[key] !== "object" || current[key] === null) current[key] = {};
    return current[key];
  }, object);
  target[last] = value;
}

const configPath = join(ROOT, ".harness.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const file = config.version?.file;
const pointer = config.version?.pointer;
if (!file || !pointer) {
  console.error(".harness.json does not declare version.file and version.pointer");
  process.exit(1);
}

const filePath = join(ROOT, file);
let current = "";
if (file.endsWith(".json")) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  current = String(getPath(parsed, pointer) ?? "");
} else {
  const pattern = new RegExp(`^(\\s*${pointer}\\s*[=:]\\s*)["']?([^"'\\n]+)["']?\\s*$`, "m");
  const match = readFileSync(filePath, "utf8").match(pattern);
  current = match ? match[2].trim() : "";
}
if (!current) {
  console.error(`Could not read version field "${pointer}" from ${file}`);
  process.exit(1);
}

const explicit = arg("--version");
const bump = arg("--bump", "patch");
const preid = arg("--preid", "alpha");
const next = explicit ? explicit.replace(/^v/, "") : nextVersion(current, bump, preid);

if (file.endsWith(".json")) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  setPath(parsed, pointer, next);
  writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
} else {
  const pattern = new RegExp(`^(\\s*${pointer}\\s*[=:]\\s*)["']?([^"'\\n]+)["']?\\s*$`, "m");
  const updated = readFileSync(filePath, "utf8").replace(pattern, (_, prefix) => `${prefix}${next}`);
  writeFileSync(filePath, updated);
}

process.stdout.write(`${next}\n`);
