import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client public : utilisé côté navigateur, droits limités par les policies RLS.
export const supabaseBrowser = () => createClient(url, anonKey);

// Client serveur scoppé au token de l'utilisateur connecté (Authorization
// header), pour que les policies RLS basées sur auth.uid() s'appliquent.
export function supabaseServer(accessToken?: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

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

// --- Authentification (nécessaire uniquement pour la reconnaissance IA) ---

export async function signInWithEmail(email: string) {
  const supabase = supabaseBrowser();
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const supabase = supabaseBrowser();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function signOut() {
  const supabase = supabaseBrowser();
  await supabase.auth.signOut();
}
