create extension if not exists pg_trgm;

create index if not exists idx_shared_trips_title_trgm
  on public.shared_trips using gin (title gin_trgm_ops);

create index if not exists idx_shared_trips_desc_trgm
  on public.shared_trips using gin (description gin_trgm_ops);

create index if not exists idx_trips_destination_trgm
  on public.trips using gin (destination gin_trgm_ops);

create index if not exists idx_users_display_name_trgm
  on public.users using gin (display_name gin_trgm_ops);

create index if not exists idx_users_username_trgm
  on public.users using gin (username gin_trgm_ops);
