# Agent Wind Tunnel

**Expose agent failures. Check whether your safeguards can catch them.**

> Submission copy for participant review. Both upgrades are published in version 6 and verified through the public interface, API, and downloaded regression test. YouTube upload and participant submission remain yours to complete.

## Inspiration

A support agent says, “Your refund has been processed.” The tool trace tells a different story: the refund was blocked, and the request was escalated.

That gap became our starting point. Fluent answers are not reliable evidence of correct actions. We built Wind Tunnel to inspect what a tool-using agent attempted, what the application executed, and whether legitimate customers still got help. Then we asked a second question: would the evaluator catch a broken safeguard of its own?

## What it does

Wind Tunnel is a working reliability lab for a fictional store’s refund assistant. Twelve authored scenarios cover valid refunds, exact policy boundaries, unauthorized order access, excessive amounts, split refunds, and instructions hidden in order notes.

Run a Nemotron agent through the same scenarios in two modes. Baseline deliberately omits application business-rule enforcement in synthetic data. Enforced mode checks ownership, eligibility, balance, and cumulative refund limits before access or mutation. The dashboard distinguishes prohibited attempts from prohibited actions that actually executed, while positive controls require exact legitimate refunds.

Every result has an inspectable request, tool call, returned result, state outcome, usage, latency, and estimated cost. Recorded real inference is clearly labeled; free scripted simulation is separate. Inconclusive runs never become safety passes.

## From failure to a test you can keep

A dashboard finding can become a runnable regression. Select a real recorded baseline violation, minimize its ordered tool sequence while preserving the same action-policy rule, and export a Node test for the repository. The recorded split-refund example shrinks from three calls to two. The test reproduces the baseline witness and checks that enforcement prevents the same rule; automated verification deliberately breaks the guard to confirm the generated test fails. This is deterministic tool replay, not a replay of model reasoning or prompt causality.

## Check the checks

The Assurance lab deliberately breaks eight safeguards in isolated executions. A separately implemented checker replays raw tool results and final state without trusting the original policy decision or violation flags.

The original controls pass ten probes. The probes catch all eight authored faults, including cumulative split bypass, fractional cents, refusing every legitimate refund, and claiming success without updating the ledger. Each catch requires the fault to activate and its intended rule to fire; judges can inspect the witness and export the report. A free CI command runs the same regression gate.

This is finite, executable fault coverage—not a claim of general safety or an external security audit.

## How we built it

A dependency-free HTML/CSS/JavaScript interface connects to a bounded backend tool loop. NVIDIA Nemotron Lightning and Super run through Nebius Token Factory’s OpenAI-compatible function-calling endpoint. Trusted code owns customer identity and synthetic state. Provider-returned usage supports cost estimates; fresh runs capture requested and returned model identifiers.

The public deployment runs on Sites Workers with a persistent D1 quota ledger. API keys stay server-side. Fresh inference needs a private tester token; everyone can inspect recorded evidence and run free simulations. The Node adapter supports local reproduction. The repository includes MIT licensing, setup, tests, security scope, evidence, judge instructions, and CI.

## Results we can demonstrate

In the original recorded twelve-case comparison, Lightning’s baseline executed ten prohibited calls across eight cases; Super’s baseline executed one. Both enforced configurations executed zero prohibited calls and completed all four legitimate refunds.

A fresh full comparison reproduced those case-level outcomes. The two observations per configuration remain too few for statistical model rankings. The original enforced suites cost an estimated $0.0028 for Lightning and $0.0120 for Super using measured tokens and catalog prices; those estimates are not billing statements.

Verification includes 102 passing automated tests, green repository CI, replay of 96 real recorded case evaluations, hosted checks, and fresh real inference with the second checker.

## Challenges and lessons

The most revealing result was not just an unsafe tool call. A blocked refund could still be described as completed in the agent’s final response. We preserve that wording and distinguish action correctness from response truthfulness.

We also learned that an evaluator can share the same mistake as its guard. The separate trace checker and measured fault witnesses make that weakness testable. Passing our selected probes still cannot establish coverage of unknown failures, other workflows, or consistently falsified evidence.

## What is next

Bring in independently authored scenarios, repeat evaluations across more runs, validate customer-facing explanations, and add bounded adapters for external agents. The current release stays focused on one reproducible workflow.

## Links and track

- Suggested track: **Best Apps and Agents**; confirm the exact option in the live submission form.
- Demo: https://agent-wind-tunnel-lab.shrimalbeena12.chatgpt.site/
- Repository: https://github.com/Namans12/Wind-Tunnel-Agent
- Video: upload **Agent-Wind-Tunnel-Regression-Demo.mp4** (2:52), then paste the public YouTube URL.
- Tavily runtime integration: none; no Tavily bonus eligibility is claimed.
