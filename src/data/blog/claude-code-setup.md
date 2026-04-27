---
title: "488 → 85: reworking our CLAUDE.md"
description: "A retrospective on rethinking our Claude Code setup."
pubDate: 2026-04-27
tags: ["claude-code", "ai", "tooling"]
---

I feel fortunate to be working at a company that went all-in early on AI and coding agents. Claude was already part of the stack when I onboarded, back when the first Opus models dropped, and I've seen it improve and evolve all the way to Opus 4.5 (which felt like a pivotal moment for the industry).

We quickly realized the potential of skills (back when they were called commands) and automated some of our daily repetitive tasks. The biggest wins were probably the GitHub interactions, where we completely offloaded commits and PR creations to Claude. When listening to podcasts and reading blogs from various authoritative figures from the industry we realized that many other industry leading companies have very similar ways of interacting with these coding agents, which was very validating for us! Felt like we were really on top of our game given that the general atmosphere was "we are still figuring it out".

However, we were facing some issues, mainly with our CLAUDE.md that needed to be solved. We observed that sometimes Claude doesn't obey the rules / guidelines from the CLAUDE.md. There was no mystery to us that our CLAUDE.md is way too long...

We were constantly expanding it during development and code review process with all the new rules that would come up, which in and of itself is a great practice, you should treat these markdowns as source code, you monitor it and if it doesn't yield the behavior that you want you modify it, and make a conscious effort for keeping it up to date. But bloated CLAUDE.mds may cause Claude to ignore your actual instructions! If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost...

With some new concepts introduced to Claude I decided to give our Claude setup a fresh new haircut.

