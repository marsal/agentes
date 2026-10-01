/**
 * Evaluate + replan: el diferencial pedagógico vs supervisor.
 * Umbral ~45€/noche y suggestedFlightBudget calibran cuándo/cómo se recupera.
 */
import { z } from "zod";
import { PlanExecuteState, PlanStep } from "./state.ts";
import { model } from "../lib/model.ts";
import { spent, remaining } from "../lib/budget.ts";
import { logEvent, logKv } from "../lib/trace.ts";

const MAX_REPLANS = 2; // subir = más intentos; 0 ≈ supervisor (sin recuperación)

const SYSTEM_PROMPT = `Eres el EVALUADOR de un Plan-and-Execute de viajes.
Evalúas SOLO el paso que acaba de ejecutarse (te lo indican en el mensaje), no los que aún no han corrido.

# Reglas
- Tras "flights": hotel=null y activities=0 es NORMAL (aún no se ejecutaron).
  → continue si queda margen razonable para hotel (orientación: ≥~45€/noche).
  → replan SOLO si el vuelo deja demasiado poco (<~45€/noche):
    clearFlight=true,
    steps=["flights","hotels","leisure","synthesize"],
    callBudget = el presupuesto sugerido del mensaje (total ida+vuelta para la próxima llamada a vuelos),
    guidance="prioriza PRECIO en vuelos".
- Tras "hotels": replan si hotel es null/inválido.
- Tras "leisure": casi siempre continue.
- Si continue: steps=[], callBudget=0, clear*=false, guidance vacío.
`;

function ensureSynthesizeLast(steps: PlanStep[]): PlanStep[] {
  const work = steps.filter((s) => s !== "synthesize");
  return work.length ? [...work, "synthesize"] : ["synthesize"];
}

const EvalSchema = z.object({
  action: z.enum(["continue", "replan"]),
  reason: z.string(),
  guidance: z.string().describe("Si replan: hint para especialistas. Si no, vacío."),
  callBudget: z
    .number()
    .describe(
      "Si replan de vuelos: presupuesto € ida+vuelta para la próxima llamada. Si continue, 0."
    ),
  steps: z
    .array(z.enum(["flights", "hotels", "leisure", "synthesize"]))
    .describe("Nuevo plan si replan; si continue, []."),
  clearFlight: z.boolean(),
  clearHotel: z.boolean(),
  clearActivities: z.boolean(),
});

export async function evaluateNode(state: PlanExecuteState) {
  const {
    userRequest,
    plan,
    stepIndex,
    nights: nightsRaw,
    budget,
    flight,
    hotel,
    activities = [],
    replanCount = 0,
    callBudget: prevCallBudget = 0,
  } = state;
  const prevStep = plan[stepIndex - 1];
  const nights = nightsRaw || 1;
  const spentTotal = spent(state);
  const rem = remaining(state);

  if (replanCount >= MAX_REPLANS) {
    logEvent("🔍", "Evaluate → continue", "tope de replans → synthesize");
    return {
      plan: ["synthesize"] as PlanStep[],
      stepIndex: 0,
    };
  }

  const remainingAfterFlight = (budget || 0) - (flight?.price ?? 0);
  const perNight =
    flight && nights > 0 ? Math.floor(remainingAfterFlight / nights) : null;
  // Deja ~45€/n de hotel + ~30€ de ocio; tocar esto cambia cuándo dispara el replan.
  const suggestedFlightBudget = Math.max(
    80,
    (budget || 0) - 45 * nights - 30
  );

  const decision = await model.withStructuredOutput(EvalSchema).invoke([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Paso acabado de ejecutar: "${prevStep}"
Petición: "${userRequest}"

Hechos (calculados en código):
- presupuesto viaje: ${budget}€
- gastado≈${spentTotal}€ · restante≈${rem ?? "sin tope"} · noches=${nights}
- tras vuelo restante≈${remainingAfterFlight}€ (~${perNight ?? "?"}€/noche)
- presupuesto sugerido si replan de vuelos: ${suggestedFlightBudget}€ (ida+vuelta)
- replans: ${replanCount}/${MAX_REPLANS}
- plan: ${plan.join(" → ")} (índice=${stepIndex})
- vuelo: ${flight ? `${flight.airline} ${flight.price}€ stops=${flight.stops}` : "null"}
- hotel: ${hotel ? `${hotel.name} ${hotel.pricePerNight}€/n` : "null (aún no ejecutado si prev≠hotels)"}
- actividades: ${activities.length}`,
    },
  ]);

  if (decision.action === "continue") {
    logEvent("🔍", "Evaluate → continue", decision.reason);
    return {};
  }

  const steps = ensureSynthesizeLast(decision.steps as PlanStep[]);
  const callBudget = steps.includes("flights")
    ? decision.callBudget || prevCallBudget || 0
    : 0;

  logEvent("🔍", "Evaluate → replan", decision.reason);
  logKv([
    ["plan", steps.join(" → ")],
    ["guidance", decision.guidance || undefined],
    ["callBudget", callBudget || undefined],
  ]);

  return {
    plan: steps,
    stepIndex: 0,
    replanCount: replanCount + 1,
    guidance: decision.guidance || "",
    callBudget, // persiste en state para el próximo execute de vuelos
    flight: decision.clearFlight ? null : flight,
    hotel: decision.clearHotel ? null : hotel,
    activities: decision.clearActivities ? [] : activities,
  };
}
