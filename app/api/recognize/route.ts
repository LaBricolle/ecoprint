import { NextRequest, NextResponse } from "next/server";
import { searchProductByName } from "@/lib/openFoodFacts";
import { gradeFromCarbon } from "@/lib/carbon";
import { supabaseServer } from "@/lib/supabase";

// Fallback optionnel : si l'utilisateur n'a pas de code-barres exploitable,
// on identifie le produit à partir d'une photo via l'API Claude (vision),
// puis on cherche sa fiche carbone dans Open Food Facts par nom.
//
// Coût variable selon le modèle choisi et le volume d'appels : vérifiez les
// tarifs à jour sur https://docs.claude.com/en/docs/about-claude/pricing
// avant mise en production, et ajustez ANTHROPIC_MODEL en conséquence.
// En complément, fixez un plafond de dépense mensuel dur dans la Console
// Anthropic (Settings → Plans & Billing → Spending Limits) : au-delà, les
// appels sont bloqués plutôt que facturés indéfiniment.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const DAILY_QUOTA_PER_USER = 5;

async function isUnderQuota(supabase: ReturnType<typeof supabaseServer>, userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: existing } = await supabase
    .from("ai_usage_daily")
    .select("count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();

  if (existing && existing.count >= DAILY_QUOTA_PER_USER) {
    return false;
  }

  await supabase
    .from("ai_usage_daily")
    .upsert(
      { user_id: userId, day: today, count: (existing?.count || 0) + 1 },
      { onConflict: "user_id,day" }
    );

  return true;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Reconnaissance photo non configurée (ANTHROPIC_API_KEY manquante)." },
      { status: 501 }
    );
  }

  // La reconnaissance IA est réservée aux comptes connectés, pour maîtriser
  // le coût des appels à l'API Claude à l'échelle. Le scan de code-barres,
  // lui, reste libre pour tout le monde (voir components/ScannerView.tsx).
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json(
      { error: "Connectez-vous pour utiliser la reconnaissance photo." },
      { status: 401 }
    );
  }

  const supabase = supabaseServer(token);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Session expirée, reconnectez-vous." },
      { status: 401 }
    );
  }

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "Image manquante." }, { status: 400 });
  }

  const allowed = await isUnderQuota(supabase, user.id);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite de ${DAILY_QUOTA_PER_USER} reconnaissances IA par jour atteinte. Réessayez demain, ou utilisez le scan de code-barres.`,
      },
      { status: 429 }
    );
  }

  try {
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text:
                  "Identifie le produit alimentaire ou de consommation visible sur cette photo. " +
                  "Réponds uniquement avec le nom du produit et sa marque si visible, en français, " +
                  "sans phrase ni explication (ex: 'Yaourt nature Danone').",
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      return NextResponse.json(
        { error: "Le service de reconnaissance est momentanément indisponible." },
        { status: 502 }
      );
    }

    const data = await claudeRes.json();
    const guess: string = data?.content?.find((c: any) => c.type === "text")?.text?.trim();

    if (!guess) {
      return NextResponse.json(
        { error: "Produit non reconnu sur la photo." },
        { status: 404 }
      );
    }

    const product = await searchProductByName(guess);
    if (!product) {
      return NextResponse.json(
        {
          error: `Produit identifié comme "${guess}" mais aucune donnée carbone disponible.`,
        },
        { status: 404 }
      );
    }

    if (product.grade === "unknown" && product.carbonKgPerKg !== null) {
      product.grade = gradeFromCarbon(product.carbonKgPerKg);
    }
    product.source = "ai-estimate";
    product.confidence = "low";

    return NextResponse.json({ product, recognizedAs: guess });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de la reconnaissance de l'image." },
      { status: 500 }
    );
  }
}
