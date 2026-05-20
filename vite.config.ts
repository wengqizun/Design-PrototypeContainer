import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { createPrototypePagesPlugin } from './plugins/prototypePagesPlugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const prototypePagesDir = env.PROTOTYPE_PAGES_DIR || 'Prototype/src/pages'

  return {
    plugins: [
      createPrototypePagesPlugin({
        rootDir: __dirname,
        pagesDir: prototypePagesDir,
      }),
      {
        name: 'doc-custom-block',
        transform(_, id) {
          if (id.includes('type=doc')) {
            return 'export default {}'
          }
        },
      },
      {
        name: 'jumps-custom-block',
        transform(code, id) {
          if (id.includes('type=jumps')) {
            return `
            const jumps = ${code}
            export default function(Component) {
              Component.__jumps = jumps
            }
          `
          }
        },
      },
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'doc' || tag === 'jumps',
          },
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  }
})
