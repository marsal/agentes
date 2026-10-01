/**
 * Tools de viaje: lógica de búsqueda + datos al trace.
 * El formateo de consola vive en trace.ts.
 */
import { tool } from "langchain";
import { z } from "zod";
import { FLIGHTS, HOTELS, ACTIVITIES } from "./catalog.ts";
import { traceFlights, traceHotels, traceActivities } from "./trace.ts";

const CITY_ALIASES: Record<string, string> = {
  "nueva york": "NYC",
  "new york": "NYC",
  nyc: "NYC",
  jfk: "NYC",
  ewr: "NYC",
  barcelona: "BCN",
  bcn: "BCN",
};

function city(text: string): string {
  const key = text.trim().toLowerCase();
  return CITY_ALIASES[key] ?? text.trim().toUpperCase().slice(0, 3);
}

export const searchFlightsTool = tool(
  ({ destination, origin }: { destination: string; origin: string }) => {
    const to = city(destination);
    const from = city(origin);
    const options = FLIGHTS.filter((f) => f.to === to && f.from === from);
    traceFlights(from, to, options);
    return JSON.stringify(options);
  },
  {
    name: "search_flights",
    description:
      "Busca vuelos mock entre origin y destination. Cada tramo incluye price, durationHours, stops, airline.",
    schema: z.object({
      destination: z
        .string()
        .describe("Ciudad o código destino, ej. Nueva York / NYC"),
      origin: z.string().describe("Ciudad o código origen, ej. BCN"),
    }),
  }
);

export const searchHotelsTool = tool(
  ({
    destination,
    maxPricePerNight,
  }: {
    destination: string;
    maxPricePerNight: number;
  }) => {
    const dest = city(destination);
    const options = HOTELS.filter(
      (h) => h.city === dest && h.pricePerNight <= maxPricePerNight
    );
    traceHotels(dest, maxPricePerNight, options);
    return JSON.stringify(options);
  },
  {
    name: "search_hotels",
    description:
      "Busca hoteles mock. Incluye stars, distanceKmCenter, neighborhood, pricePerNight.",
    schema: z.object({
      destination: z.string().describe("Ciudad o código, ej. NYC"),
      maxPricePerNight: z
        .number()
        .describe("Precio máximo por noche en EUR (ej. 200)"),
    }),
  }
);

export const searchActivitiesTool = tool(
  ({ destination }: { destination: string }) => {
    const dest = city(destination);
    const options = ACTIVITIES.filter((a) => a.city === dest);
    traceActivities(dest, options);
    return JSON.stringify(options);
  },
  {
    name: "search_activities",
    description:
      "Busca actividades mock. Incluye durationHours y price. Cada tramo mañana/tarde aguanta ~3h; >3h ocupa el día entero.",
    schema: z.object({
      destination: z.string().describe("Ciudad o código, ej. NYC"),
    }),
  }
);

export const allTravelTools = [
  searchFlightsTool,
  searchHotelsTool,
  searchActivitiesTool,
];
