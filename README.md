# IA Agentic Workshop

Taller práctico de **IA agentic** con LangChain / LangGraph (TypeScript): el mismo caso de viaje (BCN → NYC, 3 noches, 500€) resuelto con tres patrones.

| Fase | Patrón | Qué demuestra | Local | Colab |
|------|--------|---------------|-------|-------|
| A | **ReAct** | Un agente + megaprompt: no escala | `npm run workshop:a` | [`01_react.ipynb`](workshop/colab/01_react.ipynb) |
| B | **Supervisor** | Especialistas + orquestador LLM **sin** replan | `npm run workshop:b` | [`02_supervisor.ipynb`](workshop/colab/02_supervisor.ipynb) |
| C | **Plan-and-Execute** | Plan → execute → **evaluate/replan** con `callBudget` | `npm run workshop:c` | [`03_plan_and_execute.ipynb`](workshop/colab/03_plan_and_execute.ipynb) |

Arco pedagógico: **frágil → mejor pero endeble → recupera**.

El catálogo mock está calibrado a propósito: **tiempo + calidad/centro + 500€** no caben a la vez.

---

## Requisitos

- Node.js 20+
- Cuenta OpenAI (`OPENAI_API_KEY`)
- (Opcional) [LangSmith](https://smith.langchain.com/) para ver trazas
- Python 3 solo si regeneras los Colabs (`npm run colab:build`)

---

## Quickstart (local)

```bash
git clone https://github.com/marsal/agentes.git
cd agentes
npm install
cp .env.example .env   # rellena OPENAI_API_KEY (+ LangSmith si quieres)
```

Ejecuta en orden:

```bash
npm run workshop:a   # ReAct
npm run workshop:b   # Supervisor
npm run workshop:c   # Plan-and-Execute
```

Aliases equivalentes: `workshop:react`, `workshop:supervisor`, `workshop:plan`.

En consola verás un Mermaid del grafo y el trace del viaje. Con LangSmith activo, busca los runs:

- `workshop-react`
- `workshop-supervisor`
- `workshop-plan-execute` → trazo **Evaluate → replan** y segundo vuelo con `callBudget≈…`

---

## Quickstart (Colab)

1. Abre el notebook de la fase (01 → 02 → 03).
2. Celda **Preparar el entorno** (Node + deps + código).
3. Celda **API keys** (OpenAI; LangSmith opcional).
4. Lee las celdas de explicación y ejecuta `npx tsx run.ts` al final.

En Colab el proyecto LangSmith es `ia-agentic-workshop-colab` y los `runName` llevan sufijo `-colab`.

---

## Estructura

```text
workshop/
  lib/                    # compartido: catalog, tools, budget, agentes/, …
  react/                  # A — ReAct
  supervisor/             # B — state + supervisor + run
  planAndExecute/         # C — planner, execute, evaluate, state, run
  colab/                  # notebooks (+ build_notebooks.py)
slides/
  Agentes-Autonomos-con-TypeScript.pdf
  notas-presentacion.md   # guion del ponente
```

Cada ejemplo tiene **su state**. En `lib/` solo hay piezas compartidas (catálogo, tools, especialistas, `callBudget` helpers).

Idea clave de presupuesto:

- `budget` = presupuesto **total** del viaje (state).
- `callBudget` = tope de **esta** llamada al especialista (`0` = policy de dominio; `>0` ≈ X€).
- En el **supervisor** se calcula al llamar (no vive en el state).
- En **P&E** vive en el state porque el evaluate lo escribe al replanear.

---

## Configuración (`.env`)

Copia desde `.env.example`:

| Variable | Obligatoria | Notas |
|----------|-------------|--------|
| `OPENAI_API_KEY` | sí | Modelo por defecto: `gpt-4o-mini` (`lib/model.ts`) |
| `LANGSMITH_TRACING` | no | `true` para enviar trazas |
| `LANGSMITH_API_KEY` | no | Si usas LangSmith |
| `LANGSMITH_ENDPOINT` | no | EU: `https://eu.api.smith.langchain.com` |
| `LANGSMITH_PROJECT` | no | p.ej. `ia-agentic-workshop-<tu-nombre>` |

---

## Regenerar Colabs

Tras cambiar código TypeScript del workshop:

```bash
npm run colab:build
```

---

## Presentación

- PDF: [`slides/Agentes-Autonomos-con-TypeScript.pdf`](slides/Agentes-Autonomos-con-TypeScript.pdf)
- Notas de ponente: [`slides/notas-presentacion.md`](slides/notas-presentacion.md)

---

## Licencia

MIT
