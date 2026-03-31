WITH destination_lookup AS (
  SELECT id, name
  FROM public.destinations
  WHERE name IN ('北京市', '上海市')
),
experience_seed AS (
  SELECT *
  FROM (
    VALUES
      ('a7fd2840-9ffd-4cba-b498-b748d7dd11a1'::uuid, '北京市', '故宫宫廷文化深度讲解', 'museum-workshop', '跟随讲解员理解中轴线礼制与宫廷生活，适合第一次来北京的国际游客。', '东城区景山前街4号', '2-3小时', '¥198起', true, '春秋最佳', ARRAY['历史', '讲解', '室内']::text[], 0.86),
      ('fc73e0cd-7934-40d4-9f8f-b73d78b6c332'::uuid, '北京市', '798 创意工坊版画体验', 'art-workshop', '在 798 园区完成基础版画或丝网印刷体验，兼具观展和动手环节。', '朝阳区酒仙桥路4号798艺术区', '1.5-2小时', '¥168起', true, '全年', ARRAY['艺术', '手作', '室内']::text[], 0.78),
      ('2c85af6f-f47c-43da-830d-7c7e89dc039a'::uuid, '北京市', '前门京剧脸谱手绘体验', 'opera-craft', '体验京剧脸谱彩绘和基础唱念介绍，适合希望接触传统文化的短时游客。', '东城区前门东大街', '1小时', '¥128起', false, '全年', ARRAY['非遗', '表演', '亲子']::text[], 0.72),
      ('8d37305f-161f-4b77-bf4d-d236f0888cbb'::uuid, '上海市', '豫园茶馆评弹与茶席体验', 'tea-ceremony', '在老城厢茶馆观看评弹片段并学习盖碗茶礼仪。', '黄浦区豫园商城内', '1.5小时', '¥188起', true, '秋冬更佳', ARRAY['茶文化', '表演', '室内']::text[], 0.8),
      ('d873ad4e-c839-4ad3-b3fc-f2fc8bd98f94'::uuid, '上海市', '朱家角水乡手作扎染课', 'craft-workshop', '在朱家角古镇体验蓝染或扎染，适合半日慢游。', '青浦区课植园路附近', '2小时', '¥158起', true, '春夏', ARRAY['手作', '古镇', '摄影']::text[], 0.75),
      ('8ba38f39-e840-42aa-94ca-432a65b66d47'::uuid, '上海市', '海派旗袍与老洋房摄影体验', 'fashion-culture', '换装海派旗袍并由本地向导介绍老洋房街区故事。', '徐汇区衡山路历史风貌区', '2小时', '¥299起', true, '全年', ARRAY['城市文化', '摄影', '女性友好']::text[], 0.77)
  ) AS t(id, destination_name, name, category, description, address, duration_text, price_range, booking_required, best_time_to_visit, tags, popularity_score)
)
INSERT INTO public.cultural_experiences (
  id,
  destination_id,
  name,
  category,
  description,
  address,
  duration_text,
  price_range,
  booking_required,
  best_time_to_visit,
  tags,
  popularity_score
)
SELECT
  experience_seed.id,
  destination_lookup.id,
  experience_seed.name,
  experience_seed.category,
  experience_seed.description,
  experience_seed.address,
  experience_seed.duration_text,
  experience_seed.price_range,
  experience_seed.booking_required,
  experience_seed.best_time_to_visit,
  experience_seed.tags,
  experience_seed.popularity_score
FROM experience_seed
JOIN destination_lookup ON destination_lookup.name = experience_seed.destination_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.cultural_experiences ce WHERE ce.id = experience_seed.id
);

