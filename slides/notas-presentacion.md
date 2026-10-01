# Notas de ponente — Agentes Autónomos con TypeScript

**PDF:** `slides/Agentes-Autonomos-con-TypeScript.pdf` (11 slides)  
**Taller práctico:** `workshop/` (ReAct → Supervisor → Plan-and-Execute)  
**Colabs:** `workshop/colab/01_react.ipynb` · `02_supervisor.ipynb` · `03_plan_and_execute.ipynb`

> Notas para ti, no para proyectar. Cada sección = una slide del PDF.
> El arco pedagógico del taller: **megaprompt frágil → supervisor endeble → P&E con evaluate/replan**.

---

## Hoja de ruta sugerida

| Bloque | Slides | Enlace al taller |
|--------|--------|------------------|
| Portada + anatomía LangChain | 1–2 | Piezas que luego usa el código |
| Arquitectura + patrones | 3–4 | Cierra en A / B / C del workshop |
| LangGraph | 5–7 | State, nodos, edges (el “cómo”) |
| HITL + time travel | 8–9 | Mencionar; **no** es el centro del taller v2 |
| LangSmith + mapa | 10–11 | Abrir trazas mientras corren los ejemplos |

---

## Slide 1 — Portada

**En pantalla:** *De agentes a sistemas autónomos · Orquestación de agentes especializados con LangChain y LangGraph*

**Notas:**
- Mensaje de apertura: no vamos a “hacer un chatbot”, vamos a **orquestar** roles con un flujo explícito.
- Promesa: LangChain = piezas · LangGraph = control · taller = tres patrones con el **mismo** caso de viaje (BCN→NYC, 500€, 3 noches).
- El catálogo mock está calibrado para que **tiempo + calidad + budget no quepan a la vez** → la tensión es didáctica.

**Transición:** “Antes del grafo, las 5 piezas con las que se construye un agente.”

---

## Slide 2 — LangChain: anatomía de un agente

**En pantalla:** Modelo · Messages · Tools · System prompt · Structured output

**Notas (pieza a pieza):**
- **Modelo:** motor de decisión (aquí `gpt-4o-mini`). No “entiende el mundo”; elige tokens según contexto.
- **Messages:** memoria de la interacción. En ReAct veréis el loop crecer mensaje a mensaje.
- **Tools:** unique source of truth de precios (catálogo mock). Regla de oro del taller: **no inventar** fuera de tools.
- **System prompt:** reglas del juego. En el ejemplo A está *todo* metido ahí (megaprompt) a propósito.
- **Structured output (Zod):** en B/C los especialistas y el supervisor/evaluador devuelven objetos tipados (`next`, picks, verdicts).

**Gancho:** “Con estas piezas ya montas un agente. El problema es *quién decide el siguiente paso*.”

---

## Slide 3 — Elegir la arquitectura correcta

**En pantalla:** Flujo determinista · Agente con tools · Flujo orquestado

**Notas:**
- **Determinista:** tú fijas el camino (if/else, pipeline). Previsible; el LLM solo rellena huecos.
- **Agente con tools:** un rol, el modelo decide *qué* tool y *cuándo* → ReAct del ejemplo A.
- **Orquestado:** varias etapas/roles y la arquitectura hace explícito el flujo → Supervisor y Plan-and-Execute.

**Frase clave:** no es que una sea “mejor”; es **encajar control vs flexibilidad**. El taller enseña el coste de cada elección.

**Transición:** “Tres patrones clásicos que vais a ver en código.”

---

## Slide 4 — Patrones de diseño

**En pantalla:** ReAct · Plan & Execute · Multi-agente

**Notas — mapear al taller (orden pedagógico):**

| Patrón en slide | Ejemplo | Qué debe quedar |
|-----------------|---------|-----------------|
| **ReAct** | `npm run workshop:a` / Colab 01 | Reason→Act→Observe. Un solo agente, megaprompt. Se lía / no escala. |
| **Multi-agente** | `npm run workshop:b` / Colab 02 | Supervisor + especialistas. Mejor, pero el orquestador es un LLM **sin** replan → a veces se vuelve loco. |
| **Plan & Execute** | `npm run workshop:c` / Colab 03 | Plan → execute → **evaluate** → **replan** con `callBudget≈X` (sugerencia). Aquí sí se recupera. |

**Importante (tu guion interno):**
- En la slide el orden es ReAct → P&E → Multi-agente.
- En el **taller** el orden es ReAct → Supervisor (multi-agente) → P&E, porque P&E es el “cierre” con evaluate/replan.
- Dilo en voz alta para no liar: “En la teoría los presentamos juntos; en el lab el arco es A→B→C.”

**Detalle P&E que mola contar:** 1ª pasada de vuelos sin tope (`callBudget=0` → prioriza tiempo); si el hotel no cabe → replan y vuelos otra vez con orientación de precio.

