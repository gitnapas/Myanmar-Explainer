import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";

import worldTopology from "@/data/geo/world-110m.json";

const topology = worldTopology as unknown as Parameters<typeof feature>[0];
const countriesObject = (worldTopology as unknown as { objects: { countries: object } }).objects.countries;

export const WORLD_VIEW = { width: 1000, height: 1150 } as const;
export const worldCountries = feature(topology, countriesObject as never) as unknown as FeatureCollection;
export const worldProjection = geoNaturalEarth1()
  .fitExtent([[38, 110], [WORLD_VIEW.width - 38, WORLD_VIEW.height - 135]], worldCountries)
  .precision(0.25);
export const worldPath = geoPath(worldProjection);
