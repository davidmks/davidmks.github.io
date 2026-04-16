---
title: "I let Claude refactor our test suite (it mostly worked)"
description: "A week-long experiment refactoring our entire test suite with a coding agent."
pubDate: 2026-04-16
tags: ["testing", "ai", "python", "refactoring"]
---

Recently I did my largest agent-enhanced refactoring on our whole pytest unit test suite (~700 unit test files). It was an interesting enough experience that I wanted to share my learnings from it.

## The tech debt

To start, we have a pretty strong testing culture at LIZY. We heavily use hexagonal architecture and DI, which helps testing tremendously and encourages a strong pattern to follow.

We prefer fakes over mocks in our applications layer tests - every real implementation gets swapped in with an in-memory fake that implements the full domain protocol, meaning tests exercise real behavior paths, not just call checks (for negative path tests, mocks are still the way to go, it's where they shine). We use various data builders that generate objects with sensible defaults. We also use VCR for our integration tests, which records HTTP requests and replays them for subsequent test runs, making them faster and possible to run offline. And we follow the recommended pyramid structure where most tests are unit, then integration, then e2e.

That said, we were facing some tech debt with the way we built our test data and wired it into our services.

First, we enforced fixtures for stateless data builders, which just added extra ceremony for no real benefit. You need to return a closure if you want a custom way of calling them, plus every test must declare it in its signature. We were constantly fighting Claude's training data on it and it was a headache to enforce it during reviews - it even got to a point where we introduced a CI check for it, but in the end it truly wasn't worth it - it provided no real benefit. If it has no setup, no teardown, no shared state: a plain function is good enough.

Second, our services in tests were tightly coupled with data, which was getting increasingly hard to maintain. A factory would build the service and stuff data into the fakes, returning positional tuples, then tests would need to destructure this to assert on internal state. Plus, coupling test data with these factories made them harder to reuse. All of this wiring and setup was pretty ad-hoc. There was no clear convention for service setups and asserting on internal state, and the code that would get generated mostly differed from ours, which again was a burden during code review.

So we'd been discussing a standard that's easy to follow, with less ceremony, and that aligns with pytest best practices. We put together an ADR (Architecture Decision Record) which followed these principles:

- Fixtures for lifecycle management only (mocker, db, tmp_path)
- Plain factory functions for wiring the service with its fake implementations
- Direct usage of [Polyfactory](https://github.com/litestar-org/polyfactory) builders for test data
- Explicit injection for fakes that we later assert on

That ADR became the source of truth, driving the refactor.

## The refactor

Since it looked mostly like mechanical work (less cognitive), we decided to do it in one go and let the agent do the work mostly autonomously. I'd heard and read so many case studies about agents doing large refactors overnight with great success - I had to see this hands-on. (This was also my first significant refactor using coding agents, though I do use them regularly in my daily work.)

I started by defining the testing rules as Claude [rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/) and pointed the agent at the ADR.

It turned out to be more tedious than expected…

The main blocker was Claude tokens - I was constantly hitting usage limits from such a large scope (which I hadn't hit before, even with multiple sessions running in parallel). My guess is that with such a large scope, every small thing becomes costly: reading full files, running a git diff, etc. (later, a colleague pointed me to a [similar issue](https://github.com/anthropics/claude-code/issues/38335) the community was experiencing)

I got around this in two ways:

- For mechanical work (e.g. find-replace, rename) or anything deterministic, I encouraged Claude to write a script for the modification rather than doing it itself.
- Batching my work so it doesn't interfere with my daily work and responsibilities, running jobs outside of working hours (small ones frequently) to avoid running out of tokens for the day.

The bulk of the mechanical transformations was right, but some corrections had to be made for misplaced imports or any incorrect state the scripts left after themselves - although these were caught by our linters and quality checks so Claude could iterate on them quickly and clean up after its own mess.

Most of the edits during this refactor, in my experience, still required reading the diff carefully to quality-check the agent's work, so some guidance was still necessary unfortunately - but after steering it in the right direction, it did most of the changes as expected.

## Learnings

Super important - and I knew this already, but can't highlight it enough: don't use subagents for write tasks. They can eat up lots of tokens without your supervision and might come back with work that's incorrect, and you are forced to redo it because they can't be stopped like the main agent. Even if you interrupt one, the other subagents will continue - you have no reliable way of controlling them. You're much better off doing everything in the main agent, steering it until you're confident in the direction, then letting it run on auto-accept if you really want to. Only consider subagents for read-only tasks (similar to how Claude's native explore agents work).

I'm also a big advocate for plan mode. It feels like it yields better results. The initial token investment might be larger as it does exploration, but it helps the agent gather all the info upfront and follow the plan consistently. Without it, Claude can circle back a few times, which can end up being more costly than the initial exploration. Not a silver bullet, but it brings structure to a problem. I found it helped to split the problem into smaller chunks and run those in parallel with plan mode.

I was strategic about doing most of this work around the holidays (when fewer PRs were being published), but keeping a large branch in sync with main was pretty difficult. It was stressful for me, and I imagine it wasn't ideal for the reviewers either. It's a tradeoff we made because we didn't want to end up in an inconsistent state, and the refactor seemed largely mechanical and straightforward, but be cautious with these large PRs.

Nevertheless, I'm happy I did it. The refactor removed ~7,000 lines of test infrastructure and took roughly a full week, working on it "on the side" between other work and dead zones between Claude sessions. I'm grateful for these tools that allow us to be much more daring when it comes to refactors, or following up on ideas, or building tooling that would otherwise take ages and get backlogged as not worth the investment.

The overall win here is that we can be much more trigger-happy when solving tech debt - and that's a big win in my book.
