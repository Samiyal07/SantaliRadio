export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { videoId, playlistId } = req.query;

    const INVIDIOUS_INSTANCES = [
        'https://inv.nadeko.net/api/v1',
        'https://invidious.nerdvpn.de/api/v1',
        'https://invidious.tiekoetter.com/api/v1',
        'https://vid.priv.au/api/v1'
    ];

    // 1. Fetch Playlist
    if (playlistId) {
        for (const base of INVIDIOUS_INSTANCES) {
            try {
                const response = await fetch(`${base}/playlists/${playlistId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    signal: AbortSignal.timeout(6000)
                });
                if (response.ok) {
                    const data = await response.json();
                    return res.status(200).json(data);
                }
            } catch (e) {}
        }
        return res.status(502).json({ error: 'Failed to fetch playlist across instances' });
    }

    // 2. Fetch Direct Audio Stream
    if (videoId) {
        for (const base of INVIDIOUS_INSTANCES) {
            try {
                const response = await fetch(`${base}/videos/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    signal: AbortSignal.timeout(6000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const audioStreams = (data.adaptiveFormats || []).filter(
                        (f) => f.type && f.type.startsWith('audio/')
                    );
                    const bestAudio =
                        audioStreams.find((f) => f.container === 'm4a') || audioStreams[0];

                    if (bestAudio && bestAudio.url) {
                        return res.status(200).json({
                            url: bestAudio.url,
                            title: data.title,
                            artist: data.author,
                            duration: data.lengthSeconds
                        });
                    }
                }
            } catch (e) {}
        }
        return res.status(502).json({ error: 'Failed to extract audio stream' });
    }

    return res.status(400).json({ error: 'Missing videoId or playlistId' });
}