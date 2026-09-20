import { geoMercator, geoPath } from "d3-geo";
import { feature, merge } from "topojson-client";
import type {
  Topology,
  GeometryCollection,
  Polygon as TopoPolygon,
  MultiPolygon as TopoMultiPolygon,
} from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import boundariesTopo from "@/data/geo/boundaries.topo.json";
import neighboursTopo from "@/data/geo/neighbours.topo.json";
import riversTopo from "@/data/geo/rivers.topo.json";
import citiesData from "@/data/geo/cities.json";

/**
 * The map is drawn into a fixed coordinate space rather than measured from the
 * DOM.
 *
 * Two things fall out of that. Projection runs once at module scope instead of
 * on every resize, so it happens during the static build and the client never
 * repeats it. And because the camera is then only an SVG transform over
 * already-projected geometry, moving between steps costs a transform update
 * rather than a full reprojection of every path.
 *
 * The frame is taller than it is wide because Myanmar is: roughly 9 degrees of
 * longitude against 19 of latitude.
 */
export const VIEW = { width: 1000, height: 1150 } as const;

/** Inset that leaves room for neighbouring countries around the country fit. */
const FIT_PADDING: [[number, number], [number, number]] = [
  [120, 60],
  [880, 1090],
];

export interface StateProps {
  name: string;
  kind: "state" | "region";
  altName: string | null;
  id: string;
}

export interface NeighbourProps {
  name: string;
  iso: string;
}

export interface City {
  name: string;
  country: string;
  population: number | null;
  capital: boolean;
  stateCapital: boolean;
  role: "border-crossing" | "refugee-reception" | null;
  coordinates: [number, number];
}

/**
 * Myanmar and its neighbours are separate topologies on purpose.
 *
 * Simplification takes a single weight threshold per topology, derived from
 * every arc in it. With China and Myanmar's townships in the same file, the
 * threshold lands high enough to collapse the small rings, and d3-geo then
 * reads the wreckage as inverted polygons and floods the frame with them.
 * Keeping each scale in its own file keeps each threshold honest.
 */
type Topo = Topology<{ states: GeometryCollection<StateProps> }>;
type NbrTopo = Topology<{ neighbours: GeometryCollection<NeighbourProps> }>;

const topo = boundariesTopo as unknown as Topo;
const nbrTopo = neighboursTopo as unknown as NbrTopo;

export const states = feature(topo, topo.objects.states) as FeatureCollection<
  Geometry,
  StateProps
>;
export const neighbours = feature(nbrTopo, nbrTopo.objects.neighbours) as FeatureCollection<
  Geometry,
  NeighbourProps
>;

/**
 * The national border, dissolved from the states rather than taken from a
 * second source. Two datasets of the same coastline never quite agree, and the
 * disagreement shows up as slivers along the edge of the country.
 */
export const outline: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Myanmar" },
      // merge() only accepts areal geometries; the collection's element type is
      // the broader GeometryObject, so it is narrowed here.
      geometry: merge(
        topo,
        topo.objects.states.geometries as Array<
          TopoPolygon<StateProps> | TopoMultiPolygon<StateProps>
        >,
      ),
    },
  ],
};

const riverTopo = riversTopo as unknown as Topology<{
  rivers: GeometryCollection<{ name: string }>;
}>;
export const rivers = feature(riverTopo, riverTopo.objects.rivers) as FeatureCollection<
  Geometry,
  { name: string }
>;

export const cities = citiesData as City[];

/**
 * Base projection: Myanmar fitted to the frame at camera zoom 1. Every later
 * camera move is expressed relative to this, so zoom 1 always means "the whole
 * country" no matter which step asked for it.
 */
export const projection = geoMercator().fitExtent(FIT_PADDING, outline);

const path = geoPath(projection);

/** Renders a feature to an SVG path string, or null for empty geometry. */
export const toPath = (f: Feature<Geometry, unknown> | FeatureCollection): string =>
  path(f as Parameters<typeof path>[0]) ?? "";

/** Projects a lon/lat pair into frame coordinates. */
export const project = ([lon, lat]: [number, number]): [number, number] =>
  projection([lon, lat]) ?? [0, 0];

/** Frame coordinates of the whole-country framing, used as the default camera. */
export const HOME: { center: [number, number]; zoom: number } = {
  center: [96.5, 19.5],
  zoom: 1,
};

/**
 * Turns a geographic focus into the SVG transform that frames it.
 *
 * The transform origin is the frame origin, matching SVG semantics, so the
 * three operations read right to left: move the focus point to the origin,
 * scale about it, then push it to the centre of the frame.
 */
export function cameraTransform(center: [number, number], zoom: number): string {
  const [px, py] = project(center);
  const tx = VIEW.width / 2;
  const ty = VIEW.height / 2;
  return `translate(${tx} ${ty}) scale(${zoom}) translate(${-px} ${-py})`;
}

/** Screen position of a lon/lat under a given camera, for unscaled overlays. */
export function screenPoint(
  lonlat: [number, number],
  center: [number, number],
  zoom: number,
): [number, number] {
  const [px, py] = project(lonlat);
  const [cx, cy] = project(center);
  return [VIEW.width / 2 + (px - cx) * zoom, VIEW.height / 2 + (py - cy) * zoom];
}
