/**
 * Ejemplo C — Plan-and-Execute
 * planner → execute ↔ evaluate (replan dentro de evaluate).
 * Mismo catálogo/demo que el supervisor; aquí sí se recupera del vuelo caro.
 */
import "dotenv/config";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import {
  PlanExecuteStateAnnotation,
  PlanExecuteState,
  PlanStep,
} from "./state.ts";
import { plannerNode } from "./planner.ts";
import { executeStepNode } from "./execute.ts";
import { evaluateNode } from "./evaluate.ts";
import { printGraphMermaid } from "../lib/trace.ts";
import { WORKSHOP_DEMO } from "../lib/demos.ts";
import { logRequest, logEvent } from "../lib/trace.ts";

function afterPlanner(state: PlanExecuteState) {
  return state.plan?.length ? "execute" : END;
}

function afterExecute(state: PlanExecuteState) {
  // synthesize es terminal: no hace falta evaluate después de la oferta.
  if (state.plan[state.stepIndex - 1] === "synthesize") return END;
  return "evaluate";
}

function afterEvaluate(state: PlanExecuteState) {
  if (!state.plan?.length || state.stepIndex >= state.plan.length) return END;
  return "execute";
}

const graph = new StateGraph(PlanExecuteStateAnnotation)
  .addNode("planner", plannerNode)
  .addNode("execute", executeStepNode)
  .addNode("evaluate", evaluateNode)
  .addEdge(START, "planner")
  .addConditionalEdges("planner", afterPlanner, {
    execute: "execute",
    [END]: END,
  })
  .addConditionalEdges("execute", afterExecute, {
    evaluate: "evaluate",
    [END]: END,
  })
  .addConditionalEdges("evaluate", afterEvaluate, {
    execute: "execute",
    [END]: END,
  })
  .compile({ checkpointer: new MemorySaver() });

await printGraphMermaid(
  "Plan-and-Execute (evaluate+replan)",
  graph.getGraph().drawMermaid()
);

const empty = {
  activities: [],
  plan: [] as PlanStep[],
  stepIndex: 0,
  flight: null,
  hotel: null,
  finalItinerary: "",
  destination: "",
  origin: "",
  nights: 0,
  budget: 0,
  callBudget: 0,
  replanCount: 0,
  guidance: "",
};

logRequest(WORKSHOP_DEMO);
const out = await graph.invoke(
  { ...empty, userRequest: WORKSHOP_DEMO },
  {
    configurable: { thread_id: "plan-exec-0" },
    runName: "workshop-plan-execute",
    tags: ["workshop", "plan-execute"],
    recursionLimit: 40,
  }
);

logEvent("✅", "Fin P&E", `replans=${out.replanCount ?? 0}`);
void out;
