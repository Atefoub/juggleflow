/* Relay progress sync notifications to open app windows (app flush only). */
function broadcastProgressSyncDone() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'SYNC_PROGRESS_DONE' });
      });
    });
}

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'BROADCAST_SYNC_PROGRESS_DONE') {
    event.waitUntil(broadcastProgressSyncDone());
  }
});
