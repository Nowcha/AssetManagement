if ('serviceWorker' in navigator) {
  // SW が更新されて制御が切り替わったときにページを自動リロードする。
  // これにより古いキャッシュが残っていても新バンドルに切り替わる。
  var refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/AssetManagement/sw.js', {
      scope: '/AssetManagement/',
    })
  })
}
