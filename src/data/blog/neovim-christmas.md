---
title: "The Christmas I finally switched to Neovim"
description: ""
pubDate: 2026-01-05
tags: ["neovim", "tooling", "editors"]
---

Let me start off by admitting that I couldn't shut up about this for at least a week... guilty

For such a long time I have been wanting to daily drive Neovim, but it always felt like this untouchable ideal, it seemed like it requires so much time just to get it up and running or barely usable that I just couldn't justify the time investment. I have always looked up to people using it and imagined that maybe one day I will also be as cool as them.

Initially I resonated a lot with people saying they just want something ready and usable out of the box. As a matter of fact they are professionals and don't want to waste time ricing and configuring. It may seem childish to get fixated on these things but there was a clip from ThePrimeagen that really inspired me, he said something along the lines of if you want to be exceptional at your craft you really have to invest time in learning your tools (whatever your choice of tools may be). I thought of it as a musician mastering his instrument and couldn't agree with him more.

This has started something in me where I became more intentional in my work, I started paying attention to what I was doing, what are the things that I most frequently use, what do I repeat many times during my workday and where do I wanna reduce friction. Started looking into window managers, editors and thought deeply about what my ideal setup would look like.

## Journey

In the beginning I was using VS Code which served me well, it was free, open source and visually pretty minimalistic which I liked. I learned a few shortcuts that helped me navigate the editor better and was overall pretty fast in it. When I got pretty comfortable with how my editor works I forced myself to learn vim motions.

The first few weeks were tough, it was mostly annoying because you lose all your speed and muscle memory and have to start from ground zero all over again, but to be honest it's not the end of the world, you just bite the bullet knowing that it will pay dividends later.

After VS Code I moved to JetBrains products (PyCharm specifically). After switching jobs and working in a much larger codebase, using VS Code's search functionalities felt a bit lacking, I saw my colleague getting around the codebase in PyCharm and thought to myself that I really gotta hop on this. And to be honest I was super happy with JetBrains, the vim plugin was great (much better than in VS Code) the search functionalities are extraordinary, overall I was totally satisfied with the product, besides one little caveat, that it was eating memory like crazy... I remember setting its limit to an extreme 12GB and it was still lagging after prolonged usage which meant I had to clean its cache quite frequently, and on top of this it wasn't really playing nicely with worktrees which I started to use quite heavily, it required setting up my editor (test runners, directory excludes etc.) each time I created a new worktree, which started to become unmanageable so I took this as a sign to finally make THE move.

## The stars have aligned

The Christmas break gave me a chunk of uninterrupted time to finally play around with Neovim. I was already pretty familiar with vim motions and the Neovim ecosystem from following TJ DeVries' [content](https://www.youtube.com/watch?v=m8C0Cq9Uv9o) online so I already knew what to do and where to start. I even had some earlier failed attempts at transitioning to Neovim but neither of them turned out to be successful, it's fair to say that after a few Lua errors I gave up, but this time it was different - I had Claude Code on my side wherever I faced some obscure error that would have discouraged me earlier.

Things went pretty smoothly, I followed the [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim) project which honestly is great and I would recommend anyone starting off to use this project. It is not a Neovim distro, it's just a Neovim config that has the absolute necessities like a plugin manager, LSP, fuzzy finding, treesitter and git integration. It's a launchpoint to build your own config the way you like it. I also tried working with distros but they were way too opinionated for me and I found myself not understanding what each plugin does so instead I just handpicked everything myself based on what I wanted to have. I enjoy a pretty minimal setup and honestly it was very fun researching, collecting and arranging these plugins just how I like them.

If you're curious about what I ended up with, you can find my full config [here](https://github.com/davidmks/nvim-config).

## Go for it

If you've been putting it off like I was, or have been playing with the idea of trying Neovim, the barrier to entry has gotten much lower. With all the new tooling we have at our disposal today like AI assistants and agents, it's way less intimidating compared to what it used to be. All I know is that I'm super happy with my setup and wouldn't trade it for the world. Glad I took the leap, so if you're thinking about it... go for it!