I read the Anthropic [docs](https://code.claude.com/docs/en/overview) extensively trying to figure out what the best setup is. Also read from other sources like the guys at [HumanLayer](https://www.humanlayer.dev/), with some more opinionated setups (some of them didn't deliver on their promises) but still was eye opening in some ways, for working with AI coding agents overall. Plus the [AI engineer](https://www.youtube.com/@aiDotEngineer) conference that was going on at the time offered some great insights into the world of coding agents and industry trends.

The mental model that has emerged from reading the Anthropic docs was the following:

Five mechanisms, each with a single job:

1. **CLAUDE.md**: always loaded at session start → reserve it for conventions that apply everywhere.

2. **rules**: are basically CLAUDE.md but split into smaller topic-scoped files. Each one can declare a path glob and only load when Claude actually touches a matching file.

3. **skills**: on-demand workflows where only the short description lives in context at startup, the body loads when Claude decides to use the skill.

4. **hooks**: aren't context at all, they are scripts that run on events. Like running Ruff after every edit, or blocking edits to generated files. Always run, don't eat token budget.

5. **MCP (and CLIs)**: the bridge to external systems - Notion, Slack, GitHub. For anything outside the repo, Claude reaches it through one of these.

## CLAUDE.md is a system prompt, not a readme

As I hinted at this in the beginning, CLAUDE.md is not a readme, it's not for humans. This will get injected into every context you work with so you really need to be economical when designing it, **you pay the token cost on every session** no matter what. You want stuff here you would need to have in every context you work with. Think of project-specific commands that Claude can't know / guess or infer, so reserve it for conventions that apply everywhere.

Everything else gets redirected into its more appropriate place based on the map above.

## Rules

CLAUDE.md may be broken down into multiple topic-scoped files, which only load when Claude touches a file matching the path glob, so your testing conventions don't pollute the context when you are working only on core domain logic for example.

## Skills

Skills were another big part of this migration as we wanted to migrate from old slash commands to the new skills structure. Skills are basically the same as the old commands and they remain backwards compatible as of now, but they offer some cool new stuff. Like a new directory structure which lets you bundle all kinds of references like scripts, templates, examples alongside the skill, only loaded on demand, keeping the context cheap.

Also it follows the YAML frontmatter style where in the frontmatter you are supposed to include all kinds of metadata about the skill which can determine its permissions to tools, its invocability, and its discoverability. You can read more about skills here, the docs have been proven very useful so I recommend you check them out, they even offer a guideline for creating skills which drove the whole migration.

A good note I find when writing skills is _don't teach Claude what it already knows_, you don't have to overly describe everything Claude prolly already knows this stuff, ask yourself: am I over-describing the situation here, or is this already common sense for Claude?

I guess an exception here is when you wanna persist certain commands Claude should use or in a way "cache" a workflow so Claude doesn't have to rediscover it again, actually that's the whole purpose of a skill, to have a recipe that is proven to work and reusing that.

## Hooks

I also introduced some hooks for actions that must happen. Here I tried to be reserved as we didn't want to have many hooks that always run, potentially hurting performance and user experience, but I found a few use cases where they provided value like formatting after edit or blocking edits to certain files like generated files or migrations.

## MCP

I also rethought how we interact with external systems. My experience and the industry echo have been that CLIs are the preferred way for agents to interact with external systems, so whenever a CLI is available I like to use that.

The reasoning isn't really "MCP eats your context window at startup", I read that a lot online (probably outdated info) Claude Code actually handles this pretty well now with on-demand MCP loading (you can see it if you run `/context`, MCP tools show up as "loaded on-demand", the full schemas only get pulled in when Claude actually reaches for them).

the real reasons are subtler:

- the model already knows the common CLIs from its training data - `git`, `gh`, `aws`, `docker` - and from what I've seen it handles custom CLIs pretty well too, it'll read `--help`, parse output, figure out flags. MCP's promise was to bring a standard protocol for LLMs to communicate with external systems which is still valid, but where CLIs exist the model can already use it pretty well
- CLIs also compose. You can pipe, filter and transform locally and only the final output hits the context. Chaining a bunch of MCP calls means each intermediate result goes through the model, burning tokens on data it doesn't actually need to see.

That said MCP earns its keep when there isn't a CLI (Notion for example, or some other SaaS products) or when the thing you are working with is stateful / auth-heavy and a CLI would be inconvenient to manage - Slack is a good example, which I'll get to in a bit.

We used to manage all our MCP connections within the repo with the MCP config, but during this initiative I found the concept of Claude connectors (you can think of this like managed MCP connections) - you don't have to configure the MCP in your repo, you just sign into Claude from the browser, connect with your credentials and it will be available in your Claude sessions. This is super nice because we were annoyed by the self-managed MCP connections as they would open a browser popup to authenticate each time you would open a new session. With the connectors this problem is solved as they stay authenticated across multiple sessions.

## Bonus: renaming trunk → main

The LLM's training data overly defaults to main, and since we used trunk we were paying a friction tax...The model would start with assuming main and would then fail and would have to retry (even after mentioning this in the CLAUDE.md sometimes we would still experience this friction) so we stopped fighting the model's training data and renamed trunk to main. (To my regret, I always found trunk much cooler than main.)

## Sharing skills across repos

There is one last thing that needed to be solved. We have a nice comfortable working setup in our main repo, but when working with other projects devs didn't have access to our skills as they were tied to 1 repo, this started to become very annoying so I started experimenting with a shared plugin which can be used across the company, that has all of our skills packaged.

I followed Anthropic's plugin + marketplace pattern. A separate repo that owns all the shareable skills. Its `.claude-plugin/marketplace.json` declares a plugin and lists each skill by path. Consumer repos add the marketplace once:

1. either through `extraKnownMarketplaces` in their committed `.claude/settings.json` (backend and frontend do this, so every dev gets prompted to trust it)
2. or manually via `/plugin marketplace add {org}/claude-code-plugins`.

After that, `/plugin install` wires the skills into that repo.

The bulk of the skills got moved into this shared repo while some project-specific skills remained tied to their own repository.

Updates ship by bumping metadata.version in `marketplace.json`; Claude Code uses that field to detect new versions.

## Post launch evolution aka. what I got wrong

**Composability gotcha.** `disable-model-invocation` dictates how these skills are invoked:

- if **true** you need to manually invoke the skill like `/commit` (has to be at the start!)
- if **false** Claude can pick it up automatically from natural language like: commit recent changes (will trigger `/commit` automatically)

I made some skills manually invokable (as it was recommended by the Anthropic docs, if skills cause mutations you should make them manually invokable) but this blocks skill-to-skill invocation. Our `/super-commit` (which commits + creates PR + shares PR to Slack channel) skill failed to invoke `/commit`. Also even if these skills cause mutations we found that we like to just reference them in the middle of the sentence, it made more sense to keep them auto-invokable.

Also after you make the skill auto-discoverable Claude will still ask for your permission to load it and use it, if you want even less friction you can list all the skills you want to allow under the permissions in your Claude [settings](https://code.claude.com/docs/en/settings#settings-files).

**The F401 (unused imports) loop.**
Claude typically edits in steps: add the import → write the code that uses it, two separate Edit tool calls. The Ruff lint hook was wired as `PostToolUse` on every `Edit/Write` - meaning it ran `ruff --fix` after each individual edit, not once the whole change was done.

So the sequence went:

1. Claude edits the file: adds import.
2. Hook fires. Ruff sees an import with no usage → `F401` → auto-removes it.
3. Claude's next edit referenced the import in the body. But the import line is gone (Claude's model of the file is now stale vs. what's on the disk).
4. Now Claude reads the file, notices the missing import, re-adds it (in some unlucky situations the hook would remove it again on the next turn if the usage somehow lands in a separate edit).

pretty unlucky... ignoring `F401` was the right fix (not "remove the hook"), so the other functionalities of the linter would still remain useful.

so the lesson is that any hook that mutates files during a session has to be safe against partial states.

**Multi-channel Slack support**

with skills now shared across repos, we were still missing routing the notifications to their respective Slack channel (sharing PRs for example) this was solved by a per-repo `env` in `.claude/settings.json`.

Claude Code lets each repo ship a committed `.claude/settings.json` with an `env` block, and it injects those vars into the tool process at session start (scoped to that project).

```json
// backend/.claude/settings.json
"env": { "SLACK_CHANNEL_ID": "<backend-channel-id>" }
```

```json
// frontend/.claude/settings.json
"env": { "SLACK_CHANNEL_ID": "<frontend-channel-id>" }
```

**The Slack MCP pivot.**

`/notify-slack-pr` shipped in a way where every dev on the team would have to manage their own personal Slack token for posting messages on their behalf which required extra config on the user part and arguably wasn't the most secure option. I looked into ways for solving this and saw there were a few options:

1. use the native Slack MCP, which isn't super ideal because it works the same way our previous self-managed MCP connections did, it prompts you each time you open a session to authenticate
2. there are the Claude connectors which I referenced earlier, Claude-managed MCP connections, they are nicer because once you set it up they will stay connected across sessions
3. keep doing the same API call with the user token - no Claude mention in the messages but you have to manage your own token

Note that options 1 and 2 will both append "Sent using @Claude" after the message - not super ideal but it is what it is.\
All in all connectors seemed to be the way to go so I went with them, working pretty well so far.\
One more caveat: the Slack MCP won't allow you to send messages to a channel that has external users outside of your org (a Slack Connect).

## In the end

our CLAUDE.md went from 488 → ~85 lines (83% reduction) and everything else got moved to rules and hooks. We are happy so far with the change and have been seeing good results from it. It helps tremendously automating our daily work with git, interacting with Notion, creating and analyzing tickets, sending Slack messages - it's baked into the whole web of daily tasks. \
But this is still very much a living system - we are constantly bringing improvements to it.
