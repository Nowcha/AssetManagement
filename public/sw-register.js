if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/AssetManagement/sw.js', {
      scope: '/AssetManagement/',
    })
  })
}
