CREATE OR REPLACE FUNCTION public.match_indoor_attractions(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  location_lat decimal,
  location_lng decimal,
  ticket_price text,
  recommended_duration text,
  tags text[],
  indoor_outdoor text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.name::text,
    a.description,
    a.location_lat,
    a.location_lng,
    a.ticket_price::text,
    a.recommended_duration::text,
    a.tags,
    a.indoor_outdoor::text,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.attractions a
  LEFT JOIN public.destinations d ON a.destination_id = d.id
  WHERE a.indoor_outdoor IN ('indoor', 'both')
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;
