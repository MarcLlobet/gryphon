/**
 * The document Gryphon boots from when a client supplies nothing.
 *
 * Every source here is keyless and CORS-reachable from the browser, so the app is
 * useful on first paint with no setup. Sources that need a credential — NASA FIRMS,
 * say — are added through the in-app form, where the secret stays in memory.
 */
import { DEFAULT_BBOX } from "@/core/geo/bbox";
import { celsiusToDn, THERMAL_RANGE_CELSIUS } from "@/core/render/temperature";
import { DEFAULT_BASEMAP, type GryphonConfigInput } from "./schema";

/** A perceptually uniform black → purple → orange → yellow heat palette. */
const INFERNO = ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"];

const PLANETARY_COMPUTER = "https://planetarycomputer.microsoft.com/api";

/**
 * NASA Worldview's tile service: hundreds of daily global products, no key, CORS open.
 * `default` as the time segment asks GIBS for its most recent published day.
 */
const gibs = (layer: string, level: number, ext = "png") =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/default/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;

/** Landsat delivers surface temperature as scaled integers; the tiler rescales in those units. */
const thermalRescale: [number, number] = [
  Math.round(celsiusToDn(THERMAL_RANGE_CELSIUS.min)),
  Math.round(celsiusToDn(THERMAL_RANGE_CELSIUS.max)),
];

