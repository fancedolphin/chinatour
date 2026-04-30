CREATE OR REPLACE FUNCTION public.match_restaurants_near(
  query_embedding vector(768),
  center_lat double precision,
  center_lng double precision,
  radius_meters integer DEFAULT 1500,
  match_threshold float DEFAULT 0.4,
  match_count integer DEFAULT 6,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  cuisine_type text,
  description text,
  location_lat decimal,
  location_lng decimal,
  address text,
  price_range text,
  specialties text[],
  similarity float
)
LANGUAGE sql
AS $$
  WITH candidates AS (
    SELECT
      r.id,
      r.name,
      r.cuisine_type,
      r.description,
      r.location_lat,
      r.location_lng,
      r.address,
      r.price_range,
      r.specialties,
      1 - (r.embedding <=> query_embedding) AS semantic_similarity,
      6371000 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS((r.location_lat::double precision - center_lat) / 2)), 2) +
          COS(RADIANS(center_lat)) *
          COS(RADIANS(r.location_lat::double precision)) *
          POWER(SIN(RADIANS((r.location_lng::double precision - center_lng) / 2)), 2)
        )
      ) AS distance_meters
    FROM public.restaurants r
    LEFT JOIN public.destinations d ON r.destination_id = d.id
    WHERE
      r.location_lat IS NOT NULL
      AND r.location_lng IS NOT NULL
      AND 1 - (r.embedding <=> query_embedding) > match_threshold
      AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  )
  SELECT
    candidates.id,
    candidates.name,
    candidates.cuisine_type,
    candidates.description,
    candidates.location_lat,
    candidates.location_lng,
    candidates.address,
    candidates.price_range,
    candidates.specialties,
    candidates.semantic_similarity AS similarity
  FROM candidates
  WHERE candidates.distance_meters <= GREATEST(radius_meters, 1)
  ORDER BY
    (candidates.semantic_similarity * 0.6) +
    (GREATEST(0, 1 - (candidates.distance_meters / GREATEST(radius_meters, 1)::double precision)) * 0.4) DESC,
    candidates.semantic_similarity DESC
  LIMIT match_count;
$$;
