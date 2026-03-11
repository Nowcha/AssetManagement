/**
 * AssetManagement Service Worker
 * キャッシュファースト戦略でオフライン対応
 */
const CACHE_NAME = 'asset-mgmt-v2'

// App Shellとして事前キャッシュするリソース
const PRECACHE_URLS = [
  '/AssetManagement/',
  '/AssetManagement/index.html',
]

// install: App Shellをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

// activate: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

// fetch: ナビゲーションリクエストはSPA用にindex.htmlにフォールバック
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 外部オリジンへのリクエストはキャッシュせずブラウザに委ねる
  // （API ホストのリスト管理不要・新しいAPIを追加しても自動対応）
  if (url.origin !== self.location.origin) {
    return
  }

  // ナビゲーションリクエスト（HTML page）→ index.html で SPA ルーティング
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/AssetManagement/index.html').then(
        (cached) => cached ?? fetch(request),
      ),
    )
    return
  }

  // その他のリソース → キャッシュファースト、なければネットワーク取得してキャッシュ
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response.ok || response.type === 'opaque') return response

        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
    }),
  )
})
