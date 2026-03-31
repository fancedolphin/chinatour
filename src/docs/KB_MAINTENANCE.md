# Knowledge Base Maintenance

## Scope

This checklist covers the RAG knowledge-base tables:

- `destinations`
- `restaurants`
- `attractions`
- `travel_tips`
- `cultural_experiences`
- `events`
- `markets_and_shopping`
- `industrial_tourism`

Each table now carries a `verified_at` timestamp for manual freshness review.

## Routine

### Quarterly

Run:

```bash
npm run kb:stale-check -- --days=180
```

Review rows whose `verified_at` is older than 180 days, especially:

- `restaurants`
- `travel_tips`
- `markets_and_shopping`

### Annual

During January, review all `events` rows:

- confirm `month_start` / `month_end`
- re-check lunar-calendar events
- update `practical_tips` if crowd or reservation policy changed

For lunar festival month references, cross-check official Hong Kong Observatory conversion notes:

- https://www.hko.gov.hk/

## Single-record update

Use the maintenance script to update a row and regenerate its embedding:

```bash
npm run kb:update -- --table=restaurants --id=<uuid> --patch='{"description":"new summary","address":"updated address"}'
```

The script will:

1. fetch the existing row
2. merge the patch
3. set `verified_at` to now
4. call `generate-embedding`
5. upsert the row back into Supabase
