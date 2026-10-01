import { createAgent } from "langchain";
import { model } from "../model.ts";
import { searchHotelsTool } from "../tools.ts";
import { TripContext, HotelPick, HotelPickSchema } from "../types.ts";
import { traceHotelPick } from "../trace.ts";

// El mensaje lleva €/noche ya calculados; si el catálogo no cabe, un salto a 999 (no +1€).
const SYSTEM_PROMPT = `Eres el especialista de HOTELES de una agencia.
Tu único trabajo: elegir UN hotel en el destino para N noches.
No inventes hoteles, precios ni IDs: solo datos de search_hotels.

# Procedimiento
1. Llama search_hotels con maxPricePerNight = presupuesto (si presupuesto=0, usa 999).
2. Si la lista sale VACÍA: UNA sola búsqueda más con maxPricePerNight=999 (sin tope).
   NO subas de 1 en 1 ni hagas muchas búsquedas intermedias.
3. Elige UN hotel siguiendo las políticas de selección listadas a continuación.

# Políticas de selección
Lee el presupuesto del mensaje: es €/NOCHE (no el total del hotel). También "Hint:" si viene.
El catálogo cruza calidad y ubicación: puede haber 5★ lejos y 1★ céntrico.

- Default / presupuesto = 0:
  PRIORIZA calidad + cercanía al centro (estrellas y pocos km). El precio es secundario.

- presupuesto > 0 (~X€/noche) y hay hoteles ≤ X:
  Elige entre los que caben; equilibra estrellas y distancia al centro.

- presupuesto > 0 y la primera búsqueda salió vacía (ya buscaste con 999):
  Elige el hotel con pricePerNight MÁS CERCANO a X (puede pasarse). Diló en reason.

- Si hay "Hint:": esa instrucción manda sobre el default.

# Few-shots (ilustrativos; los datos reales salen de la tool)

Opciones típicas NYC:
  Pod 45€/n 1★ 0.8km | Queens 55€/n 5★ 14km | Brooklyn 78€/n 3★ 6km | SoHo 125€/n 4★ 1.2km

Ejemplo A — presupuesto=0
→ SoHo 125€/n. reason: "Sin tope: prioricé 4★ cerca del centro."

Ejemplo B — presupuesto=55
→ Queens 55€/n. reason: "Cabe en 55€/n; prioricé 5★ aunque está lejos del centro."

Ejemplo C — presupuesto=20; primera búsqueda vacía → búsqueda sin tope
→ Pod 45€/n. reason: "Nada ≤20€/n; elegí Pod (45€), lo más cercano al presupuesto."
`;

const hotelsAgent = createAgent({
  model,
  tools: [searchHotelsTool],
  systemPrompt: SYSTEM_PROMPT,
  responseFormat: HotelPickSchema,
});

export async function runHotelsSpecialist(
  ctx: TripContext
): Promise<{ hotel: HotelPick | null }> {
  const {
    destination,
    nights,
    callBudget = 0,
    guidance,
  } = ctx;
  // callBudget llega como € totales del hotel; aquí lo convertimos a €/noche.
  const presupuesto =
    callBudget > 0 && nights > 0
      ? Math.floor(callBudget / nights)
      : 0;
  const hint = guidance?.trim() ? `\nHint: ${guidance}` : "";
  const result = await hotelsAgent.invoke({
    messages: [
      {
        role: "user",
        content: `Destino=${destination}, noches=${nights}. Presupuesto=${presupuesto}.${hint}`,
      },
    ],
  });
  const hotel = (result.structuredResponse as HotelPick) ?? null;
  traceHotelPick(hotel?.id ? hotel : null, nights);
  return { hotel: hotel?.id ? hotel : null };
}
