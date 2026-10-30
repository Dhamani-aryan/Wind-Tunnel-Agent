# Live verification and judge access

**Owner approved live verification. Completed: model discovery, small tool-call smoke tests, 48-case two-model evaluation, and a real local HTTP endpoint check.**

Recorded evidence: `recordings/verified-runs.json`. Further runs still spend tokens; keep the budget bounded.

## First check

1. Configure key locally or as hosted runtime secret, never in chat.
2. After approval, inspect the catalog and select an accessible NVIDIA Nemotron model.
3. Verify prices; record source/date in FEEDBACK.md.
4. Enable live mode and its separate access token.
5. Run two cases in baseline mode. Each case permits up to six requests; stop if usage or errors are unexpected.
6. Verify tool protocol, returned usage, positive task completion, and export.
7. Review actual usage before expanding the budget.

## Expanded verification within approved budget

- Run identical cases in both modes with model/prompt fixed.
- Repeat selected cases to assess variability.
- Inspect ownership, cumulative limits, escalation, and legitimate boundaries.
- Treat errors as inconclusive and missing usage as cost unknown.
- Preserve actual exports; never claim scripted results are live.
- Compare console usage when available and write feedback from observations.

## Shared judge access

- Arrange testing without exposing secrets.
- Keep anonymous live calls disabled.
- Persistent daily/minute quotas are implemented; keep the separate tester token private.
- Provide labeled recorded evidence plus a reproducible working test build if live access is restricted.
- Verify the final access arrangement against event requirements.
