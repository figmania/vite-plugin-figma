import esbuild, { Plugin } from 'esbuild'
import { join } from 'path'
import { dim, green } from 'picocolors'
import { ResolvedConfig } from 'vite'
import { FigmaOptions } from './index'

export async function buildMain(options: FigmaOptions, config: ResolvedConfig, callback?: (result: string) => void): Promise<string> {
  const entry = join(config.root, options.main)
  const plugins: Plugin[] = []
  if (config.command === 'serve' && callback) {
    plugins.push({
      name: 'watch',
      setup(build) {
        build.onEnd(({ outputFiles, errors }) => {
          if (!outputFiles || errors.length > 0) { return }
          const outFile = join(config.build.outDir, 'main.js')
          config.logger.info(`${green(`hmr update`)} ${dim(`/${outFile}`)}`, { clear: false, timestamp: true })
          callback(outputFiles[0].text)
        })
      }
    })
  }

  const context = await esbuild.context({
    entryPoints: [entry],
    target: 'ES2015',
    bundle: true,
    write: false,
    sourcemap: config.mode === 'production' ? false : 'inline',
    minify: config.mode === 'production',
    legalComments: 'none',
    plugins
  })

  const result = await context.rebuild().catch(() => { context.dispose(); process.exit(1) })
  if (result.errors.length > 0 || result.outputFiles.length === 0) { context.dispose(); process.exit(1) }
  if (callback) { callback(result.outputFiles[0].text) }
  if (config.command === 'serve') {
    context.watch()
  } else {
    context.dispose()
  }

  return result.outputFiles[0].text
}