WITH destination_lookup AS (
  SELECT id, name
  FROM public.destinations
  WHERE name IN ('北京市', '上海市')
),
event_seed AS (
  SELECT *
  FROM (
    VALUES
      ('7313d7e8-0ac5-4e8f-acad-fd4b3784651a'::uuid, '北京市', '故宫上元之夜主题活动', 'festival', '围绕元宵节的夜间宫廷灯彩主题活动，需关注年度开放安排。', 1, 2, '故宫博物院', '东城区景山前街4号', true, false, ARRAY['节庆', '灯会', '预约']::text[]),
      ('b279f648-68cf-434e-a539-91258f0f0c01'::uuid, '北京市', '北京国际电影节展映月', 'city-event', '每年春季的城市电影节，适合将观影与城市漫步结合。', 4, 4, '多影院联动', '朝阳区/东城区多地', true, true, ARRAY['电影', '城市活动', '春季']::text[]),
      ('94c5d85a-9d69-49f7-b84e-7892bda85453'::uuid, '北京市', '地坛春节文化庙会', 'festival-fair', '春节期间的传统庙会体验，可集中感受北京年味。', 1, 2, '地坛公园', '东城区安定门外大街', false, false, ARRAY['庙会', '春节', '民俗']::text[]),
      ('3b28114f-a374-46f7-9d1e-095ab14af92f'::uuid, '上海市', '豫园灯会', 'festival', '春节到元宵期间的豫园新春灯会，适合夜游拍照。', 1, 2, '豫园商城', '黄浦区方浜中路', true, false, ARRAY['灯会', '夜景', '春节']::text[]),
      ('8a5e177c-c998-46fe-84be-7f7d1b7d55f5'::uuid, '上海市', '上海旅游节花车巡游', 'city-event', '秋季城市级活动，适合第一次来上海的游客集中感受城市节庆氛围。', 9, 9, '南京路步行街周边', '黄浦区南京东路', false, false, ARRAY['巡游', '秋季', '城市活动']::text[]),
      ('70e9f6a0-0990-4f13-b44d-f39ef4bd36ce'::uuid, '上海市', '上海国际咖啡文化周', 'food-event', '集中呈现精品咖啡快闪、讲座与市集，适合城市慢游。', 5, 6, '徐汇滨江 / 静安等', '上海多会场', false, true, ARRAY['咖啡', '市集', '春夏']::text[])
  ) AS t(id, destination_name, name, category, description, month_start, month_end, location_name, address, booking_required, is_indoor, tags)
)
INSERT INTO public.events (
  id,
  destination_id,
  name,
  category,
  description,
  month_start,
  month_end,
  location_name,
  address,
  booking_required,
  is_indoor,
  tags
)
SELECT
  event_seed.id,
  destination_lookup.id,
  event_seed.name,
  event_seed.category,
  event_seed.description,
  event_seed.month_start,
  event_seed.month_end,
  event_seed.location_name,
  event_seed.address,
  event_seed.booking_required,
  event_seed.is_indoor,
  event_seed.tags
FROM event_seed
JOIN destination_lookup ON destination_lookup.name = event_seed.destination_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e WHERE e.id = event_seed.id
);

