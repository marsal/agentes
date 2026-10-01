/**
 * Ejemplo B — Supervisor / swarm
 * Grafo: supervisor ⇄ especialistas → synthesize.
 * Sin evaluate/replan: si el vuelo se come el budget, hotel/ocio aprietan y ya.
 */
import "dotenv/config";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { SupervisorStateAnnotation, SupervisorState } from "./state.ts";
import { supervisorNode } from "./supervisor.ts";
import {
  runFlightsSpecialist,
  runHotelsSpecialist,
  runLeisureSpecialist,
  runSynthesize,
} from "../lib/agentes/index.ts";
import { TripContext } from "../lib/types.ts";
import { remaining } from "../lib/budget.ts";
import { printGraphMermaid } from "../lib/trace.ts";
import { WORKSHOP_DEMO } from "../lib/demos.ts";
import { logRequest, c } from "../lib/trace.ts";

// callBudget no vive en el state: se calcula al llamar (vuelos 0, resto = remaining).
function asCtx(state: SupervisorState, callBudget: number): TripContext {
  const ctx: TripContext = {
    userRequest: state.userRequest,
    destination: state.destination,
    origin: state.origin,
    nights: state.nights,
    budget: state.budget,
    callBudget,
    flight: state.flight,
    hotel: state.hotel,
    activities: state.activities ?? [],
  };
  return ctx;
}

async function flightsNode(state: SupervisorState) {
  // 0 → prioriza tiempo (Delta caro). Pon remaining() aquí y el drama del demo se aplana.
  return runFlightsSpecialist(asCtx(state, 0));
}
async function hotelsNode(state: SupervisorState) {
  const rem = remaining(state);
  return runHotelsSpecialist(asCtx(state, rem == null ? 0 : Math.max(0, rem)));
}
async function leisureNode(state: SupervisorState) {
  const rem = remaining(state);
  return runLeisureSpecialist(asCtx(state, rem == null ? 0 : Math.max(0, rem)));
}
async function synthesizeNode(state: SupervisorState) {
  return runSynthesize(asCtx(state, 0));
}

function routeSupervisor(state: SupervisorState) {
  return state.next || "finish";
}

const graph = new StateGraph(SupervisorStateAnnotation)
  .addNode("supervisor", supervisorNode)
  .addNode("flights", flightsNode)
  .addNode("hotels", hotelsNode)
  .addNode("leisure", leisureNode)
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", routeSupervisor, {
    flights: "flights",
    hotels: "hotels",
    leisure: "leisure",
    synthesize: "synthesize",
    finish: END,
  })
  // Tras cada especialista, vuelta al supervisor (a diferencia de P&E, no hay evaluate).
  .addEdge("flights", "supervisor")
  .addEdge("hotels", "supervisor")
  .addEdge("leisure", "supervisor")
  .addEdge("synthesize", END)
  .compile({ checkpointer: new MemorySaver() });

await printGraphMermaid("Supervisor", graph.getGraph().drawMermaid());

const empty = {
  activities: [],
  flight: null,
  hotel: null,
  finalItinerary: "",
  next: "" as const,
  destination: "",
  origin: "",
  nights: 0,
  budget: 0,
};

logRequest(WORKSHOP_DEMO);
const out = await graph.invoke(
  { ...empty, userRequest: WORKSHOP_DEMO },
  {
    configurable: { thread_id: "supervisor-0" },
    runName: "workshop-supervisor",
    tags: ["workshop", "supervisor"],
    recursionLimit: 20, // tool loops agresivos pueden comerse el límite
  }
);

void out;
