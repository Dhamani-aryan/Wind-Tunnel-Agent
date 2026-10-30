# Focused security and end-to-end audit — 30 October 2026

## Scope

Source review, offline adversarial tests, real local HTTP requests, browser interaction, two real Super cases through the UI, package advisory checks, and final production smoke tests. This is a focused prototype audit, not an independent penetration-test certification or an OS/container scan.

## Findings addressed

| Finding | Change |
|---|---|
| JSON null could dereference body.case_id and produce an error | Require a JSON object; reject arrays, primitives, malformed JSON |
| Unbounded request.text could allocate a large body | Stream and cap UTF-8 payload bytes at 12,000; reject oversized/invalid length headers |
| A valid shared run token could start unlimited paid cases | Persistent atomic daily/minute reservations; quota failure blocks provider calls |
| Cancellation could show only completed costs without explaining lost in-flight usage | Preserve interruption metadata and show cost unknown for affected mode |
| Configured live runs retained the old Run simulation button label | Update immediately to Run live suite after saving configuration |
| Old evidence remained visible while the next request was starting | Clear the visible report to the new run immediately |
| Filtering could leave a trace from a nonmatching case | Trace selection follows the filtered list; no matching case yields an empty state |
| Imported evidence could look like a newly executed run | Explicit imported/unverified labels; imported runs excluded from model rankings |
| Deeply nested imported JSON could break later rendering | Bound JSON depth, node count, arrays, labels, and event shape before persistence |
| Duplicate case/mode entries could distort comparisons | Import validator rejects duplicate case/mode pairs; model comparison requires unique complete cases |
| Malformed provider content, duplicate tool IDs, empty answers, or filtered responses could be misclassified | Validate the assistant protocol before tool execution; return inconclusive |
| Negative/fractional provider usage could misstate cost | Require nonnegative integer usage; otherwise cost unknown |
| Broad inline-script permission increased the impact of future HTML injection | SHA-256 script-hash CSP, restricted forms/frames, no camera/microphone/geolocation |
| Development tooling pulled an esbuild advisory | Pin a patched transitive version; fresh install and schema generation verified |
| A rejected refund could still be described as initiated | Add a clearly labeled pattern-based response-review warning; preserve original wording |

## Verification evidence

- Automated tests cover policy boundaries, real-recording replay, malformed requests, streaming limits, duplicate tool IDs, content filtering, negative usage, atomic concurrent reservations, restart persistence, and rate/day resets.
- Browser: configured Super with server-controlled prices; ran two real enforced cases successfully; exported and imported evidence; verified literal rendering of hostile imported labels; checked filtering selects the correct trace.
- No API key or access token was found in the browser export or tracked source.
- Runtime and development dependency checks use npm audit against the official registry. Final offline checks: 49 passing tests. Official-registry npm audit reports zero known advisories, including development dependencies.
- Schema changes were generated with Drizzle; SQL migration creates only the quota ledger. No user/customer records are stored in it.

## Limits retained deliberately

Baseline tools are intentionally unenforced on fictional data, so their policy violations are the experiment, not access to real customer systems. No arbitrary code, filesystem tools, web URLs, or payment APIs are exposed to the model.

The application is a single synthetic refund workflow with twelve authored cases. A passing action-policy score does not prove safe prose, general privacy, security, or robustness on other workloads. The review warning is a narrow pattern and may miss paraphrases; it does not silently rewrite or improve the recorded model answer.

Case quotas are not a hard dollar cap and do not control other clients using the Nebius account. The access token is a shared tester credential, not individualized authentication. Imported evidence remains unverified even if its JSON structure is valid.

Alternate hosting files are prepared; only the current Sites deployment and local Node path are exercised. No Docker build or second-host deployment is claimed.

## Final deadline review

An independent Terra review found reporting/provenance defects, followed by focused Sol fixes and regression checks:

- Case-level violations remain visible when a later provider error makes the case inconclusive.
- Partial, interrupted, running, mixed-model/prompt/pricing runs cannot masquerade as complete comparisons.
- Fresh evidence preserves requested and provider-returned model identifiers per request; historical IDs remain explicitly unrecorded.
- CLI Super runs select Super prices automatically; explicit overrides are labelled. Unwritable evidence destinations fail before inference.
- Budget/usage/quota stop reasons persist, imported simulations stay unverified, and interrupted costs affect only the relevant mode.
- Additional accessibility labels and wrapping preserve the existing design.

A fresh 48-case real Nebius rerun completed with no inconclusive cases. Both enforced models executed zero prohibited calls and completed all four legitimate refunds. All provider-returned model identifiers matched requests. Evidence: recordings/repeat-validation.json. Estimated total $0.029191; this is not reconciled billing or a statistical ranking.
