"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeHoldingInput } from "@/lib/portfolio";
import { isUuid } from "@/lib/parse";

function getFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

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
    symbol: getFormString(formData, "symbol"),
    shares: getFormString(formData, "shares"),
    avgCost: getFormString(formData, "avgCost"),
    purchasedAt: getFormString(formData, "purchasedAt"),
  });
  const idempotencyKey = getFormString(formData, "idempotencyKey");
  if (!isUuid(idempotencyKey)) {
    throw new Error("Idempotency key is required");
  }

  const existing = await supabase
    .from("holdings")
    .select("symbol,shares,avg_cost,purchased_at")
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    if (
      existing.data.symbol !== input.symbol ||
      Number(existing.data.shares) !== input.shares ||
      Number(existing.data.avg_cost) !== input.avgCost ||
      existing.data.purchased_at !== input.purchasedAt
    ) {
      throw new Error("Idempotency key was already used for another holding");
    }
    revalidatePath("/portfolio");
    redirectToNext(formData);
    return;
  }

  const { error } = await supabase.from("holdings").insert({
    user_id: user.id,
    symbol: input.symbol,
    shares: input.shares,
    avg_cost: input.avgCost,
    purchased_at: input.purchasedAt,
    idempotency_key: idempotencyKey,
  });

  if (error) {
    if (error.code === "23505") {
      const duplicate = await supabase
        .from("holdings")
        .select("symbol,shares,avg_cost,purchased_at")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (
        !duplicate.error &&
        duplicate.data?.symbol === input.symbol &&
        Number(duplicate.data.shares) === input.shares &&
        Number(duplicate.data.avg_cost) === input.avgCost &&
        duplicate.data.purchased_at === input.purchasedAt
      ) {
        revalidatePath("/portfolio");
        redirectToNext(formData);
        return;
      }
    }
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");

  // Optional post-save destination (used by the stock page dialog);
  // same-origin relative paths only to prevent open redirects
  redirectToNext(formData);
}

function redirectToNext(formData: FormData): never | void {
  const next = getFormString(formData, "next");
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }
}

function getHoldingId(formData: FormData) {
  const id = getFormString(formData, "id");
  if (!isUuid(id)) {
    throw new Error("Invalid holding id");
  }
  return id;
}

export async function updateHolding(formData: FormData) {
  const id = getHoldingId(formData);

  const { supabase, user } = await requireUser();
  const input = normalizeHoldingInput({
    symbol: getFormString(formData, "symbol"),
    shares: getFormString(formData, "shares"),
    avgCost: getFormString(formData, "avgCost"),
    purchasedAt: getFormString(formData, "purchasedAt"),
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
  const id = getHoldingId(formData);

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
