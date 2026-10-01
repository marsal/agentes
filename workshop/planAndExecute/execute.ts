/**
 * Execute: despacha el paso del plan a lib/agentes.
 * Aquí se materializa callBudget (0 = dominio; >0 = orientación €).
 */
import { PlanExecuteState } from "./state.ts";
import {
  runFlightsSpecialist,
  runHotelsSpecialist,
  runLeisureSpecialist,
  runSynthesize,
} from "../lib/agentes/index.ts";
import { TripContext } from "../lib/types.ts";
import { remaining } from "../lib/budget.ts";
import { logEvent, c } from "../lib/trace.ts";

function asCtx(state: PlanExecuteState, callBudget: number): TripContext {
  const {
    userRequest,
    destination,
    origin,
    nights,
    budget,
    flight,
    hotel,
    activities = [],
    guidance,
  } = state;
  const ctx: TripContext = {
    userRequest,
    destination,
    origin,
    nights,
    budget,
    callBudget,
    flight,
    hotel,
    activities,
  };
  if (guidance) ctx.guidance = guidance; // Hint: solo tras replan
  return ctx;
}

function callBudgetFor(state: PlanExecuteState, step: string): number {
  // Vuelos: lo que dejó el evaluate (o 0). Hotel/ocio: siempre el remaining actual.
  if (step === "flights") return state.callBudget ?? 0;
  if (step === "hotels" || step === "leisure") {
    const rem = remaining(state);
    return rem == null ? 0 : Math.max(0, rem);
  }
  return 0;
}

export async function executeStepNode(state: PlanExecuteState) {
  const { plan, stepIndex, guidance } = state;
  const step = plan[stepIndex];
  const callBudget = callBudgetFor(state, step);
  logEvent(
    "▶️",
    `Execute  [${stepIndex + 1}/${plan.length}]`,
    `${step}  callBudget=${callBudget}` +
      (guidance ? `  ${c.dim}(guidance)${c.reset}` : "")
  );

  const ctx = asCtx(state, callBudget);
  let patch: Partial<PlanExecuteState> = {};
  if (step === "flights") patch = await runFlightsSpecialist(ctx);
  else if (step === "hotels") patch = await runHotelsSpecialist(ctx);
  else if (step === "leisure") patch = await runLeisureSpecialist(ctx);
  else if (step === "synthesize") patch = await runSynthesize(ctx);

  return { ...patch, stepIndex: stepIndex + 1 };
}
