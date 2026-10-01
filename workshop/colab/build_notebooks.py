#!/usr/bin/env python3
"""Genera los Colabs definitivos desde workshop/ (fuente de verdad)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # workshop/
OUT = Path(__file__).resolve().parent


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def rewrite_imports(src: str) -> str:
    """Ajusta imports ../lib → ./lib para layout plano del Colab."""
    return src.replace('"../lib/', '"./lib/').replace("'../lib/", "'./lib/")


def fence(code: str, lang: str = "typescript") -> str:
    return f"```{lang}\n{code.rstrip()}\n```"


def md_cell(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(text)}


def code_cell(text: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": _lines(text),
    }


def _lines(text: str) -> list[str]:
    if not text.endswith("\n"):
        text += "\n"
    # Jupyter source is list of lines keeping \n
    parts = text.splitlines(keepends=True)
    return parts


def excerpt(src: str, start: str, end: str | None = None) -> str:
    i = src.find(start)
    if i < 0:
        raise ValueError(f"start not found: {start[:40]}")
    if end is None:
        return src[i:].strip()
    j = src.find(end, i + len(start))
    if j < 0:
        return src[i:].strip()
    return src[i:j].strip()


def setup_cell(package_name: str, files: dict[str, str], extras: list[str]) -> str:
    """Node + npm + ficheros del ejemplo (sin API keys)."""
    files_json = json.dumps(files, ensure_ascii=False)
    extras_txt = "\n".join(f"print(\"   {e}\")" for e in extras)
    return f'''# Setup: Node + dependencias + codigo del ejemplo
import json, subprocess
from pathlib import Path

print("1) Node.js...")
subprocess.run("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/tmp/ns.log 2>&1", shell=True)
subprocess.run("apt-get install -y nodejs >/tmp/apt-node.log 2>&1", shell=True)
print("  ", subprocess.check_output(["node", "-v"], text=True).strip(),
      subprocess.check_output(["npm", "-v"], text=True).strip())

print("2) Dependencias...")
Path("package.json").write_text(json.dumps({{
    "name": "{package_name}",
    "private": True,
    "type": "module",
    "dependencies": {{
        "@langchain/core": "^1.2.12",
        "@langchain/langgraph": "^1.4.17",
        "@langchain/openai": "^1.5.13",
        "dotenv": "^18.0.3",
        "langchain": "^1.5.14",
        "tsx": "^4.23.15",
        "zod": "^3.24.2",
    }},
}}, indent=2))
subprocess.run(["npm", "install", "--silent"], check=True)
print("   ok")

print("3) Helpers + ficheros del ejemplo...")
FILES = json.loads({files_json!r})
for path, content in FILES.items():
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
print("   helpers: catalog, types, budget, trace, demos, model, tools, agentes/")
{extras_txt}
print("Listo. Siguiente celda: API keys.")
'''


def api_keys_cell() -> str:
    """Paso propio: OPENAI + LangSmith → .env"""
    return r'''# API keys → .env (necesario antes de ejecutar el ejemplo)
from getpass import getpass
from pathlib import Path

openai = getpass("OPENAI_API_KEY: ")
langsmith = getpass("LANGSMITH_API_KEY (Enter para omitir): ") or ""

env = [f"OPENAI_API_KEY={openai}", "LANGCHAIN_CALLBACKS_BACKGROUND=true"]
if langsmith:
    env += [
        "LANGSMITH_TRACING=true",
        "LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com",
        f"LANGSMITH_API_KEY={langsmith}",
        "LANGSMITH_PROJECT=ia-agentic-workshop-colab",
    ]
else:
    env.append("LANGSMITH_TRACING=false")

Path(".env").write_text("\n".join(env) + "\n")
print("OK → .env escrito" + (" (con LangSmith)" if langsmith else " (sin LangSmith)"))
'''


META = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {"name": "python"},
    "colab": {"provenance": [], "toc_visible": True},
}


def write_nb(name: str, cells: list[dict]) -> None:
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": META,
        "cells": cells,
    }
    path = OUT / name
    path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path} ({len(cells)} cells)")


# ── shared lib ──────────────────────────────────────────────
LIB = {
    "lib/catalog.ts": read("lib/catalog.ts"),
    "lib/types.ts": read("lib/types.ts"),
    "lib/budget.ts": read("lib/budget.ts"),
    "lib/trace.ts": read("lib/trace.ts"),
    "lib/demos.ts": read("lib/demos.ts"),
    "lib/model.ts": read("lib/model.ts"),
    "lib/tools.ts": read("lib/tools.ts"),
    "lib/agentes/flights.ts": read("lib/agentes/flights.ts"),
    "lib/agentes/hotels.ts": read("lib/agentes/hotels.ts"),
    "lib/agentes/leisure.ts": read("lib/agentes/leisure.ts"),
    "lib/agentes/synthesize.ts": read("lib/agentes/synthesize.ts"),
    "lib/agentes/index.ts": read("lib/agentes/index.ts"),
}

tools = read("lib/tools.ts")
react_agent = read("react/react.ts")
flights_src = read("lib/agentes/flights.ts")
hotels_src = read("lib/agentes/hotels.ts")
leisure_src = read("lib/agentes/leisure.ts")
synth_specialist = read("lib/agentes/synthesize.ts")

# ── 01 ReAct ────────────────────────────────────────────────
react_agent_src = rewrite_imports(read("react/react.ts"))
react_run = rewrite_imports(read("react/run.ts")).replace(
    'thread_id: "react-0"',
    'thread_id: "react-colab-0"',
).replace(
    'runName: "workshop-react"',
    'runName: "workshop-react-colab"',
).replace(
    'tags: ["workshop", "react"]',
    'tags: ["workshop", "react", "colab"]',
)

react_files = {
    **LIB,
    "react.ts": react_agent_src,
    "run.ts": react_run,
}
react_agent_snip = excerpt(react_agent, "export const reactTravelAgent")
flights_snip = excerpt(tools, "export const searchFlightsTool", "\nexport const searchHotelsTool")
hotels_snip = excerpt(tools, "export const searchHotelsTool", "\nexport const searchActivitiesTool")
acts_snip = excerpt(tools, "export const searchActivitiesTool", "\nexport const allTravelTools")

write_nb(
    "01_react.ipynb",
    [
        md_cell(
            """# Ejemplo A — ReAct

