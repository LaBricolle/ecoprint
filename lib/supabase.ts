import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client public : utilisé côté navigateur, droits limités par les policies RLS.
export const supabaseBrowser = () => createClient(url, anonKey);

// Client serveur : utilisé dans les routes API, peut utiliser la clé service
// role si besoin d'opérations privilégiées (non requis pour ce MVP).
export const supabaseServer = () => createClient(url, anonKey);

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const key = "carbon-scan-device-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
