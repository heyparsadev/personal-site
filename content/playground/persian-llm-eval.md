---
title: Persian LLM Eval
order: 7
year: 2026
kind: open source
url: https://github.com/heyparsadev/persian-llm-eval
summary: A benchmark for how well language models actually handle Persian.
stage:
  scene: leaderboard
  stat: { label: Top combined score, value: "0.945", sub: "The top combined score on public_eval and hard is 0.945, across 17 runs." }
  legend: [{ key: "@%", text: combined score }, { key: ".:", text: 95% interval, dim: true }]
  range: v1.1 leaderboard
  params:
    low: 0.8
    high: 0.98
    interval: 0.03   # ±3 pp per split, 95% (README)
    runs:            # [run, public_eval, hard, combined], README "All models on public_eval and hard", 2026-10-31
      - ["gpt-5.5 + thinking (high)", 0.9702, 0.9197, 0.9450]
      - ["gpt-5.5", 0.9622, 0.9183, 0.9403]
      - ["gpt-5.5 + thinking (medium)", 0.9651, 0.9147, 0.9399]
      - ["gpt-5", 0.9659, 0.8903, 0.9281]
      - ["gpt-5-mini", 0.9558, 0.8979, 0.9269]
      - ["claude-sonnet-4-6", 0.9318, 0.9090, 0.9204]
      - ["gpt-5 + thinking (medium)", 0.9479, 0.8774, 0.9127]
      - ["claude-opus-5.5, low", 0.9269, 0.8969, 0.9119]
      - ["claude-opus-5.5, high", 0.9239, 0.8881, 0.9060]
      - ["claude-opus-4-7", 0.9296, 0.8766, 0.9031]
      - ["claude-opus-5.5, medium", 0.9246, 0.8730, 0.8988]
      - ["gpt-5-nano", 0.9397, 0.8502, 0.8950]
      - ["claude-sonnet-5.5, high", 0.9164, 0.8617, 0.8890]
      - ["claude-sonnet-5.5, no thinking", 0.8961, 0.8562, 0.8762]
      - ["claude-sonnet-5.5, medium", 0.8680, 0.8806, 0.8743]
      - ["claude-sonnet-5.5, low", 0.8708, 0.8680, 0.8694]
      - ["claude-haiku-4-5", 0.8434, 0.8219, 0.8326]
---

A benchmark for how well language models actually handle Persian: 544 items across 21 tracks, from reading and culture to hard math and strict instruction following, with deterministic scoring and bootstrap confidence intervals. I built it because I wanted a Persian yardstick to exist, and nothing did. The result I did not expect: on strict instruction following, the biggest and most expensive model lost to a smaller one.
