-- À exécuter dans l'éditeur SQL de votre projet Supabase.
-- Historique de scans, rattaché à un device_id anonyme généré côté client
-- (localStorage), donc aucune donnée personnelle identifiable n'est stockée.

create table if not exists scan_history (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  product_name text not null,
  brand text,
  barcode text,
  carbon_kg_per_kg numeric,
  grade text not null default 'unknown',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists scan_history_device_id_idx on scan_history (device_id);

alter table scan_history enable row level security;

-- Un device ne peut lire/écrire que ses propres entrées.
-- Le device_id est envoyé par le client applicatif (pas d'auth Supabase ici),
-- donc la policy s'appuie sur une vérification applicative côté route API.
-- Pour un MVP public, la route API (côté serveur) fait office de garde-fou ;
-- si vous exposez un accès direct depuis le navigateur, ajoutez l'auth
-- Supabase (anonymous sign-in) et remplacez cette policy par une vérification
-- sur auth.uid().
create policy "Allow all with service role"
  on scan_history
  for all
  using (true)
  with check (true);
