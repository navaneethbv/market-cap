import { OptionsCalculator } from "@/components/options-calculator";
import { Sliders } from "lucide-react";

export const metadata = {
  title: "Options Strategy Payoff Calculator - MarketCap",
  description: "Interactive options profit/loss payoff diagrams, breakeven analysis, and max profit/loss simulator.",
};

export default function OptionsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Sliders className="h-4 w-4" />
            Derivatives Simulator
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Options Strategy Payoff Visualizer
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Explore options risk/reward profiles at expiration across Long Calls, Long Puts,
            Covered Calls, Cash-Secured Puts, and Vertical Spreads with dynamic breakeven points.
          </p>
        </div>
      </section>

      <OptionsCalculator />
    </div>
  );
}
