import { createAgent } from "langchain";
import { model } from "../model.ts";
import { searchActivitiesTool } from "../tools.ts";
import {
  TripContext,
  ActivityPick,
  LeisureOutSchema,
} from "../types.ts";
import { traceLeisurePick } from "../trace.ts";

// callBudget aquí = € totales de ocio (normalmente el remaining tras vuelo+hotel).
const SYSTEM_PROMPT = `Eres el especialista de OCIO de una agencia.
Tu único trabajo: elegir actividades en el destino.
No inventes actividades, precios ni IDs: solo datos de search_activities.

# Procedimiento
1. Llama search_activities.
2. Elige actividades siguiendo las políticas de selección listadas a continuación.

# Políticas de selección
Lee el presupuesto del mensaje (y "Hint:" si viene).
Tiempo: días de ocio ≈ noches − 1; mañana+tarde ~3h; >3h = día entero.
reason de cada actividad: mañana/tarde/duración (no "slots").

- Default / presupuesto = 0:
  Mejores actividades que quepan en tiempo. El precio es secundario.

- presupuesto > 0 (~X€ totales para el ocio):
  Que quepan en € (suma ≤ presupuesto) y en tiempo.
  Si no cabe nada de pago: free / más baratas.

- Si hay "Hint:": esa instrucción manda sobre el default.
`;

const leisureAgent = createAgent({
  model,
  tools: [searchActivitiesTool],
  systemPrompt: SYSTEM_PROMPT,
  responseFormat: LeisureOutSchema,
});

export async function runLeisureSpecialist(
  ctx: TripContext
): Promise<{ activities: ActivityPick[] }> {
  const {
    destination,
    nights,
    callBudget = 0,
    guidance,
  } = ctx;
  const hint = guidance?.trim() ? `\nHint: ${guidance}` : "";
  const result = await leisureAgent.invoke({
    messages: [
      {
        role: "user",
        content: `Destino=${destination}, noches=${nights}. Presupuesto=${callBudget}.${hint}`,
      },
    ],
  });
  const activities = (result.structuredResponse?.activities ??
    []) as ActivityPick[];
  traceLeisurePick(activities);
  return { activities };
}
