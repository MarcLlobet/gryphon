/**
 * The guided "add a layer" form, described as data.
 *
 * Fields are declared per layer type and assembled back into a config object that is
 * validated by the very same schema the document uses. The form therefore cannot
 * produce something the renderers would reject — and adding a protocol means adding
 * a field list here, not a new component.
 */
import { LayerSchema, type LayerConfig, type LayerType } from "@/core/config/schema";
import type { ConfigIssue } from "@/core/config/parse";
import { toIssues } from "@/core/config/parse";
import { err, ok, type Result } from "@/core/result";
import { isIconName } from "@/features/layers/icons";

export interface FormField {
  readonly name: string;
  readonly label: string;
  readonly kind: "text" | "url" | "number" | "select" | "checkbox";
  readonly options?: readonly string[];
  readonly placeholder?: string;
  readonly help?: string;
  readonly required?: boolean;
}

export type FormValues = Record<string, string | boolean>;

const DRAW_OPTIONS = ["circle", "line", "fill", "heatmap", "symbol"] as const;

const identity: FormField[] = [
  { name: "id", label: "Identifier", kind: "text", required: true, placeholder: "firms-fires" },
  { name: "title", label: "Title", kind: "text", required: true, placeholder: "Active fire" },
  {
    name: "icon",
    label: "Icon",
    kind: "text",
    placeholder: "flame",
    help: "Optional. Any Lucide icon name, from lucide.dev/icons.",
  },
];

export const fieldsFor: Record<LayerType, readonly FormField[]> = {
  geojson: [
    ...identity,
    { name: "url", label: "GeoJSON URL", kind: "url", required: true },
    { name: "draw", label: "Draw as", kind: "select", options: DRAW_OPTIONS },
    { name: "color", label: "Colour", kind: "text", placeholder: "#fca50a" },
    { name: "radius", label: "Radius", kind: "number", help: "Circle radius in pixels." },
  ],
  raster: [
    ...identity,
    {
      name: "tiles",
      label: "Tile template",
      kind: "text",
      required: true,
      placeholder: "https://…/{z}/{x}/{y}.png",
      help: "Several templates may be separated by commas.",
    },
    { name: "tileSize", label: "Tile size", kind: "number", placeholder: "256" },
  ],
  vector: [
    ...identity,
    { name: "tiles", label: "Tile template", kind: "text", required: true, placeholder: "https://…/{z}/{x}/{y}.pbf" },
    { name: "sourceLayer", label: "Layer inside the tile", kind: "text", required: true },
    { name: "draw", label: "Draw as", kind: "select", options: DRAW_OPTIONS },
    { name: "color", label: "Colour", kind: "text", placeholder: "#fca50a" },
  ],
  csv: [
    ...identity,
    { name: "url", label: "CSV URL", kind: "url", required: true },
    { name: "lat", label: "Latitude column", kind: "text", required: true, placeholder: "latitude" },
    { name: "lon", label: "Longitude column", kind: "text", required: true, placeholder: "longitude" },
    { name: "draw", label: "Draw as", kind: "select", options: DRAW_OPTIONS },
    {
      name: "authName",
      label: "Credential name",
      kind: "text",
      placeholder: "MAP_KEY",
      help: "Leave empty for an open source. The value is asked for separately and never saved.",
    },
    { name: "authIn", label: "Sent as", kind: "select", options: ["query", "header"] },
  ],
  image: [
    ...identity,
    { name: "url", label: "Image URL", kind: "url", required: true },
    {
      name: "bbox",
      label: "Area",
      kind: "text",
      required: true,
      placeholder: "west,south,east,north",
      help: "The image is stretched to these bounds, in degrees.",
    },
  ],
  stac: [
    ...identity,
    { name: "endpoint", label: "STAC API root", kind: "url", required: true },
    { name: "tiler", label: "Tiler root", kind: "url", required: true },
    { name: "collection", label: "Collection", kind: "text", required: true },
    { name: "assets", label: "Assets", kind: "text", required: true, help: "Comma separated." },
    { name: "colormap", label: "Colour map", kind: "text", placeholder: "inferno" },
    { name: "rescaleMin", label: "Rescale from", kind: "number" },
    { name: "rescaleMax", label: "Rescale to", kind: "number" },
    { name: "maxCloudCover", label: "Max cloud cover %", kind: "number" },
    { name: "footprints", label: "Show scene footprints", kind: "checkbox" },
    {
      name: "authName",
      label: "Credential name",
      kind: "text",
      placeholder: "api_key",
      help: "For a commercial catalog. The value is asked for separately and never saved.",
    },
    { name: "authIn", label: "Sent as", kind: "select", options: ["query", "header"] },
  ],
};

