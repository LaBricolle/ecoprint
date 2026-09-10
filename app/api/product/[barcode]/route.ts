import { NextRequest, NextResponse } from "next/server";
import { fetchProductByBarcode } from "@/lib/openFoodFacts";
import { gradeFromCarbon } from "@/lib/carbon";

export async function GET(
  _req: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const barcode = params.barcode?.trim();
  if (!barcode) {
    return NextResponse.json({ error: "Code-barres manquant." }, { status: 400 });
  }

  try {
    const product = await fetchProductByBarcode(barcode);

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Produit introuvable dans Open Food Facts. Essayez la reconnaissance par photo.",
        },
        { status: 404 }
      );
    }

    // Si Open Food Facts n'a pas de grade calculé mais qu'on a le carbone brut,
    // on dérive un grade indicatif localement.
    if (product.grade === "unknown" && product.carbonKgPerKg !== null) {
      product.grade = gradeFromCarbon(product.carbonKgPerKg);
    }

    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données produit." },
      { status: 502 }
    );
  }
}
