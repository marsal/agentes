/**
 * Catálogo mock BCN ↔ NYC calibrado para 500€ / 3 noches:
 * no hay solución que cumpla tiempo + calidad/centro + ocio a la vez.
 * Mover precios aquí (p.ej. directo más barato) cambia el “drama” del taller.
 * Solo datos — la lógica de búsqueda vive en tools.ts.
 */

export type Flight = {
  id: string;
  from: string;
  to: string;
  price: number;
  airline: string;
  durationHours: number;
  stops: number;
};

export type Hotel = {
  id: string;
  city: string;
  name: string;
  pricePerNight: number;
  stars: number;
  neighborhood: string;
  distanceKmCenter: number;
};

export type Activity = {
  id: string;
  city: string;
  title: string;
  price: number;
  durationHours: number;
  tags: string[];
};

export const FLIGHTS: Flight[] = [
  {
    id: "FL-BCN-NYC-CHEAP",
    from: "BCN",
    to: "NYC",
    price: 95,
    airline: "BudgetAir",
    durationHours: 20,
    stops: 2,
  },
  {
    id: "FL-BCN-NYC-MID",
    from: "BCN",
    to: "NYC",
    price: 165,
    airline: "Level",
    durationHours: 13,
    stops: 1,
  },
  {
    id: "FL-BCN-NYC-DIRECT",
    from: "BCN",
    to: "NYC",
    price: 215,
    airline: "Delta",
    durationHours: 8.5,
    stops: 0,
  },
  {
    id: "FL-NYC-BCN-CHEAP",
    from: "NYC",
    to: "BCN",
    price: 105,
    airline: "BudgetAir",
    durationHours: 21,
    stops: 2,
  },
  {
    id: "FL-NYC-BCN-MID",
    from: "NYC",
    to: "BCN",
    price: 170,
    airline: "Level",
    durationHours: 13.5,
    stops: 1,
  },
  {
    id: "FL-NYC-BCN-DIRECT",
    from: "NYC",
    to: "BCN",
    price: 225,
    airline: "Delta",
    durationHours: 8.2,
    stops: 0,
  },
];

export const HOTELS: Hotel[] = [
  {
    id: "HT-NYC-1",
    city: "NYC",
    name: "Times Budget Pod",
    pricePerNight: 45,
    stars: 1,
    neighborhood: "Midtown",
    distanceKmCenter: 0.8,
  },
  {
    id: "HT-NYC-2",
    city: "NYC",
    name: "Queens Transit Inn",
    pricePerNight: 55,
    stars: 5,
    neighborhood: "Jamaica (Queens)",
    distanceKmCenter: 14,
  },
  {
    id: "HT-NYC-3",
    city: "NYC",
    name: "Brooklyn Mid Stay",
    pricePerNight: 78,
    stars: 3,
    neighborhood: "Bushwick",
    distanceKmCenter: 6,
  },
  {
    id: "HT-NYC-4",
    city: "NYC",
    name: "SoHo Loft Hotel",
    pricePerNight: 125,
    stars: 4,
    neighborhood: "SoHo",
    distanceKmCenter: 1.2,
  },
];

export const ACTIVITIES: Activity[] = [
  {
    id: "AC-NYC-1",
    city: "NYC",
    title: "Central Park walk",
    price: 0,
    durationHours: 2,
    tags: ["free", "outdoors"],
  },
  {
    id: "AC-NYC-2",
    city: "NYC",
    title: "Brooklyn Bridge + DUMBO",
    price: 0,
    durationHours: 2.5,
    tags: ["free", "views"],
  },
  {
    id: "AC-NYC-3",
    city: "NYC",
    title: "MoMA entrada",
    price: 30,
    durationHours: 3,
    tags: ["museum"],
  },
  {
    id: "AC-NYC-4",
    city: "NYC",
    title: "Summit One Vanderbilt",
    price: 42,
    durationHours: 1.5,
    tags: ["views"],
  },
  {
    id: "AC-NYC-5",
    city: "NYC",
    title: "Food tour Lower East Side",
    price: 65,
    durationHours: 3.5,
    tags: ["food"],
  },
  {
    id: "AC-NYC-6",
    city: "NYC",
    title: "Broadway show (categoría barata)",
    price: 89,
    durationHours: 2.5,
    tags: ["show"],
  },
  {
    id: "AC-NYC-7",
    city: "NYC",
    title: "Statue of Liberty + Ellis Island",
    price: 48,
    durationHours: 4,
    tags: ["iconic"],
  },
];