WITH destination_lookup AS (
  SELECT id, name
  FROM public.destinations
  WHERE name IN ('北京市', '上海市')
),
market_seed AS (
  SELECT *
  FROM (
    VALUES
      ('15358e19-b9f4-42e5-b8f1-90e7d6c89f9f'::uuid, '北京市', '前门大栅栏夜间街区', 'historic-shopping-street', '适合第一次来北京的游客夜间散步，集合老字号、小吃与手信店。', '西城区煤市街至前门大街片区', true, '傍晚到夜间', '可优先选择老字号手信，餐饮高峰时段需排队', ARRAY['夜游', '老字号', '手信']::text[], 0.83),
      ('6cc0789f-0b44-4c74-9c0f-ec30d0b0bd7c'::uuid, '北京市', '潘家园旧货市场', 'flea-market', '适合对旧物、文玩和城市烟火气感兴趣的游客，周末更热闹。', '朝阳区华威里18号', false, '周末白天', '议价空间存在，但贵重文玩需谨慎判断真伪', ARRAY['淘货', '旧物', '周末']::text[], 0.79),
      ('5d20553c-8605-42f8-b16f-6a89efcdd997'::uuid, '北京市', '秀水街国际购物中心', 'tourist-shopping', '面向国际游客较友好的购物点，适合集中采购纪念品。', '朝阳区建国门外大街秀水东街8号', false, '下午到晚上', '可礼貌议价，先问清最终价格和支付方式', ARRAY['纪念品', '国际游客', '议价']::text[], 0.68),
      ('afd36c73-32ff-4d6e-879f-f431f7bc3875'::uuid, '上海市', '田子坊手作街区', 'creative-market', '适合购买设计师小物和海派风格纪念品，巷弄适合慢逛。', '黄浦区泰康路210弄', false, '下午到傍晚', '高峰期较拥挤，适合错峰进入', ARRAY['设计', '手作', '拍照']::text[], 0.8),
      ('bf66f6d1-a2f4-4039-b09e-918d5d4a7bdf'::uuid, '上海市', '城隍庙小商品与伴手礼区', 'tourist-market', '适合第一次来上海时集中采购本地小吃和伴手礼。', '黄浦区方浜中路', true, '晚上更热闹', '核心景区价格偏高，建议先比价后购买', ARRAY['伴手礼', '美食', '夜间']::text[], 0.82),
      ('f1a45b25-362d-4d53-8c16-4df919c5db4d'::uuid, '上海市', '安义夜巷', 'night-market', '城市感强的周末夜市，适合轻松社交和尝试新餐饮品牌。', '静安区安义路', false, '周末夜间', '热门摊位排队明显，建议提早到场', ARRAY['夜市', '周末', '年轻人']::text[], 0.76)
  ) AS t(id, destination_name, name, category, description, address, is_night_market, best_time_to_visit, bargain_tip, tags, popularity_score)
)
INSERT INTO public.markets_and_shopping (
  id,
  destination_id,
  name,
  category,
  description,
  address,
  is_night_market,
  best_time_to_visit,
  bargain_tip,
  tags,
  popularity_score
)
SELECT
  market_seed.id,
  destination_lookup.id,
  market_seed.name,
  market_seed.category,
  market_seed.description,
  market_seed.address,
  market_seed.is_night_market,
  market_seed.best_time_to_visit,
  market_seed.bargain_tip,
  market_seed.tags,
  market_seed.popularity_score
FROM market_seed
JOIN destination_lookup ON destination_lookup.name = market_seed.destination_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.markets_and_shopping ms WHERE ms.id = market_seed.id
);

