export default async function handler(req, res) {
    // Set permissive CORS headers so your app and APK can fetch freely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { videoId, playlistId } = req.query;

    const PIPED_INSTANCES = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.privacy.com.de',
        'https://piped-api.garudalinux.org',
        'https://api.piped.projectsegfau.lt'
    ];

    // 1. If fetching full playlist metadata
    if (playlistId) {
        for (const base of PIPED_INSTANCES) {
            try {
                const response = await fetch(`${base}/playlists/${playlistId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (response.ok) {
                    const data = await response.json();
                    return res.status(200).json(data);
                }
            } catch (e) {}
        }
        return res.status(502).json({ error: 'Failed to fetch playlist' });
    }

    // 2. If fetching a specific video audio stream
    if (videoId) {
        for (const base of PIPED_INSTANCES) {
            try {
                const response = await fetch(`${base}/streams/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (response.ok) {
                    const data = await response.json();
                    const audioStreams = data.audioStreams || [];
                    
                    // Pick the best m4a or fallback audio stream
                    const bestAudio = audioStreams.find(s => s.format === 'M4A' || s.quality === '128kbps') || audioStreams[0];

                    if (bestAudio && bestAudio.url) {
                        return res.status(200).json({
                            url: bestAudio.url,
                            title: data.title,
                            artist: data.uploader,
                            duration: data.duration
                        });
                    }
                }
            } catch (e) {}
        }
        return res.status(502).json({ error: 'Failed to extract audio stream' });
    }

    return res.status(400).json({ error: 'Missing videoId or playlistId parameter' });
}