Un **solo agente** planifica un viaje con tools (vuelos, hoteles, ocio).

**Qué verás:** patrón ReAct, definición de tools, megaprompt y ejecución.

**Caso:** BCN → NYC, 3 noches, 500€ (vuelo + hotel + ocio). El catálogo está calibrado para que **no** quepa todo a la vez."""
        ),
        md_cell(
            """## 1. Preparar el entorno

Node, dependencias y el código del ejemplo (helpers + agente)."""
        ),
        code_cell(
            setup_cell(
                "workshop-react-colab",
                react_files,
                ["ejemplo: react.ts + run.ts"],
            )
        ),
        md_cell(
            """## 2. API keys

Pega tu `OPENAI_API_KEY`. LangSmith es opcional (trazas en eu.smith)."""
        ),
        code_cell(api_keys_cell()),
        md_cell(
            """## 3. ReAct en una frase

El modelo **razona**, **llama tools**, **observa** el resultado y repite hasta responder.

Aquí **todas** las constraints viven en un único system prompt → pedagógicamente demuestra que no escala (olvidos, tradeoffs incoherentes, totales inventados)."""
        ),
        md_cell(
            """## 4. Tools

Cada tool declara **nombre**, **descripción** y **schema** (Zod). El agente decide cuándo llamarlas."""
        ),
        md_cell(f"### `search_flights`\n\nUn solo sentido; para ida+vuelta hay que llamarla **dos veces**.\n\n{fence(flights_snip)}"),
        md_cell(f"### `search_hotels`\n\nHoteles con tope €/noche.\n\n{fence(hotels_snip)}"),
        md_cell(f"### `search_activities`\n\nOcio con precio y duración.\n\n{fence(acts_snip)}"),
        md_cell(
            """### Lista para el agente

```typescript
export const allTravelTools = [
  searchFlightsTool,
  searchHotelsTool,
  searchActivitiesTool,
];
```"""
        ),
        md_cell(
            f"""## 5. Agente (megaprompt) — `react.ts`

Vuelos + hoteles + ocio + budget + formato de oferta comercial… todo en un prompt.

{fence(react_agent_snip)}"""
        ),
        md_cell(
            """## 6. Ejecutar

En LangSmith busca `workshop-react-colab`."""
        ),
        code_cell("!npx tsx run.ts\n"),
        md_cell(
            """## Resumen

| Concepto | Aquí |
|----------|------|
| ReAct | Loop reason → act → observe |
| Tools | 3 tools mock compartidas |
| Debilidad | Un megaprompt no reparte bien constraints |

