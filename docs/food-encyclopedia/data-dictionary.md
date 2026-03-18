# Food Encyclopedia Data Dictionary

Updated: 2026-03-18
Related issues: CHI-69, CHI-64

## 1. Table and ownership
- Table: `public.food_encyclopedia`
- Data source: Supabase PostgreSQL
- FE consumer: `src/services/foodEncyclopediaService.ts`

## 2. Field definition

| Field | Type | Required | Description | Example |
| -- | -- | -- | -- | -- |
| `id` | UUID | yes | Primary key | `8f5d...` |
| `name_zh` | TEXT | yes | Chinese dish name | `麻婆豆腐` |
| `name_pinyin` | TEXT | no | Pinyin display name | `Má Pó Dòufu` |
| `name_en` | TEXT | no | English dish name | `Mapo Tofu` |
| `cuisine` | TEXT | yes | Cuisine enum | `川菜` |
| `category` | TEXT | yes | Category enum | `主菜` |
| `spice_level` | SMALLINT | no (default 0) | 0-3 spice scale | `3` |
| `flavor_md` | TEXT | no | Flavor notes (markdown/plain text) | `麻辣鲜香...` |
| `foreign_analogies` | JSONB | no | Foreign dish analogies | `[ {"dish": "..."} ]` |
| `allergens` | TEXT[] | no | Canonical allergen tags | `{soy,gluten}` |
| `allergen_note` | TEXT | no | Allergen-specific caution | `可能含交叉污染...` |
| `traveler_tips` | TEXT | no | Traveler usage tips | `不吃辣可说...` |
| `ordering_tips` | TEXT | no | Ordering sentence / practical hints | `少辣少油` |
| `is_published` | BOOLEAN | no (default true) | Public visibility switch | `true` |
| `created_at` | TIMESTAMPTZ | no | Create time | `2026-03-18T...` |
| `updated_at` | TIMESTAMPTZ | no | Update time | `2026-03-18T...` |

## 3. Canonical enums

### 3.1 `cuisine`
Allowed values:
- `川菜`
- `粤菜`
- `鲁菜`
- `苏菜`
- `浙菜`
- `闽菜`
- `湘菜`
- `徽菜`

Legacy/topic values (兼容历史数据):
- `北方面食`
- `小吃`
- `点心早餐`

### 3.2 `spice_level`
- `0`: 不辣 (`🟢`)
- `1`: 微辣 (`🟡`)
- `2`: 中辣 (`🌶`)
- `3`: 重辣 (`🌶🌶🌶`)

### 3.3 `allergens`
Allowed values:
- `peanut`
- `gluten`
- `soy`
- `sesame`
- `shellfish`
- `dairy`
- `egg`
- `pork`

## 4. Naming conventions
- `name_zh`: 简体中文，不带括号附注。
- `name_pinyin`: 首字母大写，音调符号可选；全项目保持一致。
- `name_en`: Title Case，避免随意缩写。
- `allergens`: 仅存 canonical 英文 token，不存中文同义词。

## 5. Validation rules (ingestion)
- `name_zh`, `cuisine`, `category` must be non-empty.
- `spice_level` must be integer in `[0, 3]`.
- `allergens` values must belong to canonical list.
- `foreign_analogies` must be JSON array.
- `is_published=false` records are not shown to anonymous users.

## 6. New dish ingestion flow
1. Content draft prepared (ZH/EN/Pinyin + allergen notes).
2. Schema check against this dictionary.
3. Enum check (`cuisine`, `spice_level`, `allergens`).
4. Copy-risk check (disclaimer + banned phrases).
5. Insert into Supabase and smoke test in FE filter UI.

## 7. 10 sample rows (enum coverage)

| name_zh | cuisine | spice_level | allergens |
| -- | -- | -- | -- |
| 麻婆豆腐 | 川菜 | 3 | `soy,gluten` |
| 宫保鸡丁 | 川菜 | 2 | `peanut,gluten` |
| 夫妻肺片 | 川菜 | 3 | `sesame,peanut` |
| 白切鸡 | 粤菜 | 0 | `none` |
| 叉烧 | 粤菜 | 0 | `pork` |
| 肠粉 | 粤菜 | 0 | `gluten,shellfish` |
| 炸酱面 | 北方面食 | 0 | `gluten,soy` |
| 羊肉泡馍 | 北方面食 | 0 | `gluten` |
| 煎饼果子 | 小吃 | 1 | `gluten,egg` |
| 豆浆油条 | 点心早餐 | 0 | `soy,gluten` |
