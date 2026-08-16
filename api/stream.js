export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { videoId, playlistId } = req.query;

    // 1. Fetch Playlist Info using NoEmbed & Invidious Fallbacks
    if (playlistId) {
        const INVIDIOUS_ENDPOINTS = [
            'https://inv.nadeko.net/api/v1',
            'https://invidious.nerdvpn.de/api/v1',
            'https://invidious.tiekoetter.com/api/v1',
            'https://vid.priv.au/api/v1'
        ];

        for (const base of INVIDIOUS_ENDPOINTS) {
            try {
                const response = await fetch(`${base}/playlists/${playlistId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    const data = await response.json();
                    return res.status(200).json(data);
                }
            } catch (e) {}
        }
        return res.status(502).json({ error: 'Playlist resolution failed' });
    }

    // 2. Fetch Direct High-Speed Audio Stream using Cobalt Engine
    if (videoId) {
        const COBALT_INSTANCES = [
            'https://api.cobalt.tools',
            'https://cobalt-api.kwiatekm.tokyo',
            'https://api.hyper.lol'
        ];

        const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

        for (const instance of COBALT_INSTANCES) {
            try {
                const cobaltRes = await fetch(instance, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    body: JSON.stringify({
                        url: targetUrl,
                        downloadMode: 'audio',
                        audioFormat: 'best'
                    }),
                    signal: AbortSignal.timeout(7000)
                });

                if (cobaltRes.ok) {
                    const data = await cobaltRes.json();
                    const audioUrl = data.url || (data.audio && data.audio.url);

                    if (audioUrl) {
                        return res.status(200).json({ url: audioUrl });
                    }
                }
            } catch (e) {}
        }

        // Fallback: Direct Invidious video parser
        const INVIDIOUS_ENDPOINTS = [
            'https://inv.nadeko.net/api/v1',
            'https://invidious.nerdvpn.de/api/v1',
            'https://vid.priv.au/api/v1'
        ];

        for (const base of INVIDIOUS_ENDPOINTS) {
            try {
                const response = await fetch(`${base}/videos/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const streams = (data.adaptiveFormats || []).filter(
                        (f) => f.type && f.type.startsWith('audio/')
                    );
                    const best = streams.find((f) => f.container === 'm4a') || streams[0];
                    if (best && best.url) {
                        return res.status(200).json({ url: best.url });
                    }
                }
            } catch (e) {}
        }

        return res.status(502).json({ error: 'Failed to extract audio stream' });
    }

    return res.status(400).json({ error: 'Missing videoId or playlistId' });
}