/**
 * A working, keyless example per protocol. The form opens with one filled in, so an
 * author sees what a layer needs by looking at a real one. A test builds each through
 * the schema, so none of them can drift into something the app would reject.
 */
export const EXAMPLE_VALUES: Record<LayerType, FormValues> = {
  geojson: {
    id: "example-quakes",
    icon: "activity",
    title: "Earthquakes M4.5+, past week",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
    draw: "circle",
    color: "#ffc93c",
    radius: "6",
  },
  raster: {
    id: "example-osm",
    icon: "map",
    title: "OpenStreetMap",
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileSize: "256",
  },
  vector: {
    id: "example-countries",
    icon: "globe",
    title: "Country outlines",
    tiles: "https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf",
    sourceLayer: "countries",
    draw: "line",
    color: "#7dd3fc",
  },
  csv: {
    id: "example-quakes-csv",
    icon: "table",
    title: "Earthquakes M4.5+ from CSV",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.csv",
    lat: "latitude",
    lon: "longitude",
    draw: "circle",
    authName: "",
    authIn: "query",
  },
  image: {
    id: "example-radar",
    icon: "cloud-lightning",
    title: "Weather radar snapshot",
    url: "https://maplibre.org/maplibre-gl-js/docs/assets/radar.gif",
    bbox: "-80.425,37.936,-71.516,46.437",
  },
  stac: {
    id: "example-sentinel-2",
    icon: "satellite",
    title: "Sentinel-2 true colour",
    endpoint: "https://planetarycomputer.microsoft.com/api/stac/v1",
    tiler: "https://planetarycomputer.microsoft.com/api/data/v1",
    collection: "sentinel-2-l2a",
    assets: "visual",
    colormap: "",
    rescaleMin: "",
    rescaleMax: "",
    maxCloudCover: "10",
    footprints: true,
    authName: "",
    authIn: "query",
  },
};

/** Every field of a protocol, emptied: what "Clear the form" resets to. */
export const emptyValues = (type: LayerType): FormValues =>
  Object.fromEntries(fieldsFor[type].map((field) => [field.name, field.kind === "checkbox" ? false : ""]));