**Siguiente:** Ejemplo B — Supervisor (especialistas + orquestador)."""
        ),
    ],
)

# ── 02 Supervisor ───────────────────────────────────────────
sup_state = rewrite_imports(read("supervisor/state.ts"))
sup_agent = rewrite_imports(read("supervisor/supervisor.ts"))
sup_run = rewrite_imports(read("supervisor/run.ts")).replace(
    'thread_id: "supervisor-0"',
    'thread_id: "supervisor-colab-0"',
).replace(
    'runName: "workshop-supervisor"',
    'runName: "workshop-supervisor-colab"',
).replace(
    'tags: ["workshop", "supervisor"]',
    'tags: ["workshop", "supervisor", "colab"]',
)

sup_files = {
    **LIB,
    "state.ts": sup_state,
    "supervisor.ts": sup_agent,
    "run.ts": sup_run,
}

decision_snip = excerpt(sup_agent, "const Decision = z.object", "\nexport async function supervisorNode")
supervisor_snip = excerpt(sup_agent, "export async function supervisorNode")
graph_snip = excerpt(sup_run, "const graph = new StateGraph", "\nawait printGraphMermaid")
flights_agent = excerpt(flights_src, "const flightsAgent = createAgent")
hotels_agent = excerpt(hotels_src, "const hotelsAgent = createAgent")
leisure_agent = excerpt(leisure_src, "const leisureAgent = createAgent")
synth_snip = excerpt(synth_specialist, "export async function runSynthesize")

write_nb(
    "02_supervisor.ipynb",
    [
        md_cell(
            """# Ejemplo B — Supervisor

Varios **especialistas** y un **orquestador** que decide a quién llamar.

**Qué verás:** state compartido, decisión estructurada, grafo supervisor ⇄ especialistas → synthesize.

**Caso:** el mismo viaje 500€ / 3 noches. El supervisor **no** replanifica: si el vuelo come el budget, sigue igual (estructura más endeble que Plan-and-Execute)."""
        ),
        md_cell(
            """## 1. Preparar el entorno

Node, dependencias + especialistas + grafo supervisor."""
        ),
        code_cell(
            setup_cell(
                "workshop-supervisor-colab",
                sup_files,
                ["ejemplo: state.ts + supervisor.ts + run.ts"],
            )
        ),
        md_cell(
            """## 2. API keys

Pega tu `OPENAI_API_KEY`. LangSmith es opcional (trazas en eu.smith)."""
        ),
        code_cell(api_keys_cell()),
        md_cell(
            """## 3. Idea del patrón

```text
START → supervisor ⇄ (flights | hotels | leisure) → synthesize → END
```

- El **supervisor** cuida constraints globales (budget total, orden).
- Cada **especialista** aplica su policy de dominio.
- **synthesize** redacta la oferta comercial (no elige opciones nuevas).
- `finish` solo si no es viaje o ya hay oferta — no abortar a medias por pasarse del budget."""
        ),
        md_cell(
            f"""## 4. El state

{fence(sup_state)}"""
        ),
        md_cell(
            f"""## 5. Decisión del supervisor (`supervisor.ts`)

Salida Zod: `next` + hechos (destino, origen, noches, budget).

{fence(decision_snip)}"""
        ),
        md_cell(
            f"""## 6. Nodo supervisor (`supervisor.ts`)

Lee el state, decide `next`. **No** elige vuelo/hotel concretos.

{fence(supervisor_snip)}"""
        ),
        md_cell(
            f"""## 7. El grafo (`run.ts`)

Tras cada especialista → vuelve al supervisor. `synthesize` → `END`.

{fence(graph_snip)}"""
        ),
        md_cell(
            """## 8. Especialistas

Cada uno es un `createAgent` con **su** tool y **su** policy en el system prompt. El human solo pasa hechos (y como mucho un `if` de presupuesto)."""
        ),
        md_cell(f"### Vuelos\n\n{fence(flights_agent)}"),
        md_cell(f"### Hoteles\n\n{fence(hotels_agent)}"),
        md_cell(f"### Ocio\n\n{fence(leisure_agent)}"),
        md_cell(
            f"""## 9. Oferta final

`synthesize` monta la oferta (día a día) a partir del state.

{fence(synth_snip)}"""
        ),
        md_cell(
            """## 10. Ejecutar

LangSmith: `workshop-supervisor-colab`. Observa el bucle supervisor → especialista."""
        ),
        code_cell("!npx tsx run.ts\n"),
        md_cell(
            """## Resumen

| Pieza | Rol |
|-------|-----|
| State | Hechos + `flight` / `hotel` / … |
| Supervisor | Elige `next` + rellena hechos |
| Especialistas | Deciden opciones concretas |
| Debilidad | Sin evaluate/replan → a veces se salta pasos o no corrige un vuelo caro |

