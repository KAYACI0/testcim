-- Generic trigger: keeps `updated_at` current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Turkish-aware case folding + accent folding, used for accent/case-insensitive
-- search (tsvector generation, trigram matching). Standard lower() gets the
-- dotted/dotless I pairing wrong outside a tr_TR collation ('İ' -> 'i̇', not
-- 'i'; 'I' -> 'i', not 'ı'), so that pair is fixed via translate() first.
--
-- Verified cases:
--   tr_normalize('İstanbul') = 'istanbul'
--   tr_normalize('ISPARTA')  = 'isparta'
--   tr_normalize('ığdır')    = 'igdir'
--   tr_normalize('şeker')    = 'seker'
create or replace function public.tr_normalize(input text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    lower(translate(input, 'İI', 'iı')),
    'çğıöşü',
    'cgiosu'
  );
$$;
