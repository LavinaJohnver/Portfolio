import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    open: true,
  },
})
