#!/usr/bin/env node
// Generates release notes from Conventional Commits using docs/RELEASE_TEMPLATE.md.
// Usage: node scripts/release-notes.mjs [--from <ref>] [--to <ref>] [--version <v>] [--out <file>] [--summary <text>]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function readConfig() {
  const path = join(ROOT, ".harness.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

function shortHashRef(hash) {
  return hash ? ` [${hash}]` : "";
}

const config = readConfig();
const templatePath = join(ROOT, config.release?.template ?? "docs/RELEASE_TEMPLATE.md");
if (!existsSync(templatePath)) {
  console.error(`Release template not found: ${templatePath}`);
  process.exit(1);
}

let from = arg("--from");
if (from === null) {
  try {
    from = git(["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  } catch {
    from = "";
  }
}
const to = arg("--to", "HEAD");
const outFile = arg("--out");
const summary = process.env.SUMMARY || arg("--summary", "");
const version = arg("--version", process.env.VERSION || "");
const date = arg("--date", new Date().toISOString().slice(0, 10));

const range = from ? `${from}..${to}` : to;
let entries = [];
try {
  entries = git(["log", "--no-merges", "--pretty=format:%h%x09%s", range])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      if (tab === -1) return { hash: "", subject: line };
      return { hash: line.slice(0, tab), subject: line.slice(tab + 1) };
    });
} catch (error) {
  console.error(`Failed to read git history for "${range}": ${error.message}`);
  process.exit(1);
}

const groups = { features: [], fixes: [], chores: [], other: [] };
for (const entry of entries) {
  const subject = entry.subject;
  if (/^chore\(release\)/i.test(subject)) continue;
  const ref = shortHashRef(entry.hash);
  const match = subject.match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/);
  if (!match) {
    groups.other.push(`${subject}${ref}`);
    continue;
  }
  const type = match[1].toLowerCase();
  const text = match[3];
  if (type === "feat") {
    groups.features.push(`${text}${ref}`);
  } else if (type === "fix") {
    groups.fixes.push(`${text}${ref}`);
  } else if (
    ["refactor", "chore", "docs", "style", "perf", "test", "build", "ci"].includes(type)
  ) {
    groups.chores.push(`${type}: ${text}${ref}`);
  } else {
    groups.other.push(`${subject}${ref}`);
  }
}

function bullets(list) {
  return list.length ? list.map((item) => `- ${item}`).join("\n") : "- None";
}

const template = readFileSync(templatePath, "utf8");
const notes = template
  .replace(/\{version\}/g, version)
  .replace(/\{date\}/g, date)
  .replace(/\{summary\}/g, summary || (version ? `Release v${version}.` : "Release."))
  .replace(/\{from\}/g, from || "(first release)")
  .replace(/\{features\}/g, bullets(groups.features))
  .replace(/\{fixes\}/g, bullets(groups.fixes))
  .replace(/\{chores\}/g, bullets(groups.chores))
  .replace(/\{other\}/g, bullets(groups.other));

if (outFile) {
  writeFileSync(join(ROOT, outFile), notes);
} else {
  process.stdout.write(notes);
}
