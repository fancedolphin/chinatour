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