const text = (values: FormValues, name: string): string | undefined => {
  const value = values[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

const list = (values: FormValues, name: string): string[] | undefined =>
  text(values, name)
    ?.split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

const number = (values: FormValues, name: string): number | undefined => {
  const raw = text(values, name);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const styleOf = (values: FormValues) => {
  const style = { color: text(values, "color"), radius: number(values, "radius") };
  return style.color === undefined && style.radius === undefined ? undefined : style;
};

const authOf = (values: FormValues) => {
  const name = text(values, "authName");
  return name === undefined ? undefined : { in: text(values, "authIn") ?? "query", name };
};

const cornersFrom = (bbox: string | undefined) => {
  const parts = bbox?.split(",").map((part) => Number(part.trim()));
  if (parts?.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }
  const [west, south, east, north] = parts as [number, number, number, number];
  // MapLibre wants the four corners clockwise from the top left.
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
};

/** Assembles the flat form values into the nested shape the schema describes. */
export const toLayerCandidate = (type: LayerType, values: FormValues): Record<string, unknown> => {
  const base = { id: text(values, "id"), title: text(values, "title"), icon: text(values, "icon"), type };

  switch (type) {
    case "geojson":
      return { ...base, url: text(values, "url"), draw: text(values, "draw"), style: styleOf(values) };
    case "raster":
      return { ...base, tiles: list(values, "tiles"), tileSize: number(values, "tileSize") };
    case "vector":
      return {
        ...base,
        tiles: list(values, "tiles"),
        sourceLayer: text(values, "sourceLayer"),
        draw: text(values, "draw"),
        style: styleOf(values),
      };
    case "csv":
      return {
        ...base,
        url: text(values, "url"),
        lat: text(values, "lat"),
        lon: text(values, "lon"),
        draw: text(values, "draw"),
        auth: authOf(values),
      };
    case "image":
      return { ...base, url: text(values, "url"), coordinates: cornersFrom(text(values, "bbox")) };
    case "stac": {
      const min = number(values, "rescaleMin");
      const max = number(values, "rescaleMax");
      return {
        ...base,
        endpoint: text(values, "endpoint"),
        tiler: text(values, "tiler"),
        collection: text(values, "collection"),
        render: {
          assets: list(values, "assets"),
          colormap_name: text(values, "colormap"),
          rescale: min === undefined || max === undefined ? undefined : [[min, max]],
        },
        maxCloudCover: number(values, "maxCloudCover"),
        footprints: values["footprints"] === true,
        auth: authOf(values),
      };
    }
  }
};

/** Config paths the schema reports, mapped back to the field the user can actually fix. */
const FIELD_BY_PATH: Record<string, string> = {
  "render/assets": "assets",
  "render/colormap_name": "colormap",
  "render/rescale": "rescaleMin",
  "render/rescale/0/0": "rescaleMin",
  "render/rescale/0/1": "rescaleMax",
  coordinates: "bbox",
  "style/color": "color",
  "style/radius": "radius",
  "auth/name": "authName",
  "auth/in": "authIn",
  tiles: "tiles",
};

export const fieldForIssue = (issue: ConfigIssue): string =>
  FIELD_BY_PATH[issue.path] ?? issue.path.split("/")[0] ?? "";

/**
 * The one validation path. A layer produced here is parsed by the document's own
 * schema, so the form can never add something the renderers would reject.
 */
export const buildLayer = (type: LayerType, values: FormValues): Result<LayerConfig, ConfigIssue[]> => {
  const parsed = LayerSchema.safeParse(toLayerCandidate(type, values));
  if (!parsed.success) {
    return err(toIssues(parsed.error));
  }
  // The schema checks the name's shape; only the icon set knows whether it exists.
  if (parsed.data.icon !== undefined && !isIconName(parsed.data.icon)) {
    return err([{ path: "icon", message: `"${parsed.data.icon}" is not a Lucide icon. Browse lucide.dev/icons.` }]);
  }
  return ok(parsed.data);
};

const str = (value: unknown): string => (value === undefined || value === null ? "" : String(value));

/**
 * The inverse of `toLayerCandidate`: a stored layer back into the form's flat values,
 * so a layer can be shown in exactly the form that would have created it.
 */
export const toFormValues = (layer: LayerConfig): FormValues => {
  const base = { id: layer.id, title: layer.title, icon: str(layer.icon) };
  const auth =
    "auth" in layer && layer.auth
      ? { authName: layer.auth.name, authIn: layer.auth.in }
      : { authName: "", authIn: "query" };

  switch (layer.type) {
    case "geojson":
      return {
        ...base,
        url: str(layer.url),
        draw: layer.draw,
        color: str(layer.style.color),
        radius: str(layer.style.radius),
      };
    case "raster":
      return { ...base, tiles: layer.tiles.join(", "), tileSize: str(layer.tileSize) };
    case "vector":
      return {
        ...base,
        tiles: layer.tiles.join(", "),
        sourceLayer: layer.sourceLayer,
        draw: layer.draw,
        color: str(layer.style.color),
      };
    case "csv":
      return { ...base, url: layer.url, lat: layer.lat, lon: layer.lon, draw: layer.draw, ...auth };
    case "image": {
      // Corners are stored clockwise from the top left; the form asks for west,south,east,north.
      const [topLeft, , bottomRight] = layer.coordinates;
      return { ...base, url: layer.url, bbox: [topLeft[0], bottomRight[1], bottomRight[0], topLeft[1]].join(",") };
    }
    case "stac": {
      const [rescale] = layer.render.rescale ?? [];
      return {
        ...base,
        endpoint: layer.endpoint,
        tiler: layer.tiler,
        collection: layer.collection,
        assets: layer.render.assets.join(", "),
        colormap: str(layer.render.colormap_name),
        rescaleMin: str(rescale?.[0]),
        rescaleMax: str(rescale?.[1]),
        maxCloudCover: str(layer.maxCloudCover),
        footprints: layer.footprints,
        ...auth,
      };
    }
  }
};

/** Paths each form already shows, per protocol. Everything else is an extra. */
const SHOWN: Record<LayerType, readonly string[]> = {
  geojson: ["url", "draw", "style.color", "style.radius"],
  raster: ["tiles", "tileSize"],
  vector: ["tiles", "sourceLayer", "draw", "style.color"],
  csv: ["url", "lat", "lon", "draw", "auth"],
  image: ["url", "coordinates"],
  stac: [
    "endpoint",
    "tiler",
    "collection",
    "render.assets",
    "render.colormap_name",
    "render.rescale",
    "maxCloudCover",
    "footprints",
    "auth",
  ],
};

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);

/**
 * Whatever a layer declares beyond the form's fields (legend, opacity, preload, a
 * data-driven style…), so the read-only view shows the layer exactly as it is.
 */
export const extrasOf = (layer: LayerConfig): Record<string, unknown> => {
  const extras = JSON.parse(JSON.stringify(layer)) as Record<string, unknown>;
  for (const key of ["id", "title", "icon", "type"]) delete extras[key];
  for (const path of SHOWN[layer.type]) {
    const [head, tail] = path.split(".") as [string, string | undefined];
    if (tail === undefined) {
      delete extras[head];
    } else if (typeof extras[head] === "object" && extras[head] !== null) {
      delete (extras[head] as Record<string, unknown>)[tail];
    }
  }
  return Object.fromEntries(Object.entries(extras).filter(([, value]) => !isEmpty(value)));
};
