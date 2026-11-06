import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRules, rulesPath, sanitizeRules, writeRules } from './rules.js'

const MAX_BODY_BYTES = 512 * 1024

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

/** Same-origin only for writes; curl and other local tooling send no Origin header. */
function sameOrigin(request) {
  const origin = request.headers.origin
  if (origin === undefined) return true
  const host = request.headers.host
  if (host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('body too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return text === '' ? undefined : JSON.parse(text)
}

/**
 * The request handler for `/small-toolkit/*`: the settings page reads and writes
 * the per-conversation notification rules here.
 * @param file - rules file path.
 * @returns an async (request, response) handler.
 */
export function createHandler(file = rulesPath()) {
  return async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const route = `${request.method ?? 'GET'} ${url.pathname}`
    try {
      if (route === 'GET /small-toolkit/notify-rules') {
        sendJson(response, 200, { rules: readRules(file) })
        return
      }
      if (route === 'POST /small-toolkit/notify-rules') {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request refused' })
          return
        }
        const rules = sanitizeRules(await readJson(request))
        writeRules(rules, file)
        sendJson(response, 200, { rules })
        return
      }
      if (route === 'POST /small-toolkit/client-boot') {
        // A breadcrumb, not data: the browser half reports its own phases here so
        // "the settings page is missing" can be told apart from "it was never loaded".
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request refused' })
          return
        }
        const body = await readJson(request)
        const line = JSON.stringify({ at: new Date().toISOString(), ...(body && typeof body === 'object' ? body : {}) })
        const log = join(dirname(file), 'client-boot.log')
        mkdirSync(dirname(log), { recursive: true })
        appendFileSync(log, `${line}\n`)
        sendJson(response, 200, { ok: true })
        return
      }
      sendJson(response, 404, { error: `no such route: ${route}` })
    } catch (error) {
      sendJson(response, 500, { error: String(error?.message ?? error) })
    }
  }
}

/**
 * Mount the routes once the host's web server is available.
 * @param ctx - the plugin context.
 * @param file - rules file path.
 */
export function mountRoutes(ctx, file = rulesPath()) {
  ctx.inject?.(['webServer'], (services) => {
    services.effect?.(() => {
      const unregister = services.webServer.register({
        kind: 'prefix',
        // A prefix matches `p` and `p/<anything>` — no trailing slash.
        path: '/small-toolkit',
        handler: createHandler(file),
      })
      return () => { unregister?.() }
    }, 'small-toolkit: routes')
  })
}
