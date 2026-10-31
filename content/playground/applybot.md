---
title: ApplyBot
order: 2
year: 2026
stage:
  scene: agent-run
  stat: { label: Applications it submits for you, value: "0", sub: "It interviews, searches, reads the admissions pages and writes, and never submits an application for you." }
  legend: [{ key: "%#", text: a tool at work }, { key: "//", text: never, dim: true }]
  range: one run, on a budget
  params: { lanes: [interview, search, read, write, submit], never: submit }
---

A Persian Telegram agent for students applying to graduate programs abroad. It interviews you, researches real programs on the live web, reads the official admissions pages, and writes a tailored CV and statement of purpose. It never submits anything for you. My first end-to-end agent with tools, memory, and a budget.
