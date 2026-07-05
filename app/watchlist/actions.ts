"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingState } from "@/lib/billing";
import {
  getSafeWatchlistNextPath,
  isWatchlistSymbol,
  normalizeWatchlistSymbol,
} from "@/lib/watchlist";

export async function toggleWatchlistItem(formData: FormData) {
  const symbol = normalizeWatchlistSymbol(String(formData.get("symbol") ?? ""));
  const nextPath = getSafeWatchlistNextPath(formData.get("next"));

  if (!isWatchlistSymbol(symbol)) {
    redirect(`${nextPath}?error=invalid-symbol`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("symbol", symbol)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    // Saving to the watchlist is a Pro feature; removing is always allowed
    const billing = await getBillingState(user.id);
    if (!billing.isPro) {
      redirect("/pricing?reason=watchlist");
    }

    const { error } = await supabase
      .from("watchlist_items")
      .insert({ user_id: user.id, symbol });

    // 23505 = unique violation; a concurrent toggle already added the symbol
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  }

  revalidatePath("/watchlist");
  revalidatePath(`/stock/${symbol}`);
  redirect(nextPath);
}
