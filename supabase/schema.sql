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
  weight_grams numeric,
  carbon_for_package numeric,
  grade text not null default 'unknown',
  image_url text,
  created_at timestamptz not null default now()
);

-- Si la table existait déjà avant cette mise à jour, exécutez aussi :
-- alter table scan_history add column if not exists weight_grams numeric;
-- alter table scan_history add column if not exists carbon_for_package numeric;

create index if not exists scan_history_device_id_idx on scan_history (device_id);

alter table scan_history enable row level security;

-- Compteur d'appels à la reconnaissance IA par utilisateur connecté et par
-- jour, pour plafonner le coût (voir DAILY_QUOTA_PER_USER dans
-- app/api/recognize). Nécessite l'authentification Supabase (Auth > Providers
-- > Email doit être activé, c'est le cas par défaut sur un projet neuf).
drop table if exists ai_usage_daily;

create table ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table ai_usage_daily enable row level security;

-- Chaque utilisateur ne peut lire/modifier que sa propre ligne de quota,
-- vérifié via auth.uid() (le token envoyé par le client, pas une simple
-- valeur déclarée comme pour scan_history).
create policy "Users manage their own AI usage row"
  on ai_usage_daily
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
