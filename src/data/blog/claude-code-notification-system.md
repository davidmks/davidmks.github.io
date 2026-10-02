---
title: "How I built a herdr-style notification system in tmux"
description: "TODO"
pubDate: 2026-09-30
tags: ["claude-code", "tmux", "macos", "tooling"]
---

I've been introduced to [herdr](https://herdr.dev/), a terminal multiplexer with native AI agent support. Much like tmux, but built around managing, monitoring, and delegating tasks to AI agents.

It's a neat tool. The UX is intuitive, and the problem it solves is very relevant right now. I can see the appeal. However, I'm still a happy tmux user. It's established, it's simple, it's minimal out of the box and it's already the foundation of my setup.

I approach my setup with a lot of intention and have spent significant time perfecting my workflow. Right now I'm super happy with what I got and how I flow.

That said, I really enjoyed the notification system that herdr has and the section that lists all the agents with their statuses, I found it super useful and inspired me to build something similar in tmux.

Here is what I built:

<!-- demo video: not ready yet -->

I'll start with the overview of the system where you can see all the components involved then will do a deep dive into each aspect.

<a href="/blog/claude-code-notification-system/diagram-light.png" class="img-light"><img src="/blog/claude-code-notification-system/diagram-light.png" alt="Diagram of the notification system: Claude Code sends hook events to agent-state.sh, which stores agent state in tmux pane options, sends or removes macOS banners, and handles jump and seen from the banner, Raycast and tmux key binds." /></a>
<a href="/blog/claude-code-notification-system/diagram-dark.png" class="img-dark"><img src="/blog/claude-code-notification-system/diagram-dark.png" alt="Diagram of the notification system: Claude Code sends hook events to agent-state.sh, which stores agent state in tmux pane options, sends or removes macOS banners, and handles jump and seen from the banner, Raycast and tmux key binds." /></a>

## Claude hooks

The first building block is Claude hooks. With hooks you can define custom shell commands (or other entry points like HTTP endpoints, MCP tools) that run on events that Claude fires during its life cycle.

