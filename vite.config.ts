import { defineConfig, type Plugin, type ResolvedConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const publicRoot = path.resolve(__dirname, 'public')
const excludedBuildPublicEntries = new Set(['portfolio'])

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const copySelectedPublicAssets = (outDir: string) => {
  fs.mkdirSync(outDir, { recursive: true })

  for (const entry of fs.readdirSync(publicRoot, { withFileTypes: true })) {
    if (excludedBuildPublicEntries.has(entry.name)) continue
    const source = path.join(publicRoot, entry.name)
    const target = path.join(outDir, entry.name)
    fs.cpSync(source, target, { recursive: entry.isDirectory(), force: true })
  }
}

const resolvePublicFile = (url = '/') => {
  try {
    const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
    const filePath = path.resolve(publicRoot, `.${pathname}`)
    if (!filePath.startsWith(`${publicRoot}${path.sep}`)) return null
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null
    return filePath
  } catch {
    return null
  }
}

const selectedPublicAssets = (): Plugin => {
  let resolvedOutDir = path.resolve(__dirname, 'dist')

  return {
    name: 'selected-public-assets',
    configResolved(config: ResolvedConfig) {
      resolvedOutDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const filePath = resolvePublicFile(req.url)
        if (!filePath) {
          next()
          return
        }

        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      copySelectedPublicAssets(resolvedOutDir)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/portfolio/" : "/",
  publicDir: false,
  plugins: [react(), tailwindcss(), selectedPublicAssets()],
  server: {
    watch: {
      ignored: ["**/.playwright-cli/**", "**/dist/**", "**/output/**"],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
