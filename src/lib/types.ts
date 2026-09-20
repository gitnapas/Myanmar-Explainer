/**
 * Data model for the narrative.
 *
 * Two rules are enforced by the shape of these types rather than by good
 * intentions:
 *
 *  1. Substantive claims carry `sources`. The field is required, not optional,
 *     so an unsourced assertion is a type error rather than an oversight.
 *  2. Anything territorial carries BOTH a `confidence` and an `asOf` date.
 *     Control in an active war is a snapshot with a shelf life, and a map that
 *     hides its date is making a claim it cannot support.
 */

export type ChapterId =
  | "i-assembled"
  | "ii-consolidate"
  | "iii-1988"
  | "iv-opening"
  | "v-rohingya"
  | "vi-spring"
  | "vii-initiative"
  | "viii-limits"
  | "now";

/** The four visual languages the story switches between. */
export type VisualMode = "map" | "people" | "system" | "network";

/**
 * Evidence strength, used everywhere a spatial or organisational claim is made.
 *
 * `unclear` is a first-class value on purpose: the honest answer for much of
 * Myanmar is that nobody outside the area knows, and the interface has to be
 * able to say so rather than defaulting to a confident-looking fill.
 */
export type Confidence = "documented" | "probable" | "contested" | "unclear";

export type SourceKind =
  | "report"
  | "legal"
  | "academic"
  | "journalism"
  | "data"
  | "primary";

export interface Source {
  id: string;
  publisher: string;
  title: string;
  /** ISO date, or a bare year where that is all the work is dated to. */
  date?: string;
  url?: string;
  kind: SourceKind;
  /** What this source does and does not establish. */
  note?: string;
}

export type ActorType =
  | "military"
  | "government"
  | "interim-government"
  | "political-party"
  | "eao"
  | "resistance"
  | "civil-society"
  | "foreign-state"
  | "bloc"
  | "person";

export interface Actor {
  id: string;
  name: string;
  abbr?: string;
  type: ActorType;
  founded?: string;
  /** ADM1 names from the boundaries layer, or country names for foreign actors. */
  geography?: string[];
  objective?: string;
  armedWing?: string;
  politicalWing?: string;
  significance?: string;
  currentRole?: string;
  sources: string[];
  /** Named fields we could not substantiate, surfaced in the actor card. */
  unresolved?: string[];
}

/**
 * Relationships are deliberately not "ally" or "enemy".
 *
 * Reducing, say, the MNDAA and the Myanmar military to a single edge type
 * loses the thing that actually matters -- that the relationship has been
 * cooperation, open war and Chinese-brokered ceasefire at different moments.
 */
export type RelationshipKind =
  | "cooperates-with"
  | "aligned-on-some-objectives"
  | "politically-distinct"
  | "conflict"
  | "ceasefire"
  | "competitive"
  | "historical"
  | "uncertain";

export interface Relationship {
  from: string;
  to: string;
  kind: RelationshipKind;
  since?: string;
  note?: string;
  confidence: Confidence;
  sources: string[];
}

/** Where the map camera sits for a step. */
export interface MapFocus {
  center: [number, number];
  /** 1 is the whole-country framing; higher numbers move in. */
  zoom: number;
}

export interface Step {
  id: string;
  chapter: ChapterId;
  /** Sortable: ISO date, or YYYY / YYYY-MM where the day is not the point. */
  date: string;
  /** How the date is written in the interface. */
  dateLabel: string;
  title: string;
  mode: VisualMode;
  /** The one sentence a reader must take away. Kept short on purpose. */
  summary: string;
  detail?: string;
  focus?: MapFocus;
  actors?: string[];
  /** Named visual layers this step switches on. */
  layers?: string[];
  sources: string[];
  /** Shown inline when the evidence is thinner than the narrative needs. */
  uncertainty?: string;
  /**
   * One figure worth lifting out of the paragraph.
   *
   * Reserved for numbers that do the explaining by themselves -- a SIM card
   * going from 2,000 dollars to 1.50 says more about what liberalisation
   * meant than a paragraph does. Not a decoration, and not on every step.
   */
  stat?: { value: string; caption: string };
}

export type VisualTone =
  | "colonial"
  | "occupation"
  | "independence"
  | "military"
  | "resistance"
  | "civilian"
  | "warning"
  | "neutral";

export interface StepMapFill {
  /** ADM1 name, neighbouring country name, or the special value `Myanmar`. */
  areas: string[];
  tone: VisualTone;
  label?: string;
  opacity?: number;
}

export interface StepMapActor {
  actor?: string;
  label: string;
  coordinates: [number, number];
  status?: "active" | "assassinated" | "detained" | "deposed" | "excluded";
  flag?: "myanmar" | "burma-1943" | "japan-imperial" | "united-kingdom" | "gambia" | "netherlands";
}

export interface StepMapAnnotation {
  label: string;
  coordinates: [number, number];
  detail?: string;
  tone?: VisualTone;
}

export interface StepMapJourneyStop {
  label: string;
  coordinates: [number, number];
  flag?: "myanmar" | "burma-1943" | "japan-imperial" | "united-kingdom" | "gambia" | "netherlands";
  emphasis?: boolean;
}

export interface StepMapJourney {
  stops: StepMapJourneyStop[];
  caption?: string;
}

export interface GraphicDatum {
  label: string;
  value: number;
  display?: string;
  tone?: VisualTone;
}

export interface StepGraphic {
  type: "bars" | "election" | "parliament" | "media";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  unit?: string;
  total?: number;
  data?: GraphicDatum[];
  overlay?: string;
  file?: string;
  href?: string;
  caption?: string;
  credit?: string;
}

export interface StepVisual {
  step: string;
  map?: {
    fills?: StepMapFill[];
    actors?: StepMapActor[];
    annotations?: StepMapAnnotation[];
    journey?: StepMapJourney;
  };
  graphic?: StepGraphic;
}

export interface Chapter {
  id: ChapterId;
  numeral: string;
  title: string;
  period: string;
  /** Drives the paper/ink shift for the chapter. */
  era: "colonial" | "socialist" | "opening" | "rupture" | "present";
  standfirst: string;
}

/**
 * A territorial claim, pinned to whole ADM1 units.
 *
 * The site deliberately does NOT ship invented control polygons. Drawing a
 * precise front line from imprecise reporting would be the single easiest way
 * to turn this project into misinformation, so claims are made at the
 * resolution the sources actually support -- which state, how strong the
 * evidence, as of when -- and the methodology page says so plainly.
 */
export interface TerritoryClaim {
  id: string;
  /** Required. A control layer without a date is not a finding. */
  asOf: string;
  actor: string;
  /** ADM1 names matching the boundaries layer. */
  areas: string[];
  confidence: Confidence;
  /** What the claim rests on, in one line. */
  basis: string;
  sources: string[];
}

/**
 * An acknowledged hole in the data.
 *
 * These render as visible gaps in the interface. Per the project rule, a
 * labelled absence is preferable to a plausible invention.
 */
export interface DataGap {
  id: string;
  /** What is missing, in the form a researcher could go and fill. */
  needed: string;
  affects: string[];
  why: string;
}

/**
 * A freely-licensed image, fetched by scripts/fetch-images.mjs.
 *
 * Licence, author and source page travel with the file so attribution is a
 * property of the data rather than something to remember at render time.
 */
export interface ActorImage {
  actor: string;
  kind: "portrait" | "emblem";
  file: string;
  title: string;
  licence: string;
  author: string;
  source: string;
}
