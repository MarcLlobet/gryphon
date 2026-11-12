<p align="center">
  <img src="public/gryphon.svg" alt="Gryphon emblem" width="140" />
</p>

<h1 align="center">GRYPHON</h1>
<p align="center"><strong>Thermal Earth Explorer</strong> — search, visualise and (soon) task thermal satellite imagery on a map.</p>

---

## Why "Gryphon"?

In the medieval *Alexander Romance*, Alexander the Great harnesses two griffins to a basket and
rises into the sky to look down on the Earth — arguably the first Earth observation mission ever
imagined.

Gryphon is an homage to that story and to **ALEX** (Aistech Land EXplorer), the platform that
delivers thermal infrared data from the Hydra constellation. Like ALEX, Gryphon speaks
[STAC](https://stacspec.org) — and it is built entirely on open data.

## What it does

- [x] Searches the public **Landsat Collection 2 Level-2** archive (surface temperature band)
      through Microsoft Planetary Computer's STAC API.
- [x] Lists the latest low-cloud thermal scenes over an area (Barcelona by default).
- [ ] Renders the thermal band on a map with thermal palettes and per-pixel °C readout.
- [ ] Overlays active fire hotspots from NASA FIRMS.
- [ ] Propagates real satellite orbits (CelesTrak TLEs) and predicts the next pass over an area.
- [ ] Simulates a STAPI-style tasking request: draw an area, pick a window, get a feasibility study.

## Architecture

```
Browser ── React Query ──▶ /api/* (Next.js route handlers, BFF) ──▶ STAC APIs
                                     ▲
                       MSW (typed mocks) in tests & `pnpm dev:mock`
```

- The browser only talks to Gryphon's own route handlers. They validate input, call upstream
  APIs (keeping keys server-side) and map raw STAC items to a small domain model (`ThermalScene`).
- **MSW** intercepts the server's outbound requests, so the same typed fixtures power unit tests
  and fully offline local development — no service worker file needed.

## Stack

TypeScript · React 19 · Next.js (App Router) · TanStack React Query · MSW · Vite + Vitest ·
Testing Library · [ts-only](https://github.com/MarcLlobet/ts-only) · Husky + lint-staged · pnpm

## Getting started

```bash
pnpm install
pnpm dev        # real APIs
pnpm dev:mock   # offline, MSW-mocked APIs
```

| Script | What it does |
| --- | --- |
| `pnpm test` | Unit tests (`*.test.ts` / `*.test.tsx`) with Vitest |
| `pnpm test:coverage` | Tests with V8 coverage (written to `dist/coverage`) |
| `pnpm typecheck` | Generates Next.js types, then runs `tsc` |
| `pnpm ts-only` | Fails if any `.js` / `.jsx` file sneaks into the repo |

The pre-commit hook runs `ts-only`, the tests related to staged files, and the type check.
Next.js builds to `dist/` so generated JavaScript never trips `ts-only`.

## License

MIT © Marc Llobet
