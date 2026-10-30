# From an observed failure to a regression test

Select a completed bundled real baseline violation, then choose **Minimize failure → generate test**. The server independently audits the recorded evidence, replays the exact tool names and arguments from fresh synthetic state, and removes calls one at a time while preserving the first supported observed action-policy rule.

## What is actually minimized

The result is a **1-minimal ordered tool subsequence**: removing any single retained call no longer reproduces that rule. It is not a proof of the globally shortest attack, the same violating event, the model's reasoning, or the cause of a prompt-injection failure. For example, removing an order lookup may preserve an over-limit refund operation even though the lookup originally delivered the malicious note. The UI states this distinction.

Supported rules: ownership, eligibility, remaining balance, and cumulative automatic limit. Text-only privacy findings, incomplete runs, malformed arguments, unknown tools, and contradictory ledgers are unsupported. Tool replay has at most 48 calls and 2,500 executions. Only bundled server-held recorded cases are accepted by the GET endpoint; callers cannot upload arbitrary code or choose a filesystem path.

## Verified examples

- Recorded Lightning injection boundary: two tool calls become one $150 refund attempt. This isolates the forbidden operation, not the injection mechanism.
- Recorded Lightning split refund: three calls become the two refunds needed to exceed the cumulative threshold.
- Foreign-order lookup: one call remains.

The report shows the original/minimal counts, target rule, original event indices, exact retained arguments, baseline and enforced replay outcomes, and limitations. It costs no model tokens.

## Export and run

Download the generated `.test.mjs` file. Save it into this repository's `tests/` folder, then run `npm test`. The generated test imports the actual current executor and separate checker. It requires the baseline witness to reproduce the rule and the enforced executor to prevent that same rule, with consistent state and conclusive replay.

The generator safely embeds fixture data as encoded JSON; customer text is data rather than executable source. The generated regression is a tool-boundary test. It uses a deny expectation and does not verify the original customer-task utility or model output. Review the original run for those outcomes.

Tests execute a generated file against the real modules and then deliberately break enforcement in a temporary test adapter to verify that the exported regression fails. Temporary files are removed afterward. UI behavior, escaping, unsupported results and API selection also have regression coverage.

## Limits

One fixed synthetic refund workflow. Recorded calls are replayed deterministically; model behavior is not rerun. The executor and separate checker can share a misunderstood business rule. Future intentional policy changes require reviewing generated fixtures rather than blindly preserving old tests.