export const defaultConfig: GryphonConfigInput = {
  version: 1,
  title: "Thermal Earth",
  basemap: DEFAULT_BASEMAP,
  view: { bbox: DEFAULT_BBOX, zoom: 9 },
  layers: [
    {
      id: "landsat-thermal",
      icon: "thermometer-sun",
      title: "Surface temperature",
      type: "stac",
      endpoint: `${PLANETARY_COMPUTER}/stac/v1`,
      tiler: `${PLANETARY_COMPUTER}/data/v1`,
      collection: "landsat-c2-l2",
      render: {
        assets: ["lwir11"],
        colormap_name: "inferno",
        rescale: [thermalRescale],
        nodata: 0,
      },
      maxCloudCover: 20,
      limit: 12,
      footprints: true,
      opacity: 0.8,
      attribution: "Landsat C2 L2 © USGS · Microsoft Planetary Computer",
      legend: {
        kind: "ramp",
        unit: "°C",
        min: THERMAL_RANGE_CELSIUS.min,
        max: THERMAL_RANGE_CELSIUS.max,
        colors: INFERNO,
      },
    },
    {
      // Same physical quantity as the Landsat layer, but global and daily — useful
      // context underneath a single high-resolution scene.
      id: "nasa-land-surface-temp",
      icon: "thermometer",
      // The thermal layer people reach for first, so it loads during the intro.
      preload: true,
      title: "Land surface temperature (MODIS, global)",
      type: "raster",
      tiles: [gibs("MODIS_Terra_Land_Surface_Temp_Day", 7)],
      // GIBS publishes this product to zoom 6; declaring it lets the map overzoom
      // rather than the layer vanishing as you zoom in.
      maxzoom: 6,
      visible: false,
      opacity: 0.7,
      attribution: "MODIS Terra LST · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        unit: "°C",
        min: -73,
        max: 77,
        // Sampled from NASA's published colormap for this product.
        colors: ["#c900ff", "#0100ff", "#04fff7", "#c5ff00", "#ff9700", "#ff0100"],
      },
    },
    {
      id: "nasa-sea-ice",
      icon: "snowflake",
      title: "Sea ice concentration (AMSR2)",
      type: "raster",
      tiles: [gibs("AMSRU2_Sea_Ice_Concentration_12km", 6)],
      maxzoom: 5,
      visible: false,
      opacity: 0.85,
      attribution: "AMSR2/GCOM-W1 sea ice concentration · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        unit: "%",
        min: 0,
        max: 100,
        colors: ["#0e000e", "#9c00ff", "#00ceff", "#2db900", "#ff7100", "#ffffff"],
      },
    },
    {
      id: "nasa-true-colour",
      icon: "earth",
      title: "True colour (VIIRS, daily)",
      type: "raster",
      tiles: [gibs("VIIRS_SNPP_CorrectedReflectance_TrueColor", 9, "jpg")],
      maxzoom: 8,
      visible: false,
      attribution: "VIIRS/Suomi-NPP corrected reflectance · NASA EOSDIS GIBS",
    },
    {
      id: "nasa-precipitation",
      icon: "cloud-rain",
      title: "Precipitation rate (GPM IMERG)",
      type: "raster",
      tiles: [gibs("IMERG_Precipitation_Rate", 6)],
      maxzoom: 5,
      visible: false,
      opacity: 0.8,
      attribution: "GPM IMERG precipitation rate · NASA EOSDIS GIBS",
      legend: {
        // This product's scale is logarithmic, so it is listed as labelled steps
        // rather than a linear ramp, whose evenly spaced ticks would be wrong.
        kind: "categories",
        items: [
          { label: "0.1 mm/h", color: "#00764e" },
          { label: "0.35 mm/h", color: "#1eb200" },
          { label: "1.3 mm/h", color: "#efed00" },
          { label: "4.5 mm/h", color: "#ff4d2d" },
          { label: "15.8 mm/h", color: "#b50000" },
          { label: "53 mm/h", color: "#330000" },
        ],
      },
    },
    {
      id: "nasa-cloud-top-temp",
      icon: "cloud",
      title: "Cloud top temperature (MODIS)",
      type: "raster",
      tiles: [gibs("MODIS_Terra_Cloud_Top_Temp_Day", 6)],
      maxzoom: 5,
      visible: false,
      opacity: 0.8,
      attribution: "MODIS Terra cloud top temperature · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        unit: "°C",
        min: -123,
        max: 71,
        colors: ["#660077", "#0101aa", "#025002", "#ffff06", "#7a5a0b", "#ff0405"],
      },
    },
    {
      id: "nasa-sea-surface-temp",
      icon: "waves",
      title: "Sea surface temperature (GHRSST)",
      type: "raster",
      tiles: [gibs("GHRSST_L4_MUR_Sea_Surface_Temperature", 7)],
      maxzoom: 6,
      visible: false,
      opacity: 0.85,
      attribution: "GHRSST MUR sea surface temperature · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        unit: "°C",
        min: 0,
        max: 32,
        colors: ["#2b001a", "#410a5a", "#235db0", "#42c200", "#fc7500", "#6b0200"],
      },
    },
    {
      id: "nasa-ndvi",
      icon: "leaf",
      title: "Vegetation index (NDVI, 8-day)",
      type: "raster",
      tiles: [gibs("MODIS_Terra_NDVI_8Day", 9)],
      maxzoom: 8,
      visible: false,
      opacity: 0.8,
      attribution: "MODIS Terra NDVI · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        min: 0,
        max: 1,
        colors: ["#f1ecec", "#c8b5a5", "#9a6e59", "#5da300", "#197300", "#001801"],
      },
    },
    {
      id: "nasa-aerosol",
      icon: "wind",
      title: "Aerosol optical depth (MODIS)",
      type: "raster",
      tiles: [gibs("MODIS_Combined_Value_Added_AOD", 6)],
      maxzoom: 5,
      visible: false,
      opacity: 0.8,
      attribution: "MODIS combined value-added AOD · NASA EOSDIS GIBS",
      legend: {
        kind: "ramp",
        min: -1,
        max: 5,
        colors: ["#fffdcd", "#ffd960", "#ff9729", "#ff4214", "#d3070c", "#7d000e"],
      },
    },
    {
      // Global feed, so it reads at world zoom while the thermal layer reads locally.
      id: "usgs-earthquakes",
      icon: "activity",
      // A few kilobytes of GeoJSON: cheap enough to have ready.
      preload: true,
      title: "Earthquakes (past 24 h, M2.5+)",
      type: "geojson",
      url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      draw: "circle",
      visible: false,
      attribution: "USGS Earthquake Hazards Program",
      style: {
        radiusBy: {
          property: "mag",
          stops: [
            [2.5, 3],
            [8, 28],
          ],
        },
        colorBy: {
          property: "mag",
          stops: [
            [2.5, "#fcffa4"],
            [5, "#fca50a"],
            [6.5, "#dd513a"],
            [8, "#932667"],
          ],
        },
        paint: { "circle-stroke-width": 1, "circle-stroke-color": "#00000055" },
      },
      legend: {
        kind: "scaled-circle",
        unit: "M",
        color: "#fca50a",
        stops: [
          { value: 2.5, radius: 3 },
          { value: 5, radius: 11 },
          { value: 8, radius: 28 },
        ],
      },
    },
  ],
};
