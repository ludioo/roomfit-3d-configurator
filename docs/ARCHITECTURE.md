# Architecture

RoomFit is a single-page Vite app: one WebGL canvas stays alive, UI is HTML/CSS overlay, configuration state lives in memory with a `localStorage` mirror. AR is a temporary mode on the same renderer (WebXR) or a one-shot USDZ export — not a separate application.

## Folder layout

```
roomfit-3d-configurator/
├── index.html
├── package.json
├── vite.config.js
├── vitest.config.js
├── playwright.config.js
├── playwright.baseline.config.js
├── eslint.config.js
├── lighthouserc.cjs
├── vercel.json
├── .env.example
├── .github/workflows/ci.yml
├── scripts/optimize-model.mjs
├── e2e/                          # Playwright smoke / mobile specs
├── tests/                        # Vitest unit tests
├── public/
│   ├── models/                   # armchair.glb, sofa.glb
│   ├── decoders/draco/           # Draco wasm + wrappers
│   ├── fonts/                    # DM Sans woff2 + OFL
│   └── og-image.png
└── src/
    ├── main.js
    ├── styles/                   # base, layout, components, sheet fallback, onboarding
    ├── core/                     # app, state, pricing, storage, i18n, analytics, layoutMode
    ├── scene/                    # bootViewer, renderer, camera, lights, loader, product, screenshot
    ├── ar/                       # capability, webxr, usdz (lazy)
    ├── ui/                       # shell, configPanel, bottomSheet, swatches, AR CTA, …
    ├── debug/                    # lil-gui + stats behind ?debug=1
    ├── data/                     # products.json, prices.json
    └── i18n/                     # en.json, id.json
```

## Data flow

```
UI (swatch / finish / size / product) → state.setOption()
  → product.apply() (materials / scale)
  → priceBar.render() via pricing.js
  → analytics.track('variant_change') when wired

Save → storage.saveConfig(snapshot) → savedList.render()
AR Android → dynamic import ar/webxr → start session + hit-test place
AR iOS Safari → dynamic import ar/usdz → bake + Quick Look link
First visit → dynamic import onboarding (driver.js), once via storage flag
?debug=1 → dynamic import debug/debugPanel.js
```

Hash routes: `#configure` (default), `#saved`, `#about`. No router library.

## Module boundaries

- `scene/*` does not import DOM UI; the app injects callbacks.
- `ar/*`, onboarding (`driver.js`), and `debug/*` stay off the critical path via `import()`.
- `storage.js` is the only module that touches `localStorage` (onboarding flag uses the same helpers).
- Pricing, i18n lookup, and state snapshots are pure functions so Vitest can run without a DOM.

## Bottom sheet strategy

1. **Desktop rail** when `min-width: 768px` and not short-landscape (`orientation: landscape` and `max-height: 500px`): fixed right panel (~320px), not a sheet.
2. **Native sheet** on phone when `animation-timeline: scroll()` is supported and Safari/iOS ≥ 18.2: `pure-web-bottom-sheet` with peek / mid / full snaps.
3. **Fallback** otherwise: CSS scroll-snap sheet (`bottom-sheet-fallback.css`) without the web component.

Layout mode is subscribed so rail ↔ sheet remounts on resize / orientation change.

## Boot and performance

1. Shell paints first; after a double `requestAnimationFrame`, `bootViewer` is dynamically imported.
2. Config panel waits for first paint plus a short idle window before its own dynamic import.
3. Pixel ratio: capped at **1.5** off desktop rail, **2** on desktop (`layoutMode` + renderer).
4. Lighting: Hemisphere + Directional always; RoomEnvironment + PMREM only on desktop.
5. Models are Draco + WebP GLBs from `scripts/optimize-model.mjs` (armchair ≈ 391 KB, sofa ≈ 183 KB).
6. Vite splits large vendors (`manualChunks`); three.js uses named imports where practical.

## AR

### Capability (`src/ar/capability.js`)

| Result | When |
|---|---|
| `webxr` | `navigator.xr.isSessionSupported('immersive-ar')` |
| `quicklook` | Not WebXR, and iOS Safari (excludes Chrome/Firefox/Edge/Opera iOS shells; includes iPadOS desktop UA with touch) |
| `unsupported` | Everything else (including iOS non-Safari — UI asks to open Safari) |

### WebXR hit-test (`src/ar/webxr.js`)

- `requestSession('immersive-ar', { requiredFeatures: ['hit-test'] })`
- Reference space type `local`; hit-test source on `viewer` space
- Reticle follows the first hit pose each frame
- Controller `select` places the live product root via `applyHitPose` (position + quaternion from hit; scale from studio, not the XR matrix)
- Session end restores the studio snapshot and clears the XR animation loop

### USDZ Quick Look (`src/ar/usdz.js`)

- Clone the product root; bake `color × map` into a canvas texture so tint survives export
- `USDZExporter.parseAsync(..., { quickLookCompatible: true })`
- Trigger `<a rel="ar">` with a required child image; revoke the object URL after a delay
- Non-iOS may download the `.usdz` for inspection

## Error / fallback UX

| Condition | Behavior |
|---|---|
| No WebGL | Static poster + message |
| Model load failure | Retry control |
| AR unsupported | Disabled CTA, tooltip on desktop, toast on tap |
| AR / export failure | Toast; CTA leaves busy state |
| Storage unavailable | Graceful no-op / toast; app still usable |

## Testing

- **Vitest** (`npm test`): pricing, storage, i18n, AR capability, layout mode, USDZ bake helpers, WebXR pose helper, etc.
- **Playwright** (`npm run e2e`): smoke configure/save, AR fallback on desktop, mobile sheet/CTA matrix (Chromium projects).
- **Lighthouse CI** (`npm run lhci`): mobile budgets after `npm run build`.
- CI workflow runs `lint` → `test` → `build` on `main`.
