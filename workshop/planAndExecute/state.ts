import { Annotation } from "@langchain/langgraph";
import {
  FlightPick,
  HotelPick,
  ActivityPick,
} from "../lib/types.ts";

export type PlanStep =
  | "flights"
  | "hotels"
  | "leisure"
  | "synthesize";

export const PlanExecuteStateAnnotation = Annotation.Root({
  userRequest: Annotation<string>,
  destination: Annotation<string>,
  origin: Annotation<string>,
  nights: Annotation<number>,
  budget: Annotation<number>,
  /**
   * Tope de la próxima llamada (sobre todo vuelos tras replan).
   * En supervisor esto no existe: allí se calcula en el wrapper.
   */
  callBudget: Annotation<number>,
  plan: Annotation<PlanStep[]>,
  stepIndex: Annotation<number>,
  flight: Annotation<FlightPick | null>,
  hotel: Annotation<HotelPick | null>,
  activities: Annotation<ActivityPick[]>,
  finalItinerary: Annotation<string>,
  replanCount: Annotation<number>,
  /** Hint que execute mete en el mensaje del especialista tras un replan. */
  guidance: Annotation<string>,
});

export type PlanExecuteState = typeof PlanExecuteStateAnnotation.State;