WITH destination_lookup AS (
  SELECT id, name
  FROM public.destinations
  WHERE name IN ('北京市', '上海市')
),
industrial_seed AS (
  SELECT *
  FROM (
    VALUES
      ('2a88ca8f-e68b-441c-9539-485790ea9368'::uuid, '北京市', '三元牛奶工厂参观体验', 'factory-tour', '围绕北京乳品品牌历史与生产流程展开，适合亲子与工业兴趣游客。', '大兴区瀛海镇三元工业园', '透明参观通道 + 品鉴乳制品 + 品牌历史展示', ARRAY['乳制品', '亲子', '品牌故事']::text[], '1.5-2小时', '¥98起', true, ARRAY['工业旅游', '室内', '亲子']::text[]),
      ('ab0c5ee8-22b7-4819-87dd-6bd930681e7e'::uuid, '北京市', '北京珐琅厂景泰蓝工艺探访', 'craft-factory', '结合老厂工艺展示与掐丝珐琅体验，适合关注制造工艺的国际游客。', '东城区永外安乐林路10号', '参观工艺展厅 + 体验基础掐丝或点蓝', ARRAY['景泰蓝', '工艺', '手作']::text[], '2小时', '¥168起', true, ARRAY['工业旅游', '非遗', '手作']::text[]),
      ('2df08935-b81a-4138-874e-0ab6f22c1944'::uuid, '北京市', '红星二锅头酒厂酿造参观', 'distillery-tour', '了解北京白酒酿造流程与品牌历史，适合食品工业兴趣游客。', '怀柔区红星路1号', '展厅讲解 + 酿造流程参观 + 品牌陈列', ARRAY['白酒', '酿造', '品牌文化']::text[], '1.5小时', '¥128起', true, ARRAY['工业旅游', '食品工业', '品牌文化']::text[]),
      ('66770ffd-7d90-4774-9530-c6b6716fdad5'::uuid, '上海市', '光明乳业工厂亲子参观', 'factory-tour', '以上海本地乳业品牌为线索，展示现代食品工厂的标准化生产。', '闵行区都会路地区', '品牌馆 + 生产流程展示 + 亲子互动装置', ARRAY['乳业', '亲子', '现代工厂']::text[], '1.5小时', '¥108起', true, ARRAY['工业旅游', '亲子', '室内']::text[]),
      ('0bd0dd6b-d9be-4131-b3f0-2d086757a66f'::uuid, '上海市', '上海汽车文化与制造体验中心', 'automotive-tour', '面向汽车兴趣游客的制造主题体验，包含整车装配知识与品牌展示。', '嘉定区安亭汽车城片区', '汽车工业展陈 + 装配知识讲解 + 互动体验', ARRAY['汽车', '制造', '互动展项']::text[], '2小时', '¥158起', true, ARRAY['工业旅游', '汽车', '科技']::text[]),
      ('58dafc16-184c-473d-ba80-1460d8429c3e'::uuid, '上海市', '英雄钢笔厂书写工业体验', 'light-industry-tour', '从上海轻工业与钢笔制造历史切入，兼顾品牌故事与书写体验。', '杨浦区怀德路周边', '品牌历史介绍 + 制笔工艺展示 + 书写试用', ARRAY['钢笔', '轻工业', '文具']::text[], '1-1.5小时', '¥88起', false, ARRAY['工业旅游', '轻工业', '品牌故事']::text[])
  ) AS t(id, destination_name, name, category, description, address, experience_description, products_available, duration_text, price_range, booking_required, tags)
)
INSERT INTO public.industrial_tourism (
  id,
  destination_id,
  name,
  category,
  description,
  address,
  experience_description,
  products_available,
  duration_text,
  price_range,
  booking_required,
  tags
)
SELECT
  industrial_seed.id,
  destination_lookup.id,
  industrial_seed.name,
  industrial_seed.category,
  industrial_seed.description,
  industrial_seed.address,
  industrial_seed.experience_description,
  industrial_seed.products_available,
  industrial_seed.duration_text,
  industrial_seed.price_range,
  industrial_seed.booking_required,
  industrial_seed.tags
FROM industrial_seed
JOIN destination_lookup ON destination_lookup.name = industrial_seed.destination_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.industrial_tourism it WHERE it.id = industrial_seed.id
);

UPDATE public.attractions
SET indoor_outdoor = 'indoor',
    reservation_notes = COALESCE(reservation_notes, ticket_price),
    crowd_level = COALESCE(crowd_level, 'medium'),
    physical_intensity = COALESCE(physical_intensity, 'low'),
    updated_at = NOW()
WHERE (name LIKE '%博物馆%' OR name LIKE '%美术馆%')
  AND COALESCE(indoor_outdoor, 'outdoor') <> 'indoor';

UPDATE public.attractions
SET indoor_outdoor = 'both',
    crowd_level = COALESCE(crowd_level, 'medium'),
    physical_intensity = COALESCE(physical_intensity, 'low'),
    updated_at = NOW()
WHERE name IN ('三元牛奶工厂', '北京珐琅厂', '北京红星二锅头酒厂', '北冰洋工厂', '小米汽车工厂', '爱慕时尚工厂')
  AND COALESCE(indoor_outdoor, 'outdoor') = 'outdoor';
