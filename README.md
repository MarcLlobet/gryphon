<p align="center">
  <img src="public/gryphon.svg" alt="Gryphon emblem" width="140" />
</p>

<h1 align="center">GRYPHON</h1>
<p align="center">Search, visualise and (soon) task thermal satellite imagery on a map.</p>

<p align="center">
  <a href="https://marcllobet.github.io/gryphon/"><strong>Live demo</strong></a> ·
  <a href="https://github.com/MarcLlobet/gryphon/actions/workflows/ci.yml"><img src="https://github.com/MarcLlobet/gryphon/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
</p>

---

## Why "Gryphon"?

In the medieval _Alexander Romance_, Alexander the Great harnesses two griffins to a basket and
rises into the sky to look down on the Earth — arguably the first Earth observation mission ever
imagined.

Gryphon is an homage to that story and to **ALEX** (Aistech Land EXplorer), the platform that
delivers thermal infrared data from the Hydra constellation. Like ALEX, Gryphon speaks
[STAC](https://stacspec.org) — and it is built entirely on open data.

## What it does

Gryphon is a **renderer**. It has no opinion about data: a JSON document declares the layers,
where each one fetches from and how it is painted, and the app renders whatever it is given.

- [x] Paints several superposed layers on one MapLibre map. Visibility toggles and legends sit
      on the map; paint order, removing and adding layers live on a separate `/config` page.
      Opacity is set in the document.
- [x] Ships a **keyless** default document of ten layers: Landsat Collection 2 surface
      temperature with scene footprints, NASA GIBS global products (land & sea surface
      temperature, sea ice, precipitation, cloud top temperature, NDVI, aerosol, true colour)
      and USGS earthquakes.
- [x] Adds layers at runtime through a guided form, validated by the same schema as the
      document, with credentials held in memory for the session only.
- [x] A configuration page in two parts: **your layers**, each shown in its own form, filled
      in and locked, plus whatever else it declares; and **add a layer**, a gallery with one
      card per protocol in plain words, each with a working, keyless example to add as is or
      customise first.
- [x] Opens with a 3D intro that is also the loading screen (see below).
- [x] Each layer can name any [Lucide](https://lucide.dev/icons) icon (`"icon": "cloud-rain"`),
      checked against the icon set; without one, the panel shows a glyph for the draw type.
- [x] Light and dark themes for the interface, from one set of CSS custom properties. The
      map keeps its basemap in both.
- [x] Fails small: a map that cannot start shows a retry while the layer panel keeps working,
      an intro that breaks gets out of the way, and every route has an error and a 404 page.
- [x] Six protocols out of the box: `geojson`, `raster`, `vector`, `image`, `csv`, `stac`.
- [ ] Per-pixel °C readout on hover.
- [ ] Satellite ground tracks propagated from CelesTrak TLEs.
- [ ] A vector-tile layer against a real source (GIBS publishes MVT, but its tiles 404).
- [ ] A STAPI-style tasking request: draw an area, pick a window, get a feasibility study.

**Adding a dataset requires no code — it is a JSON edit.** Only a new _protocol_ costs code:
one renderer and one schema variant.

## Architecture

```
            configuration document (external, client-supplied)
                              │  parsed by one Zod schema
                              ▼
   core/      domain + schema + LayerSpec        ← imports nothing outward
                              │
   renderers/ one handler per layer `type`       ← registry = composition root
                              │  LayerSpec[]
   features/  React Query (one query per layer) + applyLayers(map, …)
                              ▼
                        MapLibre GL  ◀── boot milestones ──▶  intro (Three.js)
```

- **The schema is the application.** One Zod schema is the source of truth; `z.infer` gives the
  TypeScript types, `z.toJSONSchema()` generates [`public/gryphon.schema.json`](public/gryphon.schema.json)
  for external authors, and the same schema validates the in-app form. They cannot drift.
- **No bespoke contracts.** The document is MapLibre-Style-Spec shaped, vector payloads are
  GeoJSON, and raster styling comes from the STAC `renders` extension — so a catalog that
  publishes how it should be painted gets painted that way.
- **The registry keys on protocol, not vendor.** Planetary Computer and Earth Search are the
  same `stac` renderer with different JSON.
- **No backend.** The build is a static export and the browser calls every source directly, so
  CORS is designed for: each layer accepts an optional `proxy`, unset here and pointed at a
  backend in a fullstack deployment.
- **Partial failure is normal.** Renderers return a typed `Result`, so one unreachable source
  degrades its own row in the layer panel instead of blanking the map.
- **The dependency rule is enforced, not documented** — `src/core/architecture.test.ts` walks the
  import graph and fails the build if a layer reaches the wrong way.
- Every registered renderer runs against a **shared conformance suite**, so a new protocol
  inherits its whole contract the moment it is registered.

## The boot sequence

The intro is not decoration: it is the loading screen.

1. A warp through about 8,500 stars, coloured by stellar temperature.
2. The Gryphon stars line up. Like a real constellation, they sit at very different depths
   and only form the griffin from one viewpoint, where the camera arrives.
3. Lines trace star to star, the thermal eye ignites, and the patch appears over the stars.
4. The camera dives into the eye and the intro fades over a map that is already live.

Behind it, the map, the basemap and every visible layer load in parallel. A small boot
tracker records four real milestones (`runtime`, `basemap`, `layers`, `idle`), mirrors each
as a `performance.mark`, and the animation **holds** before the reveal until all four are in,
with an 8-second cap. Hidden layers marked `preload: true` load too and wait on the map at
opacity 0, so switching them on is a repaint with no request. Other hidden layers cost
nothing until they are switched on.

The intro plays once per browser session (add `#intro` to the URL to replay it), can be
skipped, is static under `prefers-reduced-motion`, and releases its WebGL context when it
ends so the GPU goes to the map. Three.js is loaded only for the intro.

## Loading only what is needed

| Loaded                                 | When                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| App shell, React, React Query, Zod     | First paint                                                |
| MapLibre and its stylesheet            | The map page mounts (never on `/config`)                   |
| Three.js and the intro scene           | First visit of the session; never with reduced motion      |
| Each protocol's renderer               | The first time a layer of that protocol resolves           |
| Hidden layers' data                    | Only if marked `preload: true`; otherwise when switched on |
| Legend, credential prompt              | When opened, or when a source asks for a key               |
| Lucide icons                           | One chunk per icon, fetched together for the visible rows  |
| React Hook Form and the add-layer form | When a gallery card is opened                              |
| Layer settings view                    | When a layer is opened on `/config`                        |
| React Query devtools                   | Development only                                           |

`pnpm analyze` builds once and opens a treemap of every chunk. `src/core/lazy.test.ts` fails
if `three` or `maplibre-gl` is ever imported where it would land in the first load.

## Adding a layer

A layer is one JSON object. Every layer needs `id`, `title` and `type`; the `type` (the
protocol) decides the rest, such as a `url` for `geojson`. Everything else has a default.

```json
{
  "id": "example-quakes",
  "title": "Earthquakes M4.5+, past week",
  "type": "geojson",
  "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
  "style": {
    "color": "#ffc93c",
    "radiusBy": {
      "property": "mag",
      "stops": [
        [4.5, 3],
        [8, 16]
      ]
    }
  },
  "preload": false
}
```

On the `/config` page, every protocol has a card with a working example: add it as is, or
open the form prefilled with it. Editors get autocomplete from [`public/gryphon.schema.json`](public/gryphon.schema.json).

## How to review this repo

Read in this order; each step is small.

1. `src/core/config/schema.ts`: the document, and therefore the whole app's vocabulary.
2. `src/core/render/layerSpec.ts` and `renderer.ts`: what a renderer must produce, and how it fails.
3. `src/renderers/stac/`: one full protocol, from STAC search to tiles.
4. `src/features/layers/useLayers.ts` and `src/features/map/applyLayers.ts`: one query per
   layer, reconciled onto MapLibre.
5. `src/features/intro/` and `src/features/boot/`: the boot sequence. `timeline.ts` and
   `asterism.ts` are pure and fully tested; `IntroScene.ts` is the only WebGL code.
6. `src/core/architecture.test.ts` and `src/core/lazy.test.ts`: the dependency rule and the
   lazy-loading rule, asserted.

## Stack

TypeScript · React 19 with the React Compiler · Next.js (App Router, static export, typed routes) · TanStack React Query · MapLibre GL ·
Three.js · Zod · React Hook Form · Lucide · MSW · Vite + Vitest · Testing Library · ESLint · Prettier ·
Husky + lint-staged · GitHub Actions · pnpm

## Getting started

```bash
pnpm install
pnpm dev        # real sources
pnpm dev:mock   # MSW service worker mocks every source (map tiles still need the network)
```

| Script                              | What it does                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm test`                         | Unit tests (`*.test.ts` / `*.test.tsx`) with Vitest                                     |
| `pnpm test:coverage`                | Tests with V8 coverage (written to `coverage/`)                                         |
| `pnpm typecheck`                    | Generates Next.js types, then runs `tsc`                                                |
| `pnpm lint` / `pnpm lint:fix`       | ESLint: Next's React, hooks, accessibility and Core Web Vitals rules, plus TypeScript's |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                |
| `pnpm build`                        | Static export to `out/`                                                                 |
| `pnpm size`                         | First-load JavaScript per page, gzipped, against a budget (run after `build`)           |
| `pnpm analyze`                      | Build, then open a treemap of every chunk per route                                     |

Two Git hooks (Husky) keep `main` green:

- **pre-commit**, on staged files only: ESLint with fixes, Prettier, and the tests those files
  touch. Fast enough to never be skipped.
- **pre-push**, on the whole project: ESLint, the Prettier check, the type check and every test,
  the same checks CI starts with.

## Quality gates

Every push and pull request runs, in order: ESLint, Prettier, the type check, the unit tests
with coverage (including the architecture rule, the lazy-loading rule and the renderer
conformance suite), the static build, and the first-load budget. Pushes to `main` that pass are
deployed to GitHub Pages. Dependabot proposes dependency updates weekly.

To deploy from a fork, set **Settings → Pages → Source** to **GitHub Actions**.

Basemap © [CARTO](https://carto.com/attributions) · © OpenStreetMap contributors.
Thermal data: Landsat Collection 2 Level-2 © USGS, served by Microsoft Planetary Computer.

## License

MIT © Marc Llobet
