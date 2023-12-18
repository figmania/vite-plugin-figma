import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Plugin, ResolvedConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { buildMain } from './buildMain'
import { CodeLanguage, CodegenPreference, EditorType, NetworkAccess, PluginCapability, PluginPermissionType } from './types'

export interface FigmaOptions {
  name: string
  id: string
  editorType: EditorType[]
  api: string
  main: string
  capabilities?: PluginCapability[]
  codegenLanguages?: CodeLanguage[]
  codegenPreferences?: CodegenPreference[]
  permissions?: PluginPermissionType[],
  networkAccess?: NetworkAccess
}

const buildDevHtml = (html: string, config: ResolvedConfig) => html.replace('</head>', `
    <base href="http://${config.server.host}:${config.server.port}/">
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/@vite/client"></script>
  </head>`)

function buildManifest(options: FigmaOptions): string {
  return JSON.stringify({ ...options, ui: 'index.html', main: 'main.js' }, null, 2)
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
      await buildMain(options, config, (result) => {
        writeFileSync(join(config.build.outDir, 'main.js'), result, 'utf-8')
      })
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
