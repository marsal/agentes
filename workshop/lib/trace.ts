/** Trazas de consola (colores + bloques legibles). */

import type { Flight, Hotel, Activity } from "./catalog.ts";
import type { FlightPick, HotelPick, ActivityPick } from "./types.ts";

export const c = {
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
} as const;

const rule = (ch = "─", n = 60) => `${c.dim}${ch.repeat(n)}${c.reset}`;

export function logSection(icon: string, title: string) {
  console.log(`\n${rule()}`);
  console.log(`${c.bold}${icon}  ${title}${c.reset}`);
  console.log(rule());
}

export function logRequest(text: string) {
  logSection("🗣️", "REQUEST");
  console.log(`   ${text}`);
}

export function logResponse(text: string, meta?: string) {
  logSection("💬", "RESPUESTA");
  for (const line of text.split("\n")) {
    console.log(`   ${line}`);
  }
  if (meta) console.log(`\n   ${c.dim}${meta}${c.reset}`);
}

export function logFinal(text: string) {
  logSection("✨", "TU PROPUESTA DE VIAJE");
  for (const line of text.split("\n")) {
    console.log(`   ${line}`);
  }
}

/** Mensaje final al usuario: oferta comercial, no dump de state. */
export function logOffer(text: string) {
  console.log(`\n${rule("═")}`);
  console.log(`${c.bold}${c.magenta}  ✈  OFERTA LISTA PARA TI${c.reset}`);
  console.log(rule("═"));
  console.log("");
  for (const line of text.split("\n")) {
    console.log(`  ${line}`);
  }
  console.log("");
  console.log(rule("═"));
}

export function logEvent(icon: string, title: string, detail?: string) {
  console.log(
    `\n${c.bold}${icon}  ${title}${c.reset}` +
      (detail ? `  ${c.dim}${detail}${c.reset}` : "")
  );
}

export function logKv(
  rows: Array<[string, string | number | boolean | null | undefined]>
) {
  for (const [k, v] of rows) {
    const shown =
      v === null || v === undefined || v === ""
        ? `${c.dim}—${c.reset}`
        : `${c.cyan}${String(v)}${c.reset}`;
    console.log(`   ${c.dim}│${c.reset}  ${k.padEnd(16)} ${shown}`);
  }
}

export function logPick(icon: string, title: string, lines: string[]) {
  console.log(`\n${c.bold}${icon}  ${title}${c.reset}`);
  for (const line of lines) {
    console.log(`   ${c.dim}│${c.reset}  ${line}`);
  }
}

export function traceFlightPick(flight: FlightPick) {
  logPick("✈️", "Vuelo elegido (ida + vuelta)", [
    `${c.cyan}${flight.from}${c.reset} → ${c.cyan}${flight.to}${c.reset}   ${c.bold}${flight.airline}${c.reset}`,
    `Total ${c.bold}${c.green}${flight.price}€${c.reset}  ·  escalas ~${flight.stops}  ·  ~${flight.durationHours}h`,
    `${c.dim}${flight.reason}${c.reset}`,
  ]);
}

export function traceHotelPick(hotel: HotelPick | null, nights: number) {
  if (!hotel?.id) {
    logPick("🏨", "Hotel elegido", [`${c.red}sin hotel${c.reset}`]);
    return;
  }
  logPick("🏨", "Hotel elegido", [
    `${c.bold}${hotel.name}${c.reset}  ·  ${"★".repeat(hotel.stars)}  ·  ${hotel.neighborhood}`,
    `${hotel.pricePerNight}€/noche × ${nights} = ${c.green}${hotel.pricePerNight * nights}€${c.reset}`,
    `${c.dim}${hotel.reason}${c.reset}`,
  ]);
}

export function traceLeisurePick(activities: ActivityPick[]) {
  logPick(
    "🎭",
    `Ocio · ${activities.length} act.`,
    activities.length
      ? activities.map(
          (a) =>
            `${c.bold}${a.title}${c.reset}  ${c.green}${a.price}€${c.reset}  ${a.durationHours}h  ${c.dim}${a.reason}${c.reset}`
        )
      : [`${c.dim}(ninguna)${c.reset}`]
  );
}

