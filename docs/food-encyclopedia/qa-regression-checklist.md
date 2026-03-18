# Food Encyclopedia QA Regression Checklist

Updated: 2026-03-18
Related issues: CHI-68, CHI-66, CHI-67

## 1. Test scope
- Food list loading from `food_encyclopedia`
- Card field rendering
- Filters: cuisine, spice level, allergens exclusion
- Combined filter behavior
- Empty/error/boundary states

## 2. Core test cases (24)

| ID | Case | Steps | Expected |
| -- | -- | -- | -- |
| FE-QA-01 | Initial load | Open Tips > Food Encyclopedia | List loads from Supabase, no hardcoded data |
| FE-QA-02 | Basic card fields | Verify one card | Shows `name_zh`, optional `name_pinyin`, optional `name_en` |
| FE-QA-03 | Cuisine badge | Verify card meta | Cuisine badge visible |
| FE-QA-04 | Spice badge | Verify card meta | Spice icon and text visible (`0-3`) |
| FE-QA-05 | Allergen tags | Verify a dish with allergens | Correct allergen chips shown |
| FE-QA-06 | Expand card | Click card header | Details expand (flavor/analogies/tips) |
| FE-QA-07 | Collapse card | Click expanded header | Details collapse |
| FE-QA-08 | Search by Chinese | Search `麻婆` | Returns matching dish cards |
| FE-QA-09 | Search by English | Search `tofu` | Returns matching dish cards |
| FE-QA-10 | Search no result | Search random string | Empty-state card shown |
| FE-QA-11 | Cuisine filter single | Select `川菜` | Only Sichuan dishes remain |
| FE-QA-12 | Cuisine filter multi | Select `川菜` + `粤菜` | Union result of selected cuisines |
| FE-QA-13 | Spice filter single | Select `重辣` | Only spice level 3 entries |
| FE-QA-14 | Spice filter multi | Select `微辣` + `中辣` | Union result of selected spice levels |
| FE-QA-15 | Allergen exclusion single | Exclude `peanut` | No returned entry contains peanut |
| FE-QA-16 | Allergen exclusion multi | Exclude `peanut` + `gluten` | No returned entry contains either allergen |
| FE-QA-17 | Reset filters | Apply filters then click reset | All filter chips cleared and list restored |
| FE-QA-18 | Disclaimer visibility | Scroll and filter repeatedly | Allergen disclaimer remains visible in section |
| FE-QA-19 | Loading state | Throttle network and reload | Spinner shown before list renders |
| FE-QA-20 | Error state | Simulate DB/table error | Error panel shown with message |
| FE-QA-21 | Mobile layout | Width 375px | Filters wrap correctly, cards readable |
| FE-QA-22 | Tablet layout | Width 768px | Layout remains stable, no overlap |
| FE-QA-23 | Copy-review warning | Record contains high-risk phrase | `文案待审校` badge appears |
| FE-QA-24 | Keyboard input clear | Enter keyword then clear button | Keyword cleared and list refreshed |

## 3. Combined filter cases (8)

| ID | Filters | Expected |
| -- | -- | -- |
| FE-CB-01 | cuisine=川菜 + spice=重辣 | Intersection only |
| FE-CB-02 | cuisine=粤菜 + spice=不辣 | Intersection only |
| FE-CB-03 | cuisine=小吃 + exclude=gluten | No gluten in snack results |
| FE-CB-04 | spice=中辣 + exclude=peanut | No peanut in medium spicy results |
| FE-CB-05 | cuisine=北方面食 + exclude=gluten + keyword=`面` | Triple filter intersection |
| FE-CB-06 | cuisine=点心早餐 + keyword=`包` | Correct subset |
| FE-CB-07 | cuisine multi + spice multi + exclude multi | All conditions applied together |
| FE-CB-08 | Filters + keyword with no result | Empty state, no crash |

## 4. Boundary and resilience cases

| ID | Input anomaly | Expected behavior |
| -- | -- | -- |
| FE-BD-01 | `allergens` is null | Treated as empty array; card still renders |
| FE-BD-02 | unknown cuisine value | Card renders; filter chips still usable |
| FE-BD-03 | `spice_level` is null | Normalized to level `0` |
| FE-BD-04 | `spice_level` > 3 | Clamped to level `3` |
| FE-BD-05 | `foreign_analogies` invalid JSON shape | Fallback to empty analogies list |

## 5. Execution record template

| Case ID | Result (Pass/Fail/Blocked) | Evidence | Owner | Date | Notes |
| -- | -- | -- | -- | -- | -- |
| FE-QA-01 |  |  |  |  |  |
| FE-QA-02 |  |  |  |  |  |
| ... |  |  |  |  |  |

## 6. Release conclusion template

- Test round: `v1`
- Total cases: `32` (24 core + 8 combined)
- Pass: `__`
- Fail: `__`
- Blocked: `__`
- Must-fix defects: `__`
- Release recommendation: `Go / No-Go`
