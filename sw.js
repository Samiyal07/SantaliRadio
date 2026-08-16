self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Bypass Service Worker for API calls and audio streams
    if (url.pathname.startsWith('/api/') || url.hostname.includes('googlevideo.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});