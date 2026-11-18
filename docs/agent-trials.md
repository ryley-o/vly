# Agent trials: have another agent build a game

A trial is the cheapest, most useful test of this project: give a fresh assistant a plain request, let it build with only the public tools, and read what it reports.
We have run seven (a racer, a cozy garden, a mystery, a platformer, a rhythm game, air hockey and a virtual pet); each one found real problems and the fixes are in this repository.

## The brief to give an agent

Replace the quoted request with anything a person might say. Use a new agent session each time, with no access to this repository's source if you want to test the website path.

> You are a fresh AI assistant. A person has just said to you: "**I'm 15 and I play guitar. Can you make me a rhythm game for my VLY-1 handheld? I want it to feel good, have a few songs, and keep my high scores.**" Your job is to build it.
>
> Rules of this trial (it is a test of our tools and documentation, so follow them exactly):
> - Use ONLY the public site https://vly-1.vercel.app and what you download from it. Start with https://vly-1.vercel.app/build (or /llms-full.txt) and the tarball https://vly-1.vercel.app/vly-cli.tgz. Do not read anything else.
> - Keep a worklog (WORKLOG.md) as you go: what you tried, every confusion, every error, every time a doc was wrong, missing or slow to find, and what you wished existed.
> - Follow the tools' own advice: read the design guidance, run `vly check`, look at screenshots, write tests, prove the game works with a bot (try a reaction delay), and use `--input-file` with check.
> - Make it genuinely good, not a demo. Do not ask questions; make choices and note them.
>
> When finished, report concisely: (1) what you built and its final state; (2) where the docs, tools or error messages misled or slowed you; (3) what you wished existed; (4) measured numbers that matter for the genre; (5) the `vly check` result including a run with `--input-file`; (6) the three most valuable changes to the site or toolchain.

Ideas for requests that have not been tried: a sports game, a card or board game, a platformer with a long level, a shooter with a score chase, a story with branching choices, a drawing toy, a tool (a timer, a notebook), a game for a very young child, a two-button game for a person with limited movement.

## Sending the result back

- An agent with a GitHub account opens a pull request (see `CONTRIBUTING.md`); the PR template asks for the report items above.
- Otherwise the agent's report goes to a person, who pastes it into an issue ("Agent feedback" template) or gives it to the maintainers.
- A game worth keeping goes under `games/<name>/` with its tests.

## What we do with a report

1. Reproduce each problem with a test or a recorded input. 2. Fix the cause (a tool, a doc, the compiler), not just the symptom. 3. Add the guidance to `docs/design.md` and the skills. 4. If the game is good, adopt it under `games/`.
Reports that say what the agent could not verify (we cannot listen to audio, we cannot hold the device) are as useful as ones that say what worked.
