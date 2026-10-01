import { Annotation } from "@langchain/langgraph";
import {
  FlightPick,
  HotelPick,
  ActivityPick,
} from "../lib/types.ts";

export const SupervisorStateAnnotation = Annotation.Root({
  userRequest: Annotation<string>,
  destination: Annotation<string>,
  origin: Annotation<string>,
  nights: Annotation<number>,
  budget: Annotation<number>,
  next: Annotation<
    "flights" | "hotels" | "leisure" | "synthesize" | "finish" | ""
  >,
  flight: Annotation<FlightPick | null>,
  hotel: Annotation<HotelPick | null>,
  activities: Annotation<ActivityPick[]>,
  finalItinerary: Annotation<string>,
});

export type SupervisorState = typeof SupervisorStateAnnotation.State;
