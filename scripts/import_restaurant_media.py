#!/usr/bin/env python3
"""Build SQL to seed restaurant_media / influencers / restaurant_media_influencers from
the supabase_database_full.xlsx catalog.

Matching strategy: each MediaPosition row is keyed to a (Position.name, Position.city) tuple
and resolved at SQL time by `JOIN restaurants r ON r.name = ? JOIN destinations d ON d.name = ?`.
Positions whose (name, city) pair doesn't exist in `restaurants` are silently skipped by the
INSERT ... FROM SELECT pattern; the script emits a diagnostic query so the user can
enumerate unmatched positions after applying the main SQL.
"""

from __future__ import annotations

import argparse
import re
import uuid
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


DEFAULT_XLSX = "/mnt/d/data/supabase_database_full.xlsx"
DEFAULT_SQL_OUTPUT = "/tmp/import_restaurant_media.sql"
DEFAULT_DIAGNOSTIC_OUTPUT = "/tmp/import_restaurant_media_unmatched_check.sql"

UUID_NAMESPACE = uuid.UUID("52f2fefe-7b7f-4ae5-b4d9-c30f4466acdc")

PLATFORM_MAP = {
    "抖音": "douyin",
    "哔哩哔哩": "bilibili",
    "b站": "bilibili",
    "bilibili": "bilibili",
    "douyin": "douyin",
}


def collapse_ws(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def sql_string(value) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def sql_int(value) -> str:
    if value is None or value == "":
        return "NULL"
    return str(int(value))


def sql_date(value) -> str:
    if value is None or value == "":
        return "NULL"
    if isinstance(value, datetime):
        return sql_string(value.date().isoformat())
    if isinstance(value, date):
        return sql_string(value.isoformat())
    return sql_string(str(value)[:10])


def make_uuid(label: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, label))


def read_sheet(workbook, name: str) -> tuple[list[str], list[tuple]]:
    sheet = workbook[name]
    rows = sheet.iter_rows(values_only=True)
    header = [collapse_ws(cell) for cell in next(rows, ())]
    data = [row for row in rows if row and any(cell is not None for cell in row)]
    return header, data


def row_to_dict(header: list[str], row: tuple) -> dict:
    record: dict = {}
    for index, key in enumerate(header):
        record[key] = row[index] if index < len(row) else None
    return record


def normalize_platform(name: str) -> str | None:
    key = collapse_ws(name).lower()
    return PLATFORM_MAP.get(key) or PLATFORM_MAP.get(collapse_ws(name))


def build_platform_map(workbook) -> dict[int, str]:
    header, rows = read_sheet(workbook, "Platform")
    mapping: dict[int, str] = {}
    for row in rows:
        record = row_to_dict(header, row)
        pid = record.get("id")
        platform_text = normalize_platform(record.get("name", ""))
        if pid is None or platform_text is None:
            continue
        mapping[int(pid)] = platform_text
    return mapping


