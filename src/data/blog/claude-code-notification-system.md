---
title: "How I built a herdr-style notification system in tmux"
description: "I liked herdr's agent notifications but didn't want to leave tmux, so I built something similar."
pubDate: 2026-10-11
tags: ["claude-code", "tmux", "macos", "tooling"]
---

I've been introduced to [herdr](https://herdr.dev/), a terminal multiplexer with native AI agent support. Much like tmux, but built around managing and monitoring AI agents.

It's a neat tool. The UX is intuitive, and the problem it solves is highly relevant right now. I can see the appeal. However, I'm still a happy tmux user. It's established, it's simple, it's minimal out of the box and it's already the foundation of my setup.

I approach my setup with a lot of intention and have spent significant time perfecting my workflow. Right now I'm super happy with what I got and how I move.

That said, I really enjoyed the notification system that herdr has, especially the section that lists all the agents with their statuses. I found it super useful and it inspired me to build something similar in tmux.

Here is what I built:

<video src="/blog/claude-code-notification-system/demo.mp4" controls muted playsinline preload="metadata"></video>

I'll start with the overview of the system where you can see all the components involved, then I'll go into each part.

<a href="/blog/claude-code-notification-system/diagram-light.png" class="img-light"><img src="/blog/claude-code-notification-system/diagram-light.png" alt="Diagram of the notification system: Claude Code sends hook events to agent-state.sh, which stores agent state in tmux pane options, sends or removes macOS banners, and handles jump and seen from the banner, Raycast and tmux key binds." /></a>
<a href="/blog/claude-code-notification-system/diagram-dark.png" class="img-dark"><img src="/blog/claude-code-notification-system/diagram-dark.png" alt="Diagram of the notification system: Claude Code sends hook events to agent-state.sh, which stores agent state in tmux pane options, sends or removes macOS banners, and handles jump and seen from the banner, Raycast and tmux key binds." /></a>

## Claude hooks

Claude hooks are the foundation of the system. With them you can define custom shell commands (or other entry points like HTTP endpoints, MCP tools) that run on events that Claude fires during its life cycle.

1. You register the hook in the `settings.json`. The config has three levels:
	1. event: when to run.
	2. matcher group: an optional filter.
	3. handlers: what to run.

	Find more about what each hook means and how they fire in the [docs](https://code.claude.com/docs/en/hooks).

2. Claude Code sends the hook a JSON object. Every payload includes context about the event and the structure varies by event.
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

- `@agent_state`: working, blocked, done, idle.
- `@agent_since`: when that state started

So tmux serves as a database for storing the agents' states in this case.

## Event handling

The router in the shell script reads the JSON event and routes the event to its handler.
- `on_working` → sets the state to **working**
- `on_stop` → sets the state to **done** and notifies you if you are not looking, or to **idle** if you are looking, skipping the notification
- `on_blocked` → sets the state to **blocked** either way and notifies you if you are not looking
- `on_session_end` → removes the user options from the pane

## Notification

The banner is one `terminal-notifier` command and has these components:

1. **title**: Claude Code sets a descriptive title for its session which is perfect to use (it falls back to the session window name)
2. **message**: I split the reply Claude sends to be short and simple since you don't have much real estate on the banner:
	1. If it ends with a question it prints the question
	2. Otherwise uses the first sentence of the reply
3. **group ID**: Every pane gets its own ID, so:
	1. Each pane has at most one banner. A new one replaces the old one
	2. You can remove that pane's banner later with the ID
4. **click**: `-activate` and `-execute`. Both run only when you click the banner:
	1. **activate**: Brings your terminal to the front.
	2. **execute**: Runs the script's `jump` subcommand for the pane.

Besides the banner there are two **status markers** that provide notification even if you don't want to use or rely on banners. They can get annoying fast so I wanted something more zen to fall back on if they start to get on my nerves.

Both read the `@agent_state` user option that the hooks write. They mark:

1. ● before a window in the current session with a waiting agent
2. ● N | on the right side of the status bar signaling how many agents wait in other sessions

"Waiting" means the state is blocked or done.

This is all done in the tmux configuration `.tmux.conf` by reading the `@agent_state` user option:
- ● before a window uses its state so it refreshes on every state change
- ● N | on the right side of the status bar uses the `status` subcommand every 5 seconds to count the waiting agents and it updates the marker

## Navigation

There are four ways to get to an agent. All of them use the same `jump` subcommand.
1. Click the banner: jumps to a specific pane
2. `prefix + A`: jumps to the oldest waiting agent (from tmux)
3. `prefix + a`: a picker, then jumps to the selected agent
4. Raycast hotkey: jumps to the oldest waiting agent (from any application)

"prefix" is your tmux prefix key, Ctrl-b by default.

**jump**

The `jump` subcommand takes you to a target session, window, or pane. If there is no target it takes you to the agent that waited the longest. To pick the agent that waited the longest, I use the same user options: `@agent_state`, `@agent_since`.

For the picker I chose to use tmux's built-in `choose-tree`, the same tree picker you get when you run `prefix + s` to list the sessions (or `prefix + w` for windows). I only changed what it shows and runs:
1. Filters on `@agent_state`, so it only lists panes with an agent
2. Shows a line for each agent: its state, when that state started, and the title Claude set for the session
3. When you pick an agent, tmux runs the `jump` subcommand with the target you selected

## Wrapping up

That's the whole thing. A few Claude hooks, a shell script and some tmux configurations.
If this inspires you and you want to build something on your own, the script and config are in my [dotfiles](https://github.com/davidmks/dotfiles).
