import { build, BuildOptions } from 'esbuild'
import { join } from 'path'
import { Plugin } from 'vite'

export interface FigmaOptions {
  name: string
  id: string
  editorType: ('figma' | 'figjam')[]
  api: string
  main: string
  esbuild?: BuildOptions
}

const config = { root: '', outDir: '' }

export function figma({ main, api, id, name, editorType, esbuild }: FigmaOptions): Plugin {
  return {
    name: 'vite-plugin-figma',
    apply: 'build',
    configResolved(opts) {
      config.root = opts.root
      config.outDir = opts.build.outDir
    },
    generateBundle: {
      order: 'post',
      async handler() {
        // Generate Main
        const entry = join(config.root, main)
        const result = await build({ ...esbuild, entryPoints: [entry], target: 'ES2015', bundle: true, write: false, sourcemap: 'inline' }).catch(() => process.exit(1))
        this.emitFile({ type: 'asset', fileName: 'main.js', name: 'main', source: result.outputFiles[0].text })

        // Generate Manifest
        const source = JSON.stringify({
          name,
          id,
          editorType,
          api,
          ui: 'index.html',
          main: 'main.js',
        }, null, 2)
        this.emitFile({ type: 'asset', fileName: 'manifest.json', name: 'manifest', source })
      }
    }
  }
}