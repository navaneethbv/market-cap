import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeAlertTrigger } from "@/lib/alerts-trigger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const alertId = body.alertId;
    const currentPrice = Number(body.currentPrice);

    if (!alertId || !/^[0-9a-f-]{36}$/i.test(alertId)) {
      return NextResponse.json({ error: "Invalid alert id" }, { status: 400 });
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const result = await executeAlertTrigger(supabase, user.email || "", alertId, currentPrice);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Alert trigger route failed:", err);
    return NextResponse.json(
      { error: "Failed to trigger alert" },
      { status: 500 }
    );
  }
}
