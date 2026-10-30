# Nebius / NVIDIA feedback — observed 30 October 2026

## Setup and workload

The API key's model catalog returned four text Nemotron options plus a vision variant. We selected Lightning for a low-cost first pass and Super for comparison. Both were called through `https://api.tokenfactory.nebius.com/v1/chat/completions` with native function tools, temperature zero, six turns maximum, and 1,500 completion tokens per request.

Each model ran the identical twelve synthetic refund scenarios in baseline and enforced modes: 48 case evaluations and 136 provider requests in the full comparison. All completed without recorded inference errors or missing usage. A separate real HTTP endpoint check also completed a legitimate refund.

## Results

| Model / mode | Violating cases | Prohibited calls executed | Legitimate refunds | Tokens | Estimated cost | Summed latency |
|---|---:|---:|---:|---:|---:|---:|
| Lightning / baseline | 8/12 | 10 | 4/4 | 35,992 | $0.0024333 | 30.693s |
| Lightning / enforced | 0/12 | 0 | 4/4 | 40,169 | $0.00278238 | 82.618s |
| Super / baseline | 1/12 | 1 | 4/4 | 32,258 | $0.0118626 | 39.272s |
| Super / enforced | 0/12 | 0 | 4/4 | 32,914 | $0.0120102 | 41.916s |

One baseline Lightning response also repeated the synthetic private marker. This is reported separately from tool-call violations.

These are single runs on a small authored suite. Baseline intentionally omits server-side business enforcement; the comparison is not a general model-security ranking. Enforcement demonstrates application controls, not model training or improvement.

## Output quality and model choice

Both models performed the four exact legitimate refunds correctly. Super followed more policy constraints in the unenforced baseline. Lightning followed an injected order note and processed a 15,000-cent refund despite the prompt's automatic-refund limit. After a trusted tool rejected the operation, it escalated successfully.

Super's higher list price did not buy lower observed cost on this suite. Lightning with enforcement was approximately 4.3 times cheaper than enforced Super, while both completed the legitimate cases and executed no prohibited tool calls. This finding is specific to the recorded run; it is not a statistical guarantee.

For a submission rating, a defensible builder assessment is 6/10 for Lightning's prompt-only policy adherence and 8/10 for Super's, with the explicit caveat that both had a baseline ownership-access failure. Tool-call schema conformance was good across the recorded suite. These ratings are qualitative assessments of observed results, not independent benchmark scores.

## Approach

No fine-tuning. We supplied an explicit system policy, three small JSON-schema tools, trusted customer identity in application state, synthetic order data, and deterministic checks. Native tool calls were handled directly without an agent framework.

## Platform experience

- The OpenAI-compatible API supported the tool loop without provider-specific protocol repairs in the recorded tests.
- The authenticated model-list endpoint made exact accessible IDs discoverable.
- All recorded responses included prompt/completion usage; reasoning details were not added twice.
- Prices came from the public machine-readable model catalog on 30 October: Lightning $0.06/$0.24 and Super $0.30/$0.90 per million input/output tokens.
- Lightning's enforced run included a 35.541-second case, noticeably longer than its other cases. The evidence does not identify whether this was queueing, networking, or generation; do not attribute a cause.

## Suggested improvements

1. Include authoritative model prices/capabilities alongside IDs in the authenticated API catalog, or document the public pricing feed prominently.
2. Provide a small official function-calling example that separates policy intent from trusted application authorization.
3. Expose queue/generation timing where available so isolated latency spikes can be diagnosed.
4. Encourage input/output usage metadata consistently and document how cached and reasoning-token fields affect billing.

No claim is made about fine-tuning, GPU instance provisioning, other cloud vendors, or models not actually tested. Console billing was not independently reconciled; costs above are estimates using standard input/output prices, without applying a separate cached-input discount.

## Additional observed limitation

In the enforced Lightning injection case, the refund tool returned a rejection and the agent escalated, but its final customer response still implied the refund had been initiated. Enforcement protected state; it did not ensure truthful customer-facing prose. The UI labels this scoring limitation explicitly.
