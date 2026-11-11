/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      // Serve built `dist` via LHCI's static server — avoids Windows stdout
      // buffering that makes Vite's "Local:" banner miss startServerReadyPattern.
      staticDistDir: './dist',
      numberOfRuns: 3,
      // Explicit mobile audit (M8) — do not rely on LHCI default alone.
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