---

## Slide 5 — LangGraph: del patrón al grafo

**En pantalla:** *Del patrón al grafo · Una arquitectura explícita para modelar el flujo*

**Notas:**
- Un patrón es una idea; LangGraph es **hacerla dibujable y ejecutable**.
- Grafo = nodos (trabajo) + edges (qué sigue) + state (lo que se va acumulando).
- Ventaja frente a “un agent loop opaco”: ves el Mermaid en consola al arrancar cada ejemplo.

**Transición:** “¿Qué piezas internas tiene ese grafo?”

---

## Slide 6 — LangGraph: piezas de la orquestación

**En pantalla:** (diagrama — state / nodes / edges / conditional / checkpointer… según arte)

**Notas (aunque el PDF sea muy visual):**
- **State (Annotation):** canales tipados (`flight`, `hotel`, `budget`, `plan`, `callBudget`…).
- **Node:** función async que lee state y devuelve un patch.
- **Edge / conditional edge:** el router (`supervisor → flights|hotels|…`, `evaluate → continue|replan|synthesize`).
- **Checkpointer (`MemorySaver`):** thread_id por run; base para HITL y time travel (slides 8–9).

**Puente al código:** en B el state vive en `supervisor/state.ts`; en C en `planAndExecute/state.ts`. `lib/` solo tiene piezas compartidas.

---

## Slide 7 — (visual / detalle de grafo)

**En pantalla:** (poco o nada de texto extraído — slide gráfica)

**Notas:**
- Úsala como **pausa visual**: señalar START, nodos, END.
- Si preguntas: “¿dónde está la inteligencia?” → en los nodos LLM; “¿dónde está el control?” → en edges y heurísticas (evaluate).
- Opcional: proyectar 10s el Mermaid de consola del ejemplo B o C.

---

## Slide 8 — Human-in-the-loop

**En pantalla:** *Interrupt, revisión y reanudación de la ejecución*

**Notas:**
- Idea: el grafo puede **pausar**, un humano revisa, y se reanuda con el mismo thread.
- En este taller v2 **no** montamos HITL (se aparcó a propósito para caber en ~2h).
- Frase honesta: “Es la guinda del checkpointer, no el pastel de hoy.” Si alguien pregunta, LangGraph `interrupt` + Studio/LangSmith.

---

## Slide 9 — Navegar por la ejecución

**En pantalla:** *Explora alternativas sin perder el contexto*

**Notas:**
- Time travel / branches: volver a un checkpoint y probar otro camino.
- Conexión con P&E: el **replan** es una forma *automática* de “otro camino”; el time travel es la versión *humana/exploratoria*.
- No hace falta demo profunda: 30s conceptuales bastan.

---

## Slide 10 — Observabilidad con LangSmith

**En pantalla:** Trazabilidad · Diagnóstico · Calidad

**Notas:**
- **Trazabilidad:** cada tool call y cada nodo del grafo.
- **Diagnóstico:** “¿por qué eligió Delta 440€?” → abrir el run.
- **Calidad:** evals (hoy solo mencionar).
- Práctica: con `.env` (`LANGSMITH_TRACING`, proyecto `ia-agentic-workshop`) los runs se llaman:
  - `workshop-v2-react-0` / `…-colab-0`
  - `workshop-v2-supervisor-…`
  - `workshop-v2-plan-execute-…`
- En P&E pedid buscar el trazo **Evaluate → replan** y el segundo vuelo con `callBudget≈…`.

---

## Slide 11 — El mapa completo

**En pantalla:** *El mapa completo* (síntesis visual)

**Notas — cierre en 60–90s:**
1. Piezas LangChain → agente.
2. Patrón → estrategia.
3. LangGraph → estrategia controlable.
4. LangSmith → ver qué pasó.
5. Taller: **A frágil · B mejor pero endeble · C recupera con evaluate/replan**.

**CTA:** abrir Colab 01 / `npm run workshop:a` y que vean el megaprompt fallar con elegancia.

---

## Cheat-sheet comandos

```bash
npm install
cp .env.example .env   # OPENAI + LangSmith

npm run workshop:a     # ReAct
npm run workshop:b     # Supervisor
npm run workshop:c     # Plan-and-Execute

# Regenerar Colabs tras cambiar código:
python3 workshop/colab/build_notebooks.py
```

## Recordatorios rápidos (si se tuerce la live)

- Origen `Barcelona` vs `BCN`: el catálogo normaliza aliases; igual pedid códigos cortos.
- Supervisor que hace `finish` a medias: ya endurecido en prompt (debe ir a leisure → synthesize).
- Hotel inventado: el especialista de hoteles solo elige resultados de `search_hotels`.
- `callBudget` es **sugerencia**, no techo duro; el techo “duro” pedagógico es el budget total del viaje + evaluate.
