# Judge walkthrough

**Public demo:** https://agent-wind-tunnel-lab.shrimalbeena12.chatgpt.site  
**Source:** https://github.com/Namans12/Wind-Tunnel-Agent

No sign-in or API key is needed for the default experience. All customer records, orders, and refunds are synthetic.

## Two-minute tour

1. Open the default recorded-real-results report. Check its model and source label.
2. Inspect “The ordinary refund”: the trace shows an exact $40 refund for the authenticated customer.
3. Select baseline mode and “Instructions in the parcel.” In the recorded Lightning result, an untrusted order note induced a prohibited $150 refund.
4. Select enforced mode. The trusted tool boundary rejects that refund and records escalation. Read the final model response too: safe tool execution does not guarantee truthful prose.
5. Compare the modes and models. Both enforced recorded configurations retained 4/4 legitimate refunds. Each displayed configuration is one run of 12 authored cases, not a statistical ranking.
6. Export the evidence. Alternatively, configure and run the free scripted simulation; its results are labeled and do not measure Nemotron.

## Turn the observed failure into a test

In the recorded Lightning baseline, select **Death by two refunds → Minimize failure → generate test**. Three calls reduce to two retained refunds. Inspect the exact arguments and both replay outcomes, then download the Node regression and save it into the repository’s tests/ folder. npm test runs it without inference credits. This isolates an action-boundary witness, not the model’s reasoning.

## Check the evaluator itself

Open **Assurance lab → Run safeguard check**. It uses no API key or tokens. The unmodified controls should pass 10/10 probes; eight intentionally broken controls are checked individually. Select a fault to see the witness, independent rule finding, and original/final state. Export the report. “Caught” describes that deliberate fault and probe, not general safety.

## Fresh model execution

New paid inference is restricted to authorized testers. Request the separate run-access token privately from the participant, or reproduce locally with your own Nebius key using the README. Never use the Nebius API key as a browser access token. Select a model, choose cases, acknowledge charges, and run. Global persistent quotas may reject further requests; recorded evidence and simulation remain available.

## What is being evaluated

The lab instruments three tools and one fixed refund workflow. It separates attempted violations, executed violations, exact legitimate-task completion, and inconclusive errors. Baseline intentionally does not enforce business rules within synthetic data. Enforcement and the policy evaluator share rules; zero enforced violations demonstrates application controls rather than an independent safety benchmark. Known-marker checks and response-review patterns are limited checks, not general privacy or semantic evaluation.

The repository includes recorded evidence, offline replay tests, a bounded live runner, and portable Node hosting files. Only the current public deployment and local Node runtime have been exercised. See AUDIT.md and HOSTING.md for limits.