1. You register the hook in the `settings.json`. The config has three levels of nesting:
	1. event: when to run.
	2. matcher group: an optional filter.
	3. handlers: what to run.

	You can find more about what each hook means and how they fire in the [docs](https://code.claude.com/docs/en/hooks).

2. Claude Code sends the hook a JSON object on stdin. Every payload includes context about the event, and the structure varies by event.
3. The hooks return with an exit code which tells Claude what the hook has decided.
   - 0 means "success"
   - 2 means "block" (if you want to stop Claude from doing an action)

## The shell handler

The script has a few subcommands:
- `hook` → for Claude: it routes the events to their handler
- `status` → for tmux: reads the agent statuses
- `jump` → for tmux, Raycast and the banner: jumps to a pane and marks it "seen"
- `seen` → marks a pane seen without using the jump command (regular navigation)

tmux sets the variable `$TMUX_PANE` for every program that runs inside a pane. Claude runs in a pane, and so does the hook, so this variable tells the script which pane the agent lives in.

tmux also lets you set your own user options. These are properties that start with @, and you can attach them to a pane. The script relies on these for the agent's pane:

- `@agent_state`: one of working, blocked, done, idle.
- `@agent_since`: when that state started, in epoch seconds (seconds since 1970, from `date +%s`).

So tmux serves as a database for storing the agents' states in this case.

## Event handling

The router in the shell script reads the JSON event:

1. `cat` reads the whole JSON from stdin
2. `jq` then pulls out `hook_event_name`
3. It routes the event to its handler

**on_working**

Events: `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`

1. It reads the current `@agent_state`
2. If the state is already working, it stops (the events fire on every tool call, so this skips pointless writes).
3. Otherwise it sets the state to working
4. If the state was blocked or done, it also removes that pane's notification

**on_stop**

Events: `Stop`, `StopFailure`

1. It checks whether you are looking at the agent. Two conditions need to be true:
	1. tmux says this pane is the active pane
	2. Ghostty is the frontmost app in macOS
2. If you are looking: it sets the state to idle and stops there. You already see the result, so there is no notification.
3. If you are not looking: it builds a message.
4. It sets the state to done and calls notify.

**on_blocked**

Event: `Notification`

1. It always sets the state to blocked, even if you are looking at the pane
2. If you are not looking, it calls notify with Claude's own message from the JSON

This path differs from **on_stop**, which never marks the pane when you are watching. A blocked agent still needs an answer from you, so the mark stays until the agent runs again.

**on_session_end**

Event: `SessionEnd`

1. Removes both user options from the pane
2. Removes the pane's banner

After that the pane looks like no agent ran on it.

## Notification

The banner is one `terminal-notifier` command and has these components:

1. **title**: Claude Code sets a descriptive title for its session which comes in handy (it falls back to the session window name)
2. **message**: I split the reply Claude sends to be short and simple since you don't have much real estate on the banner:
	1. If it ends with a question it prints the question
	2. Otherwise uses the first sentence of the reply
3. **group ID**: Every pane gets its own ID, so:
	1. Each pane has at most one banner. A new one replaces the old one
	2. You can remove that pane's banner later with the ID
4. **click**: `-activate` and `-execute`. Both run only when you click the banner:
	1. **activate**: Brings your terminal to the front.
	2. **execute**: Runs the script's `jump` subcommand for the pane.

Besides the banner there are two **status markers** that provide notification even if you don't want to use / rely on banners. They can get annoying fast so I wanted something more zen I can fall back to if they start to get on my nerves.

Both read the `@agent_state` user option that the hooks write. They mark:

1. ● before a window: windows in this session with a waiting agent
2. ● N | on the right side of the status bar: how many agents wait in other sessions

"Waiting" means the state is blocked or done.

This is all achieved by reading the `@agent_state` user option on the tmux panes and configuration in the `.tmux.conf`.

How they update:

- ● before a window: it uses its state so it refreshes on every state change
- ● N | on the right side of the status bar: tmux runs the `status` subcommand every 5 seconds to count the waiting agents and it updates the marker

## Navigation

There are four ways to get to an agent. All of them use the same `jump` subcommand.

1. Click the banner: jumps to a specific pane
2. `prefix + A`: jumps to the oldest waiting agent (from tmux)
3. `prefix + a`: a picker, then jumps to the selected agent
4. Raycast hotkey: jumps to the oldest waiting agent (from any application)

Prefix is your tmux prefix key, Ctrl-b by default.

**jump**

The `jump` subcommand takes one optional argument, a tmux target. A target is a session, window, or pane.

1. Picks the pane
	1. With a target, it asks tmux for that target's pane ID.
	2. Without one, it picks the agent waiting for the longest time
2. If there is no pane, it prints "No agents waiting".
3. Switches to the pane. It runs three tmux commands:
	1. `switch-client` moves your terminal to the pane's session.
	2. `select-window` opens its window.
	3. `select-pane` focuses the pane.
4. Marks the pane seen.

To pick the agent that waited the longest, we use the same user options:

1. List every pane in every session with its `@agent_state`, `@agent_since`, and pane ID.
2. Keep only blocked and done panes, and rank blocked first.
3. Sort by `@agent_since`, oldest first.
4. Return the pane.

For the picker I chose to use tmux's built-in `choose-tree`, the same tree picker you get when you run `prefix + s` to list the sessions (or `prefix + w` for windows). I only changed what it shows and runs:

1. Filters on @agent_state, so it only lists panes with an agent
2. Shows a line for each agent: its state, when that state started, and the title Claude set for the session
3. When you pick an agent, tmux runs the `jump` subcommand with the target you selected

To mark the pane seen:

- If the pane is done: it sets the state to idle and removes the banner because you have seen the result now
- If the pane is blocked: it only removes the banner and the state stays blocked until you answer.

## Wrapping up

That's the whole thing. A few Claude hooks, a shell script and some tmux configurations. 
If this inspires you and you want to build something on your own, the script and config are in my [dotfiles](https://github.com/davidmks/dotfiles). 


