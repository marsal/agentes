/**
 * Ejemplo A — ReAct (megaprompt)
 * Todas las constraints en un solo system prompt → demostrar que no escala.
 */
import "dotenv/config";
import { reactTravelAgent } from "./react.ts";
import { printGraphMermaid } from "../lib/trace.ts";
import { WORKSHOP_DEMO } from "../lib/demos.ts";
import { logRequest, logResponse } from "../lib/trace.ts";

await printGraphMermaid("ReAct (megaprompt)", reactTravelAgent);


logRequest(WORKSHOP_DEMO);

const result = await reactTravelAgent.invoke(
  { messages: [{ role: "user", content: WORKSHOP_DEMO }] },
  {
    configurable: { thread_id: "react-0" },
    runName: "workshop-react",
    tags: ["workshop", "react"],
  }
);

const last = result.messages?.[result.messages.length - 1];
const text =
  typeof last?.content === "string"
    ? last.content
    : JSON.stringify(last?.content);
logResponse(text, `${result.messages?.length ?? 0} mensajes en el loop`);
