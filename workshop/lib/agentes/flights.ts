import { createAgent } from "langchain";
import { model } from "../model.ts";
import { searchFlightsTool } from "../tools.ts";
import { TripContext, FlightPick, FlightPickSchema } from "../types.ts";
import { traceFlightPick } from "../trace.ts";

// Policy 0 vs >0 + few-shots: aquí se decide si el demo elige Delta 440€ o Level 335€.
const SYSTEM_PROMPT = `Eres el especialista de VUELOS de una agencia.
Tu único trabajo: elegir un vuelo de IDA Y VUELTA (round-trip) entre origen y destino.
No inventes vuelos, precios ni IDs: solo datos de search_flights.

# Procedimiento
1. Llama search_flights para la IDA (origin → destination).
2. Llama search_flights para la VUELTA (destination → origin).
3. Elige UN tramo de cada lista siguiendo las políticas de selección listadas a continuación.

# Políticas de selección
Lee el presupuesto del mensaje (y "Hint:" si viene).

- Default / presupuesto = 0:
  Prioriza SIEMPRE tiempo: menos escalas y menos durationHours.
  El precio es secundario. Elige el round-trip más rápido/cómodo.

- presupuesto > 0:
  Es una orientación de precio total ida+vuelta (~X€), no un techo legal duro.
  Prioriza PRECIO: elige el round-trip que mejor se ciña a ~X€.
  Puedes pasarte un poco si no hay opción exacta: coge la más cercana posible a X
  (si hay empate cerca de X, queda el más rápido entre esos).
  Explica el desvío en reason.

- Si hay "Hint:": esa instrucción manda sobre el default (p. ej. un replan que pide precio).

# Few-shots (ilustrativos; los IDs/precios reales salen de la tool)

Ejemplo A — presupuesto=0 (mejor por tiempo)
Opciones ida: A 95€ 2 escalas 20h | B 165€ 1 escala 13h | C 215€ 0 escalas 8.5h
Opciones vuelta: A' 105€ 2esc 21h | B' 170€ 1esc 13.5h | C' 225€ 0esc 8.2h
→ Elige C+C' (mismo carrier, directo). price=440. reason: "Prioricé tiempo: directos ida y vuelta."

Ejemplo B — presupuesto=335 (ciñete al precio)
Mismas opciones.
→ Elige B+B'. price=335. reason: "Me ajusté a ~335€; acepté 1 escala por tramo."

Ejemplo C — presupuesto=300 (no hay exacto; el más cercano)
Mismas opciones (200 / 335 / 440).
→ Elige B+B' (335): más cerca de 300 que 200 (−100) o 440 (+140).
  reason: "No había ~300€ exactos; 335€ era lo más cercano."
`;

const flightsAgent = createAgent({
  model,
  tools: [searchFlightsTool],
  systemPrompt: SYSTEM_PROMPT,
  responseFormat: FlightPickSchema, // el schema ya describe price=suma, etc.
});

export async function runFlightsSpecialist(
  ctx: TripContext
): Promise<{ flight: FlightPick }> {
  const {
    origin,
    destination,
    callBudget = 0,
    guidance,
  } = ctx;
  // Al agente: "presupuesto", no el nombre interno callBudget.
  const hint = guidance?.trim() ? `\nHint: ${guidance}` : "";
  const result = await flightsAgent.invoke({
    messages: [
      {
        role: "user",
        content: `Origen=${origin}, Destino=${destination}. Presupuesto=${callBudget}.${hint}`,
      },
    ],
  });
  const flight = result.structuredResponse as FlightPick;
  traceFlightPick(flight);
  return { flight };
}
