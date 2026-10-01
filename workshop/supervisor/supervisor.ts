/**
 * Supervisor: elige next + rellena hechos.
 * La tabla del prompt lo hace casi determinista; aflojarla = más “multi-agente”, más fallos.
 */
import { z } from "zod";
import { SupervisorState } from "./state.ts";
import { model } from "../lib/model.ts";
import { logEvent, logKv } from "../lib/trace.ts";

const SYSTEM_PROMPT = `Eres el SUPERVISOR de un equipo de viaje.
Decides el siguiente especialista y preparas hechos (destino, origen, noches, presupuesto total del viaje).

# Orden de decisión (mira el Estado; aplica la PRIMERA regla que cuadre)
1. Si NO es un viaje → finish (+ rejectionMessage).
2. Si ya hay finalItinerary → finish.
3. Si hasFlight=false → flights.
4. Si hasFlight=true y hasHotel=false → hotels.  (NUNCA leisure sin hotel.)
5. Si hasFlight+hasHotel y activitiesCount=0 → leisure
   (aunque el presupuesto esté justo o pasado; leisure puede elegir free).
6. Si activitiesCount>0 (o no hace falta ocio) → synthesize.
7. Nunca finish a medias sin synthesize cuando sí es un viaje.
8. No repitas un especialista si su resultado ya está.

# Constraints
- Presupuesto total del viaje (tú lo rellenas en los hechos).
- Pasarse del presupuesto NO aborta: igual leisure → synthesize.
- Normaliza origen/destino a códigos cortos (BCN, NYC).

# No hagas
- NO elijas hotel/vuelo concreto.
- NO replanifiques ocio.
- NO saltes hotels: sin hotel no hay leisure.
`;

const Decision = z.object({
  next: z
    .enum(["flights", "hotels", "leisure", "synthesize", "finish"])
    .describe("A quién llamar o si terminar"),
  reason: z.string(),
  destination: z.string(),
  origin: z.string(),
  nights: z.number().int(),
  budget: z.number().describe("Presupuesto TOTAL del viaje en €"),
  rejectionMessage: z
    .string()
    .describe("Si next=finish y no es viaje: mensaje. Si no, vacío."),
});

export async function supervisorNode(state: SupervisorState) {
  const {
    userRequest,
    destination,
    origin,
    nights,
    budget,
    flight,
    hotel,
    activities = [],
    finalItinerary,
  } = state;

  // Solo flags de progreso: el € por especialista lo ponen los wrappers de run.ts.
  const decision = await model.withStructuredOutput(Decision).invoke([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Petición: "${userRequest}"

Estado:
${JSON.stringify({
  destination,
  origin,
  nights,
  presupuesto: budget,
  hasFlight: !!flight,
  flightPrice: flight?.price ?? null,
  hasHotel: !!hotel,
  activitiesCount: activities.length,
  hasItinerary: Boolean(finalItinerary && finalItinerary.length > 0),
})}`,
    },
  ]);

  logEvent("🎛️", `Supervisor → ${decision.next}`, decision.reason);
  logKv([
    ["destino", decision.destination || undefined],
    ["origen", decision.origin || undefined],
    ["noches", decision.nights || undefined],
    ["budget", decision.budget ? `${decision.budget}€` : undefined],
  ]);

  const patch: Partial<SupervisorState> = {
    next: decision.next,
    destination: decision.destination || destination || "",
    origin: decision.origin || origin || "BCN",
    nights: decision.nights || nights || 0,
    budget: decision.budget || budget || 0,
  };

  if (
    decision.next === "finish" &&
    !finalItinerary &&
    decision.rejectionMessage
  ) {
    patch.finalItinerary = decision.rejectionMessage;
  }

  return patch;
}
