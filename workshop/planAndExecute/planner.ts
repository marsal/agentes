/**
 * Planner: hechos + plan inicial.
 * Puede omitir leisure; el evaluate es quien recupera con replan + callBudget/guidance.
 */
import { z } from "zod";
import { PlanExecuteState, PlanStep } from "./state.ts";
import { model } from "../lib/model.ts";
import { logEvent, logKv } from "../lib/trace.ts";

const SYSTEM_PROMPT = `Eres el PLANIFICADOR de viajes.
Extrae hechos y fija el plan inicial (el EVALUADOR puede replanear después).

- Orden base: flights → hotels → leisure → synthesize.
- Omite leisure si piden sin ocio, no quedan días útiles o el presupuesto es demasiado justo.
- Si no es viaje → isTravel=false, steps=[], rejectionMessage.
- Normaliza origen/destino a códigos cortos (BCN, NYC).
`;

function ensureSynthesizeLast(steps: PlanStep[]): PlanStep[] {
  const work = steps.filter((s) => s !== "synthesize");
  return work.length ? [...work, "synthesize"] : ["synthesize"];
}

const PlannerSchema = z.object({
  isTravel: z.boolean(),
  destination: z.string(),
  origin: z.string(),
  nights: z.number().int(),
  budget: z.number().describe("Presupuesto TOTAL del viaje en €"),
  steps: z
    .array(z.enum(["flights", "hotels", "leisure", "synthesize"]))
    .describe("Plan ordenado; si hay viaje, termina en synthesize."),
  rejectionMessage: z.string(),
});

export async function plannerNode(state: PlanExecuteState) {
  const { userRequest } = state;

  const planned = await model.withStructuredOutput(PlannerSchema).invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Petición: "${userRequest}"` },
  ]);

  if (!planned.isTravel) {
    logEvent("📝", "Planner", "fuera de dominio");
    return {
      plan: [] as PlanStep[],
      stepIndex: 0,
      finalItinerary:
        planned.rejectionMessage || "No parece una petición de viaje.",
    };
  }

  const plan = ensureSynthesizeLast(planned.steps as PlanStep[]);
  logEvent("📝", "Planner", plan.join(" → "));
  logKv([
    ["destino", planned.destination || undefined],
    ["origen", planned.origin || undefined],
    ["noches", planned.nights || undefined],
    ["budget", planned.budget ? `${planned.budget}€` : undefined],
  ]);

  return {
    destination: planned.destination,
    origin: planned.origin || "BCN",
    nights: planned.nights || 3,
    budget: planned.budget,
    plan,
    stepIndex: 0,
    replanCount: 0,
    guidance: "",
    callBudget: 0, // 1ª pasada de vuelos sin tope; el evaluate puede cambiarlo
  };
}
