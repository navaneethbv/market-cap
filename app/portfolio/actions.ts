"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeHoldingInput } from "@/lib/portfolio";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  return { supabase, user };
}

export async function createHolding(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = normalizeHoldingInput({
    symbol: String(formData.get("symbol") ?? ""),
    shares: String(formData.get("shares") ?? ""),
    avgCost: String(formData.get("avgCost") ?? ""),
    purchasedAt: String(formData.get("purchasedAt") ?? ""),
  });

  const { error } = await supabase.from("holdings").insert({
    user_id: user.id,
    symbol: input.symbol,
    shares: input.shares,
    avg_cost: input.avgCost,
    purchased_at: input.purchasedAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}

export async function updateHolding(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid holding id");
  }

  const { supabase, user } = await requireUser();
  const input = normalizeHoldingInput({
    symbol: String(formData.get("symbol") ?? ""),
    shares: String(formData.get("shares") ?? ""),
    avgCost: String(formData.get("avgCost") ?? ""),
    purchasedAt: String(formData.get("purchasedAt") ?? ""),
  });

  const { error } = await supabase
    .from("holdings")
    .update({
      symbol: input.symbol,
      shares: input.shares,
      avg_cost: input.avgCost,
      purchased_at: input.purchasedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}

export async function deleteHolding(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid holding id");
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}
