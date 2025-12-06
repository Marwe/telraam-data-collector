# Automation & Agent Guide

This project runs a small set of automated agents to keep Telraam data fresh and consistent. Use this guide when operating or extending those agents.

## Agent Roles

- **Collector agent**: runs `npm run collect` to fetch the last N days (default 31 locally, 3 in CI) for all configured devices, merge data, and write hourly + daily JSON files under `docs/data/`.
- **Scheduler agent**: GitHub Actions workflow triggers the collector daily. It injects `TELRAAM_API_KEY` from repo secrets and clamps `TELRAAM_DAYS_TO_FETCH` to 3 by default to keep runs fast.
- **Maintenance agent**: human-in-the-loop tasks such as updating `src/config.ts` with device lists, refreshing the OpenAPI spec in `api-spec/telraam-openapi.yaml`, or rotating secrets.

## Inputs & Outputs

- **Inputs**: `TELRAAM_API_KEY` (required), `TELRAAM_DAYS_TO_FETCH` (optional override, 1–90), device list in `src/config.ts`, OpenAPI spec in `api-spec/`.
- **Outputs**: monthly hourly files `docs/data/device_{id}/{YYYY-MM}.json`, daily aggregates `docs/data/device_{id}/daily/{YYYY-MM}.json`, metadata `docs/data/devices.json`, and an auto-generated landing page `docs/index.html` listing all JSON downloads.

## Safety & Constraints

- Respect the Telraam **CC BY-NC** data license; do not republish commercially (see `DATA_LICENSE.md`).
- Avoid overwriting data outside `docs/data/`. Storage is append/merge-only with deduplication by ISO timestamp.
- Network calls are limited to the Telraam API; no other outbound calls are expected.
- Secrets live only in environment variables; never commit them. CI expects a repo secret named `TELRAAM_API_KEY`.

## Observability & Logs

- Runtime logs go to stdout; GitHub Actions surfaces them in the run logs.
- The collector uses structured logging (see `src/utils/logger.ts`) with levels: `info` for progress, `warn` for partial issues, `error` for failures.

## Failure Handling

- Per-device isolation: one failing device should not stop others. The collector reports a summary with successes and errors.
- Transient API issues: rerun the collector; it deduplicates and will not create duplicates.
- Schema changes: regenerate types via `npm run generate-types` after updating `api-spec/telraam-openapi.yaml`.

## Quick Operator Playbook

1. **Local test run**: `npm run dev` (fast) or `npm run collect` (full flow) with a valid `TELRAAM_API_KEY`.
2. **Add/remove devices**: edit `src/config.ts`, then run a local collection to seed data.
3. **Review data**: inspect `docs/data/device_{id}` for fresh `lastUpdated` timestamps and merged hourly/daily files, or open `docs/index.html` via GitHub Pages to browse/download JSON files.
4. **CI issues**: check GitHub Actions logs; confirm the secret exists and the API key is valid.