function toolHeader(icon: string, title: string, count: number) {
  console.log(
    `\n${c.bold}${icon}  ${title}${c.reset}  ${c.dim}(${count} resultado${count === 1 ? "" : "s"})${c.reset}`
  );
}

function toolRow(line: string) {
  console.log(`   ${c.dim}│${c.reset}  ${line}`);
}

export function traceFlights(
  origin: string,
  destination: string,
  options: Flight[]
) {
  toolHeader("🛫", `Vuelos  ${origin}  →  ${destination}`, options.length);
  if (options.length === 0) {
    toolRow(`${c.dim}(sin resultados)${c.reset}`);
    return;
  }
  for (const f of options) {
    const stopsLabel =
      f.stops === 0
        ? `${c.green}directo${c.reset}`
        : `${c.yellow}${f.stops} escala${f.stops > 1 ? "s" : ""}${c.reset}`;
    toolRow(
      `${c.cyan}${f.from}${c.reset} → ${c.cyan}${f.to}${c.reset}` +
        `   ${c.green}${f.price}€${c.reset}` +
        `   ${c.yellow}${f.durationHours}h${c.reset}` +
        `   ${stopsLabel}` +
        `   ${c.bold}${f.airline}${c.reset}` +
        `   ${c.dim}${f.id}${c.reset}`
    );
  }
}

export function traceHotels(
  destination: string,
  maxPricePerNight: number,
  options: Hotel[]
) {
  toolHeader(
    "🏨",
    `Hoteles  ${destination}  ·  tope ${maxPricePerNight}€/noche`,
    options.length
  );
  if (options.length === 0) {
    toolRow(`${c.dim}(sin resultados)${c.reset}`);
    return;
  }
  for (const h of options) {
    toolRow(
      `${c.bold}${h.name}${c.reset}` +
        `   ${c.green}${h.pricePerNight}€/noche${c.reset}` +
        `   ${c.yellow}${"★".repeat(h.stars)}${c.reset}` +
        `   ${c.magenta}${h.neighborhood}${c.reset}` +
        `   ${c.cyan}${h.distanceKmCenter} km centro${c.reset}` +
        `   ${c.dim}${h.id}${c.reset}`
    );
  }
}

export function traceActivities(destination: string, options: Activity[]) {
  toolHeader("🎭", `Ocio  ${destination}`, options.length);
  if (options.length === 0) {
    toolRow(`${c.dim}(sin resultados)${c.reset}`);
    return;
  }
  for (const a of options) {
    toolRow(
      `${c.bold}${a.title}${c.reset}` +
        `   ${c.green}${a.price}€${c.reset}` +
        `   ${c.cyan}${a.durationHours}h${c.reset}` +
        `   ${c.dim}${a.tags.join(" · ")}${c.reset}` +
        `   ${c.dim}${a.id}${c.reset}`
    );
  }
}

export function logBudget(total: number, budget: number) {
  const ok = total <= budget;
  const color = ok ? c.green : c.red;
  const delta = total - budget;
  console.log(
    `\n   ${c.bold}💶  Total${c.reset}  ${color}${total}€${c.reset}` +
      `  ${c.dim}/${c.reset}  budget ${c.cyan}${budget}€${c.reset}` +
      `  ${ok ? `${c.green}✓ dentro${c.reset}` : `${c.red}✗ fuera (${delta > 0 ? "+" : ""}${delta}€)${c.reset}`}`
  );
}

export function logTradeoffs(items: string[]) {
  if (!items.length) return;
  logSection("⚖️", "CESIONES / TENSIONES");
  for (const item of items) {
    console.log(`   ${c.yellow}•${c.reset}  ${item}`);
  }
}

export async function printGraphMermaid(
  label: string,
  source: string | { drawMermaid: () => Promise<string> | string }
) {
  logSection("📊", `GRAFO · ${label}`);
  const mermaid =
    typeof source === "string" ? source : await source.drawMermaid();
  for (const line of String(mermaid).trimEnd().split("\n")) {
    console.log(`   ${c.dim}${line}${c.reset}`);
  }
}
