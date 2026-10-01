/** Tipos / schemas de picks — no es el state del grafo. */

import { z } from "zod";

export const FlightPickSchema = z.object({
  id: z.string().describe("id de ida o compuesto ida+vuelta"),
  airline: z.string(),
  from: z.string(),
  to: z.string(),
  price: z.number().describe("SUMA real outboundPrice + returnPrice"),
  outboundPrice: z.number(),
  returnPrice: z.number(),
  outboundId: z.string(),
  returnId: z.string(),
  stops: z.number().describe("Máximo de escalas entre ida y vuelta"),
  durationHours: z.number().describe("Suma de horas ida + vuelta"),
  reason: z.string().describe("Qué priorizaste y qué cediste"),
});

export const HotelPickSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricePerNight: z.number().describe("€/noche REAL del catálogo"),
  stars: z.number(),
  neighborhood: z.string(),
  distanceKmCenter: z.number().describe("km al centro"),
  reason: z.string().describe("Qué priorizaste y qué cediste"),
});

export const ActivityPickSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  durationHours: z.number(),
  reason: z.string(),
});

export const LeisureOutSchema = z.object({
  activities: z.array(ActivityPickSchema),
});

export type FlightPick = z.infer<typeof FlightPickSchema>;
export type HotelPick = z.infer<typeof HotelPickSchema>;
export type ActivityPick = z.infer<typeof ActivityPickSchema>;

export type TripContext = {
  userRequest: string;
  destination: string;
  origin: string;
  nights: number;
  /** Presupuesto TOTAL del viaje (global). */
  budget: number;
  /**
   * Tope de ESTA llamada al especialista (lo decide el orquestador, no el agente).
   * 0 = policy de dominio sin €; >0 = orientación de precio.
   * Si vuelos siempre van con >0 desde el principio, el arco “directo caro → hotel imposible” desaparece.
   */
  callBudget?: number;
  flight: FlightPick | null;
  hotel: HotelPick | null;
  activities: ActivityPick[];
  /** Solo P&E lo rellena en replan; el supervisor no usa guidance. */
  guidance?: string;
};
