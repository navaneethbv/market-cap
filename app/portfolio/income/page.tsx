import { DollarSign } from "lucide-react";
import { fetchUserPortfolioMarketData } from "@/lib/portfolio-server";
import { DividendCalendar } from "@/components/dividend-calendar";

export const metadata = {
  title: "Dividend Income Calendar & Forecaster - MarketCap",
  description: "12-month projected dividend cash flows, quarterly payout distribution, and Yield on Cost analytics.",
};

export default async function PortfolioIncomePage() {
  const holdingForecastInputs = await fetchUserPortfolioMarketData("/portfolio/income", true);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <DollarSign className="h-4 w-4" />
            Passive Income
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dividend Income Calendar & Forecaster
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Projected 12-month passive dividend cash flows from your portfolio holdings.
            Track estimated quarterly payout schedules, monthly income averages, and aggregate Yield on Cost (YOC).
          </p>
        </div>
      </section>

      <DividendCalendar holdings={holdingForecastInputs} />
    </div>
  );
}