**Siguiente:** Ejemplo C — Plan-and-Execute (evaluate + replan + `callBudget`)."""
        ),
    ],
)

# ── 03 Plan-and-Execute ─────────────────────────────────────
pe_state = rewrite_imports(read("planAndExecute/state.ts"))
pe_planner = rewrite_imports(read("planAndExecute/planner.ts"))
pe_evaluate = rewrite_imports(read("planAndExecute/evaluate.ts"))
pe_execute = rewrite_imports(read("planAndExecute/execute.ts"))
pe_run = rewrite_imports(read("planAndExecute/run.ts")).replace(
    'thread_id: "plan-exec-0"',
    'thread_id: "plan-exec-colab-0"',
).replace(
    'runName: "workshop-plan-execute"',
    'runName: "workshop-plan-execute-colab"',
).replace(
    'tags: ["workshop", "plan-execute"]',
    'tags: ["workshop", "plan-execute", "colab"]',
)

pe_files = {
    **LIB,
    "state.ts": pe_state,
    "planner.ts": pe_planner,
    "evaluate.ts": pe_evaluate,
    "execute.ts": pe_execute,
    "run.ts": pe_run,
}

planner_snip = excerpt(pe_planner, "export async function plannerNode")
eval_snip = excerpt(pe_evaluate, "export async function evaluateNode")
pe_graph = excerpt(pe_run, "const graph = new StateGraph", "\nawait printGraphMermaid")
call_budget_snip = excerpt(flights_src, "export async function runFlightsSpecialist")

write_nb(
    "03_plan_and_execute.ipynb",
    [
        md_cell(
            """# Ejemplo C — Plan-and-Execute

**Planner** fija un plan → **execute** paso a paso → **evaluate** (`continue` | `replan` en el mismo nodo).

**Qué verás:** cuando el vuelo come el budget, el evaluador hace **replan** y se re-llaman vuelos con `callBudget≈X`.

**Caso:** el mismo viaje 500€ / 3 noches."""
        ),
        md_cell(
            """## 1. Preparar el entorno

Node, dependencias y el código del ejemplo (planner / evaluate / execute)."""
        ),
        code_cell(
            setup_cell(
                "workshop-plan-execute-colab",
                pe_files,
                ["ejemplo: state.ts + planner.ts + evaluate.ts + execute.ts + run.ts"],
            )
        ),
        md_cell(
            """## 2. API keys

Pega tu `OPENAI_API_KEY`. LangSmith es opcional (trazas en eu.smith)."""
        ),
        code_cell(api_keys_cell()),
        md_cell(
            """## 3. Idea del patrón

```text
START → planner → execute ⇄ evaluate → END
                       ↑ replan (mismo nodo, máx 2)
```

1. Primera pasada de vuelos con `callBudget=0` → mejor por **tiempo**.
2. Si no queda margen hotel → **replan** en evaluate: nuevo plan + `callBudget≈X`.
3. Hotel / ocio / oferta final."""
        ),
        md_cell(
            f"""## 4. El state

Incluye `plan`, `stepIndex`, `replanCount`, `guidance` y `callBudget`.

{fence(pe_state)}"""
        ),
        md_cell(
            f"""## 5. Planner (`planner.ts`)

Extrae hechos y fija el plan inicial (`flights → hotels → leisure → synthesize`).

{fence(planner_snip)}"""
        ),
        md_cell(
            f"""## 6. Evaluate + replan (`evaluate.ts`)

Un solo nodo: `continue` o `replan` (nuevo plan, clear state, `callBudget`).

{fence(eval_snip)}"""
        ),
        md_cell(
            f"""## 7. `callBudget` en el agente de vuelos

Policy en el **system prompt**. El human solo pasa hechos.

{fence(call_budget_snip)}"""
        ),
        md_cell(
            f"""## 8. El grafo (`run.ts`)

{fence(pe_graph)}"""
        ),
        md_cell(
            """## 9. Ejecutar

LangSmith: `workshop-plan-execute-colab`. Busca **Evaluate → replan** y el segundo vuelo con `callBudget≈…`."""
        ),
        code_cell("!npx tsx run.ts\n"),
        md_cell(
            """## Resumen del arco

| Patrón | Fortaleza | Debilidad |
|--------|-----------|-----------|
| **ReAct** | Simple | Megaprompt no escala |
| **Supervisor** | Especialistas + orden | Sin replan → frágil |
| **Plan-and-Execute** | Evaluate+replan + `callBudget` | Un poco más de estructura |

El catálogo mock está hecho para que **tiempo + calidad + 500€** no quepan a la vez."""
        ),
    ],
)

print("done")
