import { model } from "../model.ts";
import { TripContext } from "../types.ts";
import { logBudget, logOffer } from "../trace.ts";

// Copy final: no tools; totales se calculan aquí (no le pedimos al LLM que sume).
const OFFER_PROMPT = `Eres copywriter de una agencia de viajes. Redactas la OFERTA FINAL para el cliente.
No eres un sistema técnico: no hables de state, JSON, slots, agentes ni cesiones frías.

Tono: comercial, cálido, claro, en español. Como un email/WhatsApp premium de la agencia.
Usa emojis con gusto (✈️ 🏨 🎭 📅 💶 ✅ ⚠️) en títulos y bullets.
Prohibido: JSON, markdown de plantilla vacía, tablas técnicas, IDs de catálogo (FL-…, HT-…).

Estructura sugerida (adapta con naturalidad):

🎉 ¡Tu viaje a {destino} está listo!
Una frase de enganche (noches, desde dónde, vibe).

✈️ Vuelos
Ida y vuelta en prosa: aerolínea, si es directo o escalas, tiempo aprox, precio total ida+vuelta.
Si hubo tradeoff, una frase suave ("priorizamos tiempo / ahorramos para el hotel…").

🏨 Alojamiento
Nombre, estrellas, barrio, distancia al centro en lenguaje humano, precio/noche y total noches.
Frase de por qué encaja.

📅 Tu plan día a día
Desglosa el viaje por días (usa las noches del JSON):
- Día 1: llegada / traslado + qué hacer si cabe
- Días intermedios: mañana y tarde con las actividades elegidas repartidas con sentido
- Último día: salida / vuelta
No inventes actividades que no estén en el JSON; puedes dejar tramos libres (pasear, hotel…).

🎭 Experiencias (resumen)
Lista corta de lo incluido con duración y precio (o "gratis").

💶 Resumen
Desglose breve + total vs presupuesto, con ✅ o aviso si se pasa.

💡 Nota de la agencia
1–3 bullets honestos de lo que se priorizó o se sacrificó, en tono de asesor.

Máx ~35 líneas. Solo datos del JSON de entrada; no inventes vuelos/hoteles/precios/actividades.`;

export async function runSynthesize(
  ctx: TripContext
): Promise<{ finalItinerary: string }> {
  const hotelTotal =
    (ctx.hotel?.pricePerNight ?? 0) * (ctx.nights || 0);
  const activitiesTotal = (ctx.activities ?? []).reduce(
    (s, a) => s + a.price,
    0
  );
  const flightTotal = ctx.flight?.price ?? 0;
  const total = flightTotal + hotelTotal + activitiesTotal;

  const response = await model.invoke([
    {
      role: "system",
      content: OFFER_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify({
        request: ctx.userRequest,
        destination: ctx.destination,
        nights: ctx.nights,
        budget: ctx.budget,
        flight: ctx.flight,
        hotel: ctx.hotel,
        hotelTotal,
        activities: ctx.activities,
        activitiesTotal,
        estimatedTotal: total,
      }),
    },
  ]);

  const text = response.content.toString().trim();
  logOffer(text);
  logBudget(total, ctx.budget);
  return { finalItinerary: text };
}
