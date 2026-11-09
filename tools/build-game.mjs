// Builds the web version of Mochi Meltdown from the Devvit project.
// Usage: node tools/build-game.mjs   (run from the site root)
import {readFileSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import path from 'node:path'

const DEVVIT = path.join(process.env.HOME, 'Desktop/mochi-meltdown-devvit')
const require = createRequire(path.join(DEVVIT, 'package.json'))
const esbuild = require('esbuild')
const SITE = process.cwd()

const webOnly = {
  name: 'web-only',
  setup(b){
    b.onResolve({filter: /^@devvit\/web\/client$/}, () => ({path: path.join(SITE, 'tools/devvit-shim.js')}))
    b.onLoad({filter: /src[\\/]client[\\/]game\.ts$/}, args => {
      let src = readFileSync(args.path, 'utf8')
      const swap = (from, to) => { if (!src.includes(from)) throw new Error('not found in game.ts: ' + from); src = src.split(from).join(to) }
      swap("const SUB_URL = 'https://www.reddit.com/r/MochiMeltdown/';", "const SUB_URL = '../';")
      swap('<small>r/MochiMeltdown \\u2192</small>', '<small>more games \\u2192</small>')
      swap('more puzzles on r/MochiMeltdown \\u2192', 'more games \\u2192')
      // No Reddit server on the web: progress lives in localStorage only.
      src = "const fetch = (u, o) => String(u).startsWith('api/') ? Promise.resolve({ ok:false, json: async () => ({}) }) : window.fetch(u, o);\n" + src
      return {contents: src, loader: 'ts'}
    })
  },
}

await esbuild.build({
  entryPoints: [path.join(DEVVIT, 'src/client/game.ts')],
  bundle: true, minify: true, format: 'esm', target: 'es2020', platform: 'browser',
  outfile: path.join(SITE, 'mochi-meltdown/game.js'),
  plugins: [webOnly], logLevel: 'warning',
})

let html = readFileSync(path.join(DEVVIT, 'public/game.html'), 'utf8')
html = html.replace('<title>Mochi Meltdown</title>', `<title>Mochi Meltdown</title>
    <meta name="description" content="A daily slide puzzle. Get every mochi into the soup, keep Gary out.">
    <meta property="og:title" content="Mochi Meltdown">
    <meta property="og:description" content="A daily slide puzzle. Get every mochi into the soup, keep Gary out.">
    <meta property="og:image" content="https://xphoez.github.io/assets/og-mochi.png">
    <link rel="icon" href="../assets/splash-momo.png">`)
writeFileSync(path.join(SITE, 'mochi-meltdown/index.html'), html)
console.log('built mochi-meltdown/')
