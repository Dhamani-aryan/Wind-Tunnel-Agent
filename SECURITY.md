# Security scope

This hackathon prototype runs only synthetic orders and refunds. No real payment, shell execution, arbitrary URL retrieval, or customer-system tools are exposed to the model.

Live inference requires server-side secrets and a separate private tester token. Keep `.env` and runtime credentials out of issues, screenshots, exports, and commits. Persistent case quotas are safeguards, not an account-wide spending cap.

Please report suspected credential exposure privately to the repository owner through GitHub before posting details. For non-sensitive reproducible bugs, open an issue with redacted evidence and the affected commit. Do not include real API keys or access tokens.

See docs/AUDIT.md for exercised checks and limitations. Passing tests does not establish general safety, an independent penetration test, or security of a container/host.
