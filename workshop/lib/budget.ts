/** Aritmética de presupuesto fuera del LLM (los modelos fallan con restas/divisiones). */

import type { TripContext } from "./types.ts";

type BudgetSlice = {
  budget: number;
  nights: number;
  flight: TripContext["flight"];
  hotel: TripContext["hotel"];
  activities: TripContext["activities"];
};

export function spent(ctx: BudgetSlice): number {
  const hotelTotal =
    (ctx.hotel?.pricePerNight ?? 0) * (ctx.nights || 0);
  const acts = (ctx.activities ?? []).reduce((s, a) => s + a.price, 0);
  return (ctx.flight?.price ?? 0) + hotelTotal + acts;
}

/** Restante del viaje. `null` = sin tope (budget 0 / no informado). */
export function remaining(ctx: BudgetSlice): number | null {
  if (!(ctx.budget > 0)) return null;
  return ctx.budget - spent(ctx);
}
