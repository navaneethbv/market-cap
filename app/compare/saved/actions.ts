"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isUuid,
  normalizeSavedComparisonInput,
} from "@/lib/saved-comparisons";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/compare/saved");
  }

  return { supabase, user };
}

function getComparisonId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) {
    throw new Error("Invalid saved comparison id");
  }
  return id;
}

export async function createSavedComparison(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = normalizeSavedComparisonInput({
    name: String(formData.get("name") ?? ""),
    symbols: String(formData.get("symbols") ?? ""),
  });

  const { error } = await supabase.from("saved_comparisons").insert({
    user_id: user.id,
    name: input.name,
    symbols: input.symbols,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/compare/saved");
}

export async function updateSavedComparison(formData: FormData) {
  const id = getComparisonId(formData);
  const { supabase, user } = await requireUser();
  const input = normalizeSavedComparisonInput({
    name: String(formData.get("name") ?? ""),
    symbols: String(formData.get("symbols") ?? ""),
  });

  const { error } = await supabase
    .from("saved_comparisons")
    .update({
      name: input.name,
      symbols: input.symbols,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/compare/saved");
}

export async function deleteSavedComparison(formData: FormData) {
  const id = getComparisonId(formData);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("saved_comparisons")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/compare/saved");
}
