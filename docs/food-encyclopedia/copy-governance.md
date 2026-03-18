# Food Encyclopedia Copy Governance

Updated: 2026-03-18
Related issues: CHI-70

## 1. Unified disclaimer template

### Chinese
> ⚠️ 过敏源信息仅供参考，各家餐馆做法不同。如有严重过敏，请务必向餐厅员工确认。

### English
> ⚠️ Allergen info is for reference only. Recipes vary by restaurant. If you have severe allergies, confirm with staff before ordering.

## 2. High-risk copy patterns (must avoid)
- 绝对安全
- 100%安全
- 完全无过敏风险
- 不会过敏
- 人人都能吃
- 可放心吃
- guaranteed safe
- zero allergy risk
- safe for everyone

## 3. Safer replacements
- Replace `绝对安全` with `风险较低，但仍需与餐厅确认`.
- Replace `不会过敏` with `未发现常见过敏源，仍可能存在交叉污染`.
- Replace `safe for everyone` with `generally tolerated, but confirm ingredients with staff`.

## 4. Dish-level copy review checklist
- [ ] Dish has allergen disclaimer in detail section.
- [ ] No banned phrase appears in `flavor_md`, `traveler_tips`, `allergen_note`.
- [ ] Allergen labels are canonical enum values.
- [ ] If uncertainty exists, wording uses `可能`/`建议确认`.
- [ ] English text carries same safety level as Chinese text.

## 5. 17-dish review tracker

| Dish | Status | Issue | Suggested fix |
| -- | -- | -- | -- |
| 麻婆豆腐 | Pending | - | - |
| 宫保鸡丁 | Pending | - | - |
| 夫妻肺片 | Pending | - | - |
| 北京烤鸭 | Pending | - | - |
| 炸酱面 | Pending | - | - |
| 刀削面 | Pending | - | - |
| 羊肉泡馍 | Pending | - | - |
| 小笼包 | Pending | - | - |
| 白切鸡 | Pending | - | - |
| 叉烧 | Pending | - | - |
| 肠粉 | Pending | - | - |
| 煎饼果子 | Pending | - | - |
| 臭豆腐 | Pending | - | - |
| 糖葫芦 | Pending | - | - |
| 包子 | Pending | - | - |
| 豆浆油条 | Pending | - | - |
| 皮蛋 | Pending | - | - |

## 6. FE implementation note
- Disclaimer is rendered as a persistent warning banner in `FoodEncyclopediaSection`.
- Copy risk detection is implemented in `foodEncyclopediaService` and marks cards as `文案待审校` when risky phrases are detected.
