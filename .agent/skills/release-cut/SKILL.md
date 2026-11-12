---
name: Release cut
description: Trigger the Release workflow, watch it, and verify the tag, release notes and attached artifacts. Use when the user asks to cut, publish or ship a release.
---

# Release cut

Cut a release through the project's GitHub Actions workflow. Never create tags or
releases by hand.

## 1. Read the policy

Read `AGENTS.md` and `.harness.json`. Confirm:

- the release trigger is `workflow_dispatch` in `.github/workflows/release.yml`;
- the version source (`tags` or `file`);
- whether build artifacts are attached;
- the current branch and whether it is clean.

If the working tree is dirty, stop and ask whether to commit first.

## 2. Ask for the release inputs

Ask the user, in one round:

1. bump type: `patch` (default), `minor`, `major`, or a pre-release type
   (`prerelease`, `premajor`, `preminor`, `prepatch`);
2. pre-release identifier when a pre-release type is chosen (default `alpha`);
3. an explicit version, if the user prefers one (overrides the bump type);
4. a short release summary, used in the notes title.

## 3. Dispatch

```bash
gh workflow run release.yml \
  -f bump=<bump> \
  -f preid=<preid> \
  -f version="<explicit-version-or-empty>" \
  -f summary="<summary>"
```

Wait a moment, then find the run:

```bash
gh run list --workflow release.yml --limit 1
```

Watch it to completion:

```bash
gh run watch <run-id> --exit-status
```

## 4. Verify

```bash
git fetch --tags
gh release view <tag>
gh release view <tag> --json tagName,isPrerelease,assets
```

Confirm:

- the tag matches `vX.Y.Z` and was created from the intended commit;
- the release notes are not empty and match `docs/RELEASE_TEMPLATE.md`;
- the version contains `-` if and only if the release is a pre-release;
- the expected artifacts are attached when `attachArtifacts` is true;
- the version file matches the tag when the version source is `file`.

## 5. Report

Report the tag, the release URL, the commit, the prerelease flag, the artifact
list and the run result.

## On failure

- Read the failing job log: `gh run view <run-id> --log-failed`.
- Report the cause and stop.
- Never move, delete or reuse a tag that already exists. If the tag is wrong,
  cut a new patch release with the fix.
- Never force-push to fix a release.
