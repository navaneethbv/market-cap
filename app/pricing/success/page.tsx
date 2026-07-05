import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { invalidateBillingCache } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fpricing");
  }
  if (!sessionId) {
    redirect("/pricing");
  }

  let verified = false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    verified =
      session.client_reference_id === user.id &&
      session.status === "complete" &&
      session.payment_status === "paid";
  } catch (err) {
    console.error("checkout session verification failed:", err);
  }

  if (verified) {
    // The next entitlement check should see the new subscription immediately
    invalidateBillingCache(user.id);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        {verified ? (
          <>
            <CircleCheck className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold">Welcome to Pro</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your subscription is active. You can now save stocks to your
              watchlist.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button className="rounded-full" asChild>
                <Link href="/watchlist">Open my watchlist</Link>
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/">Back to overview</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <CircleX className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold">
              Checkout not verified
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We could not confirm this payment with Stripe. If you completed
              checkout, refresh this page in a moment; otherwise start again
              from the pricing page.
            </p>
            <div className="mt-6">
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/pricing">Back to pricing</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
