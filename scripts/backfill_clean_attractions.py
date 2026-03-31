#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from import_full_knowledge_base import (
    DEFAULT_FUNCTION_SLUG,
    DEFAULT_NOTES_DIR,
    PROJECT_URL,
    attach_embeddings_batched,
    load_attractions_from_notes,
    post_json,
    unique_rows_by_id,
    vector_literal,
)


def load_existing_embeddings(project_url: str, anon_key: str, attraction_ids: list[str]) -> dict[str, object]:
    existing: dict[str, object] = {}
    for start in range(0, len(attraction_ids), 50):
        batch = attraction_ids[start : start + 50]
        joined_ids = ",".join(f'"{item}"' for item in batch)
        query = urllib.parse.urlencode(
            {
                "select": "id,embedding",
                "id": f"in.({joined_ids})",
            }
        )
        request = urllib.request.Request(
            f"{project_url}/rest/v1/attractions?{query}",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {anon_key}",
            },
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            rows = json.loads(response.read().decode("utf-8"))
        for row in rows:
            existing[str(row["id"])] = row.get("embedding")
    return existing


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean and backfill note-based attraction descriptions.")
    parser.add_argument("--notes-dir", default=DEFAULT_NOTES_DIR)
    parser.add_argument("--project-url", default=PROJECT_URL)
    parser.add_argument("--anon-key", required=True)
    parser.add_argument("--function-slug", default=DEFAULT_FUNCTION_SLUG)
    parser.add_argument("--skip-embedding", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sample-size", type=int, default=8)
    args = parser.parse_args()

    attractions, _, _ = load_attractions_from_notes(Path(args.notes_dir))
    attractions = unique_rows_by_id(attractions)

    if not args.skip_embedding:
        attach_embeddings_batched(
            args.project_url,
            args.anon_key,
            attractions,
            lambda item: " ".join(
                part
                for part in [
                    item.get("city") or "",
                    item["name"],
                    item.get("category") or "",
                    item.get("description") or "",
                    " ".join(item.get("tags") or []),
                    item.get("ticket_price") or "",
                    item.get("recommended_duration") or "",
                    item.get("address") or "",
                ]
                if part
            ),
            20,
            0.2,
        )
    else:
        existing_embeddings = load_existing_embeddings(
            args.project_url,
            args.anon_key,
            [item["id"] for item in attractions],
        )
        for item in attractions:
            item["embedding"] = existing_embeddings.get(item["id"])

    preview = [
        {
            "name": item["name"],
            "description": item["description"],
            "ticket_price": item.get("ticket_price"),
            "recommended_duration": item.get("recommended_duration"),
            "address": item.get("address"),
        }
        for item in attractions[: max(1, args.sample_size)]
    ]

    if args.dry_run:
        print(json.dumps({"count": len(attractions), "preview": preview}, ensure_ascii=False, indent=2))
        return 0

    endpoint = f"{args.project_url}/functions/v1/{args.function_slug}"
    payload = [{**item, "embedding": vector_literal(item.get("embedding"))} for item in attractions]
    result = post_json(
        endpoint,
        args.anon_key,
        {
            "destinations": [],
            "restaurants": [],
            "dishes": [],
            "attractions": payload,
            "travel_tips": [],
            "replaceRestaurantDishes": False,
        },
    )

    print(
        json.dumps(
            {
                "count": len(attractions),
                "result": result,
                "preview": preview,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
