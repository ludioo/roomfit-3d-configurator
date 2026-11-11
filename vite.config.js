import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('three/addons/environments/RoomEnvironment') ||
            id.includes('three/examples/jsm/environments/RoomEnvironment')
          ) {
            return 'three-env';
          }
          if (
            id.includes('three/addons/loaders/') ||
            id.includes('three/examples/jsm/loaders/')
          ) {
            return 'three-loaders';
          }
          if (id.includes('node_modules/camera-controls')) return 'camera-controls';
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
