---
title: Delta
order: 5
year: 2026
kind: web
url: https://delta.heyparsa.com
repo: https://github.com/heyparsadev/delta
stage:
  scene: river
  stat: { label: Channels in the river, value: "4", sub: "Four channels: IranSpoti, Sibkade, HelpFinity and Barayand, from 2019 to today." }
  legend: [{ key: "%#", text: "a project, running" }, { key: ".", text: dried up, dim: true }]
  range: 2019 – 2026
  params:
    sea: 2026.86
    channels:
      - { name: iranspoti, from: 2019, to: 2020, fate: oxbow }
      - { name: sibkade, from: 2020, fate: main }
      - { name: helpfinity, from: 2023.95, to: 2025.55, fate: dries }
      - { name: barayand, from: 2026.42, fate: braids }
---

My career as a river, seen from a satellite. The river is grown in code from a six-year timeline, and every channel is a real project: IranSpoti meanders until it cuts itself off into an oxbow lake, Sibkade becomes the main stem, HelpFinity splits away and dries, and Barayand braids toward the sea. Scrolling moves through time from the source in 2019 to the sea today, then the camera pulls back to orbit. The same story also plays as an Apple-style keynote. Plain HTML, CSS and WebGL, no dependencies.
