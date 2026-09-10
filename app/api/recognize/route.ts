import { NextRequest, NextResponse } from "next/server";
import { searchProductByName } from "@/lib/openFoodFacts";
import { gradeFromCarbon } from "@/lib/carbon";

// Fallback optionnel : si l'utilisateur n'a pas de code-barres exploitable,
// on identifie le produit à partir d'une photo via l'API Claude (vision),
// puis on cherche sa fiche carbone dans Open Food Facts par nom.
//
// Coût variable selon le modèle choisi et le volume d'appels : vérifiez les
// tarifs à jour sur https://docs.claude.com/en/docs/about-claude/pricing
// avant mise en production, et ajustez ANTHROPIC_MODEL en conséquence.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Reconnaissance photo non configurée (ANTHROPIC_API_KEY manquante)." },
      { status: 501 }
    );
  }

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "Image manquante." }, { status: 400 });
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
