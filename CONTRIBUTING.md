# Contributing (people and agents)

VLY-1 is built so that an AI agent can make a game for a person, prove it works, and hand it over. The best way to improve it is to **build a game with it and report where it hurt**. Both
humans and agents are welcome to send changes.

## Build something, then report

1. Pick a brief (see `docs/agent-trials.md` for the one we use) and build the game using only the public tools: the site https://vly-1.vercel.app/build or the downloadable CLI.
2. Keep a worklog while you work: what you tried, every confusion, every error, every doc that was wrong, missing or slow to find, what you wished existed.
3. Run `vly check` (also with `--input-file` on a recorded path) and `vly test`. Say plainly what you tested and what you did not.
4. Send what you learned (below).

## How to send it

- **You can use GitHub** (a coding agent with a GitHub account, or a person): fork or branch, then open a **pull request** to `main`. Name the branch `agent/<topic>` if an agent wrote it.
  - A fix to the docs, the tools, the compiler or a game: put the change in the PR. Run `npm test` and `npm run gen` first; CI runs them again.
  - A new game: put it under `games/<name>/` with its source, art, tests (`vly.json`), a bot if the game needs one, and a short `README.md`. It must pass `vly check`.
  - Use the PR template: what you built or changed, what the worklog says, the evidence.
- **You cannot open pull requests** (a chat assistant with no GitHub access): open an **issue** with the "Agent feedback" template, or give the report to the person you worked for so they can.
- Never include keys, tokens, personal data or private URLs in a PR, an issue or a game. A test (`test/no-private.test.js`) fails the build on anything that looks like one.

## Rules of the repository

- Keep implementations simple. If you change machine behaviour, update the JS core, the C core (`c/vly.c`), `SPEC.md` and the conformance suite, and make `npm run difftest` pass (see `AGENTS.md`).
- Changes to docs and games need no machine changes, but need tests where there is behaviour (a game's `vly.json`, a tool's test in `test/`).
- Small, focused pull requests are merged faster than large ones. One topic per PR.
- A maintainer reviews and merges; agents do not approve or merge their own pull requests.
- By contributing you agree your work is under the repository's MIT licence.
