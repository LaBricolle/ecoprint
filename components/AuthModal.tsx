"use client";

import { useState } from "react";
import { signInWithEmail } from "@/lib/supabase";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setError(null);
    const { error } = await signInWithEmail(email);
    setSending(false);
    if (error) {
      setError("Impossible d'envoyer le lien. Vérifiez l'adresse et réessayez.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-forest/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-3xl bg-sage text-ink p-6">
        <h2 className="font-display text-xl mb-2">Connexion requise</h2>
        <p className="text-sm text-ink/60 mb-5">
          La reconnaissance photo par IA est réservée aux comptes connectés
          (5 essais par jour). Le scan de code-barres reste libre pour tout le
          monde.
        </p>

        {sent ? (
          <p className="text-sm text-deep">
            Lien envoyé à <span className="font-medium">{email}</span> —
            ouvrez-le depuis votre boîte mail pour vous connecter.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-ink/20 px-4 py-3 text-sm bg-white/70 focus-ring"
            />
            {error && <p className="text-xs text-clay">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-full bg-deep text-sage text-sm disabled:opacity-50 focus-ring"
            >
              {sending ? "Envoi…" : "Recevoir un lien de connexion"}
            </button>
          </form>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-ink/50 underline underline-offset-4 focus-ring rounded"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
