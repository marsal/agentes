# IA Agentic Workshop

Taller: **planificador de viajes** con LangGraph / LangChain (TypeScript).

| Fase | Patrón | Comando | Colab |
|------|--------|---------|-------|
| A | ReAct | `npm run workshop:a` | `workshop/colab/01_react.ipynb` |
| B | Supervisor / swarm | `npm run workshop:b` | `workshop/colab/02_supervisor.ipynb` |
| C | Plan-and-Execute | `npm run workshop:c` | `workshop/colab/03_plan_and_execute.ipynb` |

## Estructura

```text
workshop/
  lib/                 # común: catalog, tools, agentes/, demos…
  react/run.ts         # ejemplo A
  supervisor/          # ejemplo B (state + run)
  planAndExecute/      # ejemplo C (state + run + evaluate/replan)
  colab/               # notebooks definitivos (+ build_notebooks.py)

slides/
  Agentes-Autonomos-con-TypeScript.pdf   # presentación
  notas-presentacion.md                  # notas de ponente (alineadas al PDF)
```

Cada ejemplo tiene **su state**. En `lib` solo hay piezas compartidas.

## Setup

```bash
npm install
cp .env.example .env   # OPENAI + LangSmith
npm run workshop:a
npm run workshop:b
npm run workshop:c
```

Regenerar Colabs tras cambiar código: `npm run colab:build`.

LangSmith: trazas en `.env` (`LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, proyecto `ia-agentic-workshop`).
