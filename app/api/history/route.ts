import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id");
  if (!deviceId) {
    return NextResponse.json({ error: "device_id manquant." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { device_id, product_name, brand, barcode, carbon_kg_per_kg, grade, image_url } = body;

  if (!device_id || !product_name) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("scan_history")
    .insert({
      device_id,
      product_name,
      brand: brand || null,
      barcode: barcode || null,
      carbon_kg_per_kg: carbon_kg_per_kg ?? null,
      grade: grade || "unknown",
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data }, { status: 201 });
}
