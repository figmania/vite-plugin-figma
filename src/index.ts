import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { dim, green } from 'picocolors'
import { Plugin, ResolvedConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export type FigmaPermissionType = 'currentuser' | 'activeusers' | 'fileusers' | 'payments'

export interface FigmaOptions {
  name: string
  id: string
  editorType: ('figma' | 'figjam')[]
  api: string
  main: string
  permissions?: FigmaPermissionType[]
}

const buildDevHtml = (html: string, config: ResolvedConfig) => html.replace('</head>', `
    <base href="http://${config.server.host}:${config.server.port}/">
    <script type="module">
      import RefreshRuntime from "/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/@vite/client"></script>
  </head>`)

async function buildMain(options: FigmaOptions, config: ResolvedConfig): Promise<string> {
  const entry = join(config.root, options.main)
  const result = await build({
    entryPoints: [entry],
    target: 'ES2015',
    bundle: true,
    write: false,
    sourcemap: config.mode === 'production' ? false : 'inline',
    minify: config.mode === 'production',
    legalComments: 'none',
    watch: config.command === 'serve' ? {
      onRebuild(error) {
        const outFile = join(config.build.outDir, 'main.js')
        if (error) {
          // config.logger.error(error.message, { clear: false, timestamp: true })
        } else {
          config.logger.info(`${green(`hmr update`)} ${dim(`/${outFile}`)}`, { clear: false, timestamp: true })
        }
      }
    } : false
  }).catch(() => process.exit(1))
  return result.outputFiles[0].text
}

function buildManifest({ name, id, editorType, api, permissions }: FigmaOptions): string {
  return JSON.stringify({ name, id, editorType, api, ui: 'index.html', main: 'main.js', permissions }, null, 2)
}

export function figma(command: 'build' | 'serve', options: FigmaOptions): Plugin[] {
  const config = {} as ResolvedConfig
  return [{
    name: 'vite-plugin-figma',
    config(_, env) {
      return {
        build: {
          minify: env.mode !== 'production',
          sourcemap: env.mode === 'production' ? false : 'inline'
        },
        esbuild: {
          legalComments: 'none'
        }
      }
    },
    async configResolved(userConfig) {
      Object.assign(config, userConfig)
      if (config.command !== 'serve') { return }
      if (!config.server.host || !config.server.port) { throw new Error('Server Host and Port required') }
      if (!existsSync(config.build.outDir)) { mkdirSync(config.build.outDir) }
      const html = readFileSync(join(config.root, 'index.html'), 'utf8')
      writeFileSync(join(config.build.outDir, 'index.html'), buildDevHtml(html, config), 'utf-8')
      writeFileSync(join(config.build.outDir, 'main.js'), await buildMain(options, config), 'utf-8')
      writeFileSync(join(config.build.outDir, 'manifest.json'), buildManifest(options), 'utf-8')
    },
    generateBundle: {
      order: 'post',
      async handler() {
        this.emitFile({ type: 'asset', fileName: 'main.js', name: 'main', source: await buildMain(options, config) })
        this.emitFile({ type: 'asset', fileName: 'manifest.json', name: 'manifest', source: buildManifest(options) })
      }
    }
  }, ...(command === 'build') ? [viteSingleFile()] : []]
}
