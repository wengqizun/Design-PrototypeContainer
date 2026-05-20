import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const normalizePath = (value: string) => value.split(path.sep).join('/')

type PrototypePagesPluginOptions = {
  rootDir: string
  pagesDir: string
}

const resolvePagesDir = ({ rootDir, pagesDir }: PrototypePagesPluginOptions) => {
  return path.isAbsolute(pagesDir) ? pagesDir : path.resolve(rootDir, pagesDir)
}

export const createPrototypePagesPlugin = (options: PrototypePagesPluginOptions): Plugin => {
  // 虚拟模块提供给前端运行时导入，里面包含当前所有原型页面的快照。
  const virtualModuleId = 'virtual:prototype-pages'
  const resolvedVirtualModuleId = `\0${virtualModuleId}`
  const prototypePagesDir = resolvePagesDir(options)

  // 递归扫描原型页面目录，并读取每个 Vue 文件的相对路径、名称和源码内容。
  const scanPages = () => {
    if (!fs.existsSync(prototypePagesDir)) return []

    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
          continue
        }
        if (entry.isFile() && entry.name.endsWith('.vue')) {
          files.push(fullPath)
        }
      }
    }

    walk(prototypePagesDir)

    return files.sort().map((file) => {
      const relativePath = normalizePath(path.relative(prototypePagesDir, file))
      const name = relativePath.replace(/\.vue$/, '')

      return {
        path: relativePath,
        name,
        content: fs.readFileSync(file, 'utf-8'),
      }
    })
  }

  // 页面文件变化后，使虚拟模块失效，并通知客户端重新拉取页面列表。
  const sendPagesUpdate = (server: ViteDevServer) => {
    const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
    if (module) {
      server.moduleGraph.invalidateModule(module)
    }
    server.ws.send({ type: 'custom', event: 'prototype-pages:update' })
  }

  return {
    name: 'prototype-pages',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify(scanPages())}`
      }
    },
    configureServer(server) {
      server.watcher.add(prototypePagesDir)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(prototypePagesDir) && file.endsWith('.vue')) {
          sendPagesUpdate(server)
        }
      })

      // 提供调试和运行时兜底接口，返回与虚拟模块一致的页面 JSON。
      server.middlewares.use('/__prototype_pages', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify(scanPages()))
      })
    },
  }
}
