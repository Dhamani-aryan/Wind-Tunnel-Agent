# Assurance lab: test the checker

## Why

The original evaluator consumes policy flags emitted by the same guard that enforces policy. That instrumentation is useful, but cannot expose a shared implementation bug on its own. The new trace oracle is separate code: it does not call checkCall, executeTool, or evaluate, or trust their flags. It starts with trusted synthetic fixture state, replays observed successful tool results, checks business constraints, and compares replayed ledgers to final state.

For model-run traces the oracle validates message roles and requires a nonempty terminal assistant response; missing completion is inconclusive. The isolated tool-only probe contract explicitly omits this completion requirement. A fault counts as caught only when its wrapper was activated and its intended rule fired; an unactivated fault is invalid.

The original action scores remain visible. The oracle reports consistent, finding, or inconclusive, with separate policy, utility, result, and state-accounting reasons. Error traces retain findings but are inconclusive. It also records rejected attempts separately.

## Measured fault checks

The isolated lab executes ten separately authored probes against the original enforced executor and eight deliberately faulty wrappers. Current result: 10/10 original controls; 8/8 faults caught, no survivors or invalid faults. Counts are computed from the actual execution, never preassigned. Probes include exact day thirty, exact $100, foreign reads, expiry, over-balance, single over-limit, same-order splits, cross-order splits, and fractional cents.

| Deliberate fault | Witness detected by second implementation |
| --- | --- |
| Ownership rejection bypassed | Successful foreign order read |
| Expiry rejection bypassed | Successful day-31 refund |
| Balance rejection bypassed | Refund above remaining balance |
| Automatic ceiling bypassed | Single refund over $100 |
| Each call limited independently | Two below-limit refunds exceed session limit |
| Fractional cents accepted | Half-cent mutation |
| All refunds refused | Legitimate exact refund not completed |
| Success without ledger update | Tool results contradict final state |

Faulty wrappers execute real synthetic operations. Some intentionally falsify original policy flags, proving that the oracle does not rely on those annotations. They are used only by GET /api/assurance and the offline CLI; paid model-run requests have no fault selection parameter. The unchanged original controls run first as a control group.

## Reproduction

npm test checks oracle behavior and replays 96 real recorded cases from the original and repeated comparison. npm run assurance fails if original controls fail or a deliberate fault survives/cannot be evaluated. Optional argument to scripts/check-assurance.mjs exports the full JSON witness report. The public UI can run and export the same report without secrets or tokens.

## Limits

This is a second implementation of the same authored policy, not an external security audit. Eight faults and ten selected probes are finite and can miss other failures. A trace-only checker cannot see an actual action hidden by consistently falsifying both the tool result and final state. Its inputs are recorded observations, not authenticated real-world ground truth. It does not establish safe prose, arbitrary PII protection, other workflows, external agent integrations, or statistical Nemotron robustness. The synthetic known-marker text check is narrow.

## Verification limit

The addition passed automated backend/frontend behavioral checks and packaged Worker/HTTP tests. After account access was restored, public version 6 was visually checked and exercised in the real browser: 10/10 original controls,8/8 fault catches, witness inspection, and a generated regression download. Two fresh hosted model cases also passed the independent check.
