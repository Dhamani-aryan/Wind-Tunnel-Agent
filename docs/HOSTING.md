# Hosting and portability

## Current public deployment

https://agent-wind-tunnel-lab.shrimalbeena12.chatgpt.site

Anyone with the URL can open the recorded real results and run free simulations without a ChatGPT sign-in. New paid inference requires the separate access token. The Nebius API key stays server-side. Sites runs the Worker; Nebius supplies NVIDIA model inference. The hackathon requirement is about using the required inference infrastructure, not making the website hostname Nebius-branded.

The owner may also attach a custom domain through Sites if desired. No domain has been purchased or configured.

## Current production safeguards

Cloudflare D1 stores global live-case reservations. Defaults: 60 per UTC day, 24 per minute. Quota decisions use atomic SQL, survive redeployments, and fail closed if storage is unavailable. They cap requests, not exact account-wide dollar charges. A shared token is appropriate only for a small controlled set of testers; it is not a full multi-user authentication system.

## Run on another Node host

The same source can run on a VM or compatible container host with Node 24 LTS. No runtime npm dependencies are needed.

```sh
HOST=0.0.0.0 PORT=10000 QUOTA_DB_PATH=/persistent/quota.sqlite npm start
```

Configure NEBIUS_API_KEY, RUN_ACCESS_TOKEN, NEBIUS_MODEL, NEBIUS_ALLOWED_MODELS, and LIVE_INFERENCE_ENABLED through the host's secret settings. Preserve the SQLite file on a persistent volume. Do not run multiple independent replicas with separate SQLite files: that would multiply the quota allowance. Use a shared transactional store for horizontal scaling.

TLS, reverse-proxy limits, secrets, disk permissions, and backups must be configured on the selected host. The Node adapter was tested locally; an arbitrary host is not verified by that test.

## Render deployment files

Dockerfile, .dockerignore, and render.yaml are prepared. The Blueprint selects a paid service with a persistent disk, starts with live inference disabled, and asks for secrets in the hosting UI. Do not create it without reviewing the host's price and account settings. No Render service or account was created during this work.

Local Docker is unavailable here, so the container build and a Render deployment have not been executed. Check the mounted disk's permissions for the container's node user before enabling live inference. The current Sites deployment remains the verified public demo.

References:
- https://render.com/docs/docker
- https://render.com/docs/disks
