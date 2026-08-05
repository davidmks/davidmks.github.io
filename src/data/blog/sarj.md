---
title: "My first open source tool, sarj: a worktree + tmux session manager"
description: "The problems I kept hitting with git worktrees, and how I fixed them gradually until I ended up with sarj."
pubDate: 2026-03-25
tags: ["git", "worktrees", "tmux", "tooling", "cli"]
---

## Intro

Coding agents have changed how I branch. I now have adopted using worktrees exclusively, instead of branching in one directory.

### What's a worktree

For those of you not familiar with worktrees they are a git native feature used for branching but with more isolation. It's a separate working directory linked to the same repo sharing the same git data. (Think of it as cloning your repo again, but instead of duplicating the .git folder, the worktree is attached to the main repository).

This is super useful for agents because you can parallelise your work without them conflicting with each other. Each session gets its own worktree so one agent's edit (or any of its processes) doesn't interfere with the other's.

### Where worktrees get painful

This sounds good but worktrees come with their own set of challenges.

1. They are pretty hard to manage. Creating / deleting them can be tedious.
2. You need to reinstall all your project dependencies when entering a new worktree.
3. Files that are gitignored won’t be transferred, so if you need them, you’ll have to symlink them.

## Journey

I have been tackling all these downsides gradually throughout my journey of using worktrees.

### One command away from setup

First it comes in very handy if your project has an entry point for its full setup. This is a good idea in general: your project should be one command away from its full setup (installing all of your dependencies and activating sessions or whatever you might need for your project to be ready to go). This helps new devs and it's just super ergonomic. Plus it specifically shines in this scenario.

### Reusable worktrees

Secondly to solve the friction for managing these worktrees I attempted to create just a few "reusable" worktrees. Meaning having a few generic ones with generic naming laying around and reusing them. This quickly became unsustainable, first you are limited to a number of worktrees / things to work on and you also quickly lose track for which worktrees were used for what feature.

### One worktree per feature

At this point I thought it would be nicer if I'd create a worktree per feature, similarly to how you do it with branches. I created a shell script that creates these worktrees within our repo and one that cleans them up.
The scripts:

1. created the worktrees
2. installed the deps (with the setup script)
3. deleted the ones that are not used anymore

These became utility scripts shared within our work repo.

### Automating the dev environment

This was a pretty solid setup and did its job for a while but I thought I could still make this better. Apart from creating the worktrees, installing the deps, would be even cooler if it could set up my whole development environment: in my case meaning opening tmux with a layout that I prefer and spawn me inside of it.

This started off as a personal shell setup that worked for me. It basically hydrated tmux, ran the scripts and landed me into a state I otherwise had to build manually each time I started a new worktree.

### Sharing it

Some colleagues showed interest in this setup and I shared with them the process of how I got to it so they can mold it to their needs. But since there was interest shown I took it as an opportunity to take this further. By aggregating all these learnings and building it into a tool that is fully configurable and portable. Meaning you could configure your tmux layout to your own preference and it works for any project you set it up for.

## Introducing sarj

This is how sarj was born! My first open source tool that I released. It's a worktree + tmux session manager.

```
brew install davidmks/tap/sarj
```

One command to spin up a worktree with symlinks, setup, and a tmux session. One command to tear it all down. (works without tmux too)

You can read more about its set of features in the [repo](https://github.com/davidmks/sarj) (which is currently being maintained and extended with new features).

## Try it out

It's a simple tool that solves a huge problem for me and honestly I couldn't imagine my day-to-day work without it.
Super happy that it enjoys adoption at work with contributions from colleagues as well!
If you resonate with the problems I listed, give it a spin! Maybe you'll like it!
