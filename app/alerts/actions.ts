"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeAlertInput } from "@/lib/alerts";
import { isUuid } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";

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
    redirect("/login?next=/alerts");
  }

  return { supabase, user };
}

function getAlertId(formData: FormData) {
  const id = getFormString(formData, "id");
  if (!isUuid(id)) {
    throw new Error("Invalid alert id");
  }
  return id;
}

export async function createAlert(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = normalizeAlertInput({
    symbol: getFormString(formData, "symbol"),
    direction: getFormString(formData, "direction"),
    targetPrice: getFormString(formData, "targetPrice"),
  });

  const { error } = await supabase.from("price_alerts").insert({
    user_id: user.id,
    symbol: input.symbol,
    direction: input.direction,
    target_price: input.targetPrice,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/alerts");
}

export async function updateAlert(formData: FormData) {
  const id = getAlertId(formData);
  const { supabase, user } = await requireUser();
  const input = normalizeAlertInput({
    symbol: getFormString(formData, "symbol"),
    direction: getFormString(formData, "direction"),
    targetPrice: getFormString(formData, "targetPrice"),
  });

  const { error } = await supabase
    .from("price_alerts")
    .update({
      symbol: input.symbol,
      direction: input.direction,
      target_price: input.targetPrice,
      triggered_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/alerts");
}

export async function deleteAlert(formData: FormData) {
  const id = getAlertId(formData);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/alerts");
}

export async function toggleAlertActive(formData: FormData) {
  const id = getAlertId(formData);
  const active = getFormString(formData, "active") !== "true";
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("price_alerts")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/alerts");
}
