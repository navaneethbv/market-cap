"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingState } from "@/lib/billing";
import { getOrCreateProPriceId, getStripe } from "@/lib/stripe";

export async function startProCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fpricing");
  }

  const billing = await getBillingState(user.id);
  if (billing.isPro) {
    redirect("/pricing?already=pro");
  }

  const stripe = getStripe();
  const proPriceId = await getOrCreateProPriceId();

  // Reuse the mapped customer when it is valid and actually ours
  const { data: mapping } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId: string | null = null;
  if (mapping) {
    try {
      const existing = await stripe.customers.retrieve(
        mapping.stripe_customer_id
      );
      if (
        !existing.deleted &&
        existing.metadata?.supabase_user_id === user.id
      ) {
        customerId = existing.id;
      }
    } catch {
      // Customer gone in Stripe (e.g. sandbox data cleared); create a new one
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    const { error } = await supabase
      .from("stripe_customers")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      throw new Error(`Failed to save Stripe customer mapping: ${error.message}`);
    }
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: proPriceId, quantity: 1 }],
    success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  redirect(session.url);
}