def build_sql(xlsx_path: Path) -> tuple[str, str, dict]:
    workbook = load_workbook(xlsx_path, read_only=True, data_only=True)

    platform_map = build_platform_map(workbook)

    influencers_header, influencers_rows = read_sheet(workbook, "Influencer")
    media_header, media_rows = read_sheet(workbook, "Media")
    position_header, position_rows = read_sheet(workbook, "Position")
    media_position_header, media_position_rows = read_sheet(workbook, "MediaPosition")
    media_influencer_header, media_influencer_rows = read_sheet(workbook, "MediaInfluencer")

    influencers: dict[int, dict] = {}
    for row in influencers_rows:
        record = row_to_dict(influencers_header, row)
        source_id = record.get("id")
        name = collapse_ws(record.get("name") or "")
        if source_id is None or not name:
            continue
        influencers[int(source_id)] = {
            "id": make_uuid(f"influencer:{int(source_id)}"),
            "source_id": int(source_id),
            "name": name,
            "header_pic": collapse_ws(record.get("header_pic") or "") or None,
        }

    media: dict[int, dict] = {}
    for row in media_rows:
        record = row_to_dict(media_header, row)
        source_id = record.get("id")
        if source_id is None:
            continue
        platform_id = record.get("platform_id")
        alt_platform_id = record.get("alt_platform_id")
        media[int(source_id)] = {
            "source_id": int(source_id),
            "title": collapse_ws(record.get("name") or "") or None,
            "platform": platform_map.get(int(platform_id)) if platform_id else None,
            "link_url": collapse_ws(record.get("link_url") or "") or None,
            "thumbnail": collapse_ws(record.get("thumbnail") or "") or None,
            "upload_date": record.get("upload_time"),
            "alt_platform": platform_map.get(int(alt_platform_id)) if alt_platform_id else None,
            "alt_link_url": collapse_ws(record.get("alt_link_url") or "") or None,
        }

    positions: dict[int, dict] = {}
    for row in position_rows:
        record = row_to_dict(position_header, row)
        source_id = record.get("id")
        name = collapse_ws(record.get("name") or "")
        city = collapse_ws(record.get("city") or "")
        if source_id is None or not name or not city:
            continue
        positions[int(source_id)] = {
            "source_id": int(source_id),
            "name": name,
            "city": city,
        }

    media_by_source: dict[int, list[int]] = defaultdict(list)
    for row in media_influencer_rows:
        record = row_to_dict(media_influencer_header, row)
        m_id = record.get("media_id")
        i_id = record.get("influencer_id")
        if m_id is None or i_id is None:
            continue
        media_by_source[int(m_id)].append(int(i_id))

    lines: list[str] = [
        "-- Auto-generated by scripts/import_restaurant_media.py",
        "-- Seeds influencers / restaurant_media / restaurant_media_influencers.",
        "-- Idempotent; safe to rerun.",
        "BEGIN;",
    ]

    for influencer in sorted(influencers.values(), key=lambda item: item["source_id"]):
        lines.append(
            f"""
INSERT INTO public.influencers (id, source_id, name, header_pic, updated_at)
VALUES ({sql_string(influencer['id'])}, {influencer['source_id']}, {sql_string(influencer['name'])}, {sql_string(influencer['header_pic'])}, NOW())
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  header_pic = EXCLUDED.header_pic,
  updated_at = NOW();
""".strip()
        )

    emitted_media_positions: list[int] = []
    skipped_positions_without_media: set[tuple[str, str]] = set()
    positions_with_media: set[tuple[str, str]] = set()

    for row in media_position_rows:
        record = row_to_dict(media_position_header, row)
        mp_id = record.get("id")
        media_source = record.get("media_id")
        position_source = record.get("position_id")
        sort = record.get("sort") or 0
        if mp_id is None or media_source is None or position_source is None:
            continue

        position = positions.get(int(position_source))
        if position is None:
            continue
        media_record = media.get(int(media_source))
        if media_record is None or not media_record.get("link_url") or not media_record.get("platform"):
            continue

        positions_with_media.add((position["name"], position["city"]))
        emitted_media_positions.append(int(mp_id))

        lines.append(
            f"""
INSERT INTO public.restaurant_media (
  source_id, restaurant_id, platform, link_url, thumbnail, title,
  upload_date, alt_platform, alt_link_url, sort, updated_at
)
SELECT
  {int(mp_id)}, r.id,
  {sql_string(media_record['platform'])},
  {sql_string(media_record['link_url'])},
  {sql_string(media_record['thumbnail'])},
  {sql_string(media_record['title'])},
  {sql_date(media_record['upload_date'])},
  {sql_string(media_record['alt_platform'])},
  {sql_string(media_record['alt_link_url'])},
  {int(sort) if sort is not None else 0},
  NOW()
FROM public.restaurants r
JOIN public.destinations d ON r.destination_id = d.id
WHERE r.name = {sql_string(position['name'])}
  AND d.name = {sql_string(position['city'])}
LIMIT 1
ON CONFLICT (source_id) DO UPDATE SET
  restaurant_id = EXCLUDED.restaurant_id,
  platform = EXCLUDED.platform,
  link_url = EXCLUDED.link_url,
  thumbnail = EXCLUDED.thumbnail,
  title = EXCLUDED.title,
  upload_date = EXCLUDED.upload_date,
  alt_platform = EXCLUDED.alt_platform,
  alt_link_url = EXCLUDED.alt_link_url,
  sort = EXCLUDED.sort,
  updated_at = NOW();
""".strip()
        )

        for influencer_source in media_by_source.get(int(media_source), []):
            influencer = influencers.get(influencer_source)
            if influencer is None:
                continue
            lines.append(
                f"""
INSERT INTO public.restaurant_media_influencers (media_id, influencer_id)
SELECT rm.id, i.id
FROM public.restaurant_media rm
JOIN public.influencers i ON i.source_id = {influencer['source_id']}
WHERE rm.source_id = {int(mp_id)}
ON CONFLICT DO NOTHING;
""".strip()
            )

    for pos in positions.values():
        key = (pos["name"], pos["city"])
        if key not in positions_with_media:
            skipped_positions_without_media.add(key)

    lines.append("COMMIT;")
    sql = "\n".join(lines) + "\n"

    diagnostic_lines: list[str] = [
        "-- Run after applying import_restaurant_media.sql to see which (name, city) pairs",
        "-- referenced by Excel media were NOT matched to any row in restaurants.",
        "WITH pos(p_name, p_city) AS (VALUES",
    ]
    sorted_positions = sorted(positions_with_media)
    for index, (name, city) in enumerate(sorted_positions):
        suffix = "," if index < len(sorted_positions) - 1 else ""
        diagnostic_lines.append(f"  ({sql_string(name)}, {sql_string(city)}){suffix}")
    diagnostic_lines.extend(
        [
            ")",
            "SELECT pos.p_name, pos.p_city",
            "FROM pos",
            "LEFT JOIN public.restaurants r ON r.name = pos.p_name",
            "LEFT JOIN public.destinations d ON r.destination_id = d.id AND d.name = pos.p_city",
            "WHERE r.id IS NULL",
            "ORDER BY pos.p_city, pos.p_name;",
        ]
    )
    diagnostic_sql = "\n".join(diagnostic_lines) + "\n"

    stats = {
        "influencers": len(influencers),
        "media_records": len(media),
        "positions_total": len(positions),
        "positions_with_media": len(positions_with_media),
        "positions_without_media": len(skipped_positions_without_media),
        "media_position_rows_emitted": len(emitted_media_positions),
    }

    return sql, diagnostic_sql, stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", default=DEFAULT_XLSX)
    parser.add_argument("--sql-output", default=DEFAULT_SQL_OUTPUT)
    parser.add_argument("--diagnostic-output", default=DEFAULT_DIAGNOSTIC_OUTPUT)
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx)
    if not xlsx_path.exists():
        print(f"Excel not found: {xlsx_path}")
        return 1

    sql, diagnostic_sql, stats = build_sql(xlsx_path)

    Path(args.sql_output).write_text(sql, encoding="utf-8")
    Path(args.diagnostic_output).write_text(diagnostic_sql, encoding="utf-8")

    print("== Seed stats ==")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print(f"Main SQL: {args.sql_output}")
    print(f"Diagnostic SQL (run after main to see unmatched positions): {args.diagnostic_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
