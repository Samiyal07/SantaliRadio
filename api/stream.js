import play from 'play-dl';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { videoId, playlistId } = req.query;

    // 1. Fetch Playlist Info
    if (playlistId) {
        try {
            // Using YouTube Data API mirror or public playlist scraper
            const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
            const playlistInfo = await play.playlist_info(playlistUrl, { incomplete: true });
            const videos = await playlistInfo.all_videos();

            if (videos && videos.length > 0) {
                const formatted = videos.map((v, i) => ({
                    id: v.id,
                    title: v.title || `Track ${i + 1}`,
                    artist: v.channel?.name || 'Santali Artist',
                    duration: v.durationInSec || 240
                }));
                return res.status(200).json({ videos: formatted });
            }
        } catch (e) {
            console.error('Playlist extraction error:', e);
        }

        // Fallback: Invidious Public Mirrors
        const FALLBACK_INVIDIOUS = [
            'https://invidious.nerdvpn.de/api/v1',
            'https://inv.nadeko.net/api/v1',
            'https://vid.priv.au/api/v1'
        ];

        for (const base of FALLBACK_INVIDIOUS) {
            try {
                const r = await fetch(`${base}/playlists/${playlistId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(4000)
                });
                if (r.ok) {
                    const data = await r.json();
                    return res.status(200).json(data);
                }
            } catch (err) {}
        }

        return res.status(502).json({ error: 'Playlist resolution failed' });
    }

    // 2. Extract Direct Audio URL for Video
    if (videoId) {
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const stream = await play.stream(videoUrl, { quality: 2 }); // Quality 2 = best audio
            if (stream && stream.url) {
                return res.status(200).json({ url: stream.url });
            }
        } catch (e) {
            console.warn('play-dl direct stream failed, using piped fallback...', e.message);
        }

        // Fallback: Piped & Invidious Audio format extractors
        const PIPED_FALLBACKS = [
            `https://pipedapi.kavin.rocks/streams/${videoId}`,
            `https://api.piped.privacy.com.de/streams/${videoId}`,
            `https://api.piped.projectsegfau.lt/streams/${videoId}`
        ];

        for (const endpoint of PIPED_FALLBACKS) {
            try {
                const r = await fetch(endpoint, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(4000)
                });
                if (r.ok) {
                    const data = await r.json();
                    const audioStreams = data.audioStreams || [];
                    const best = audioStreams.find(s => s.format === 'M4A' || s.quality === '128kbps') || audioStreams[0];
                    if (best && best.url) {
                        return res.status(200).json({ url: best.url });
                    }
                }
            } catch (err) {}
        }

        return res.status(502).json({ error: 'Audio stream extraction failed' });
    }

    return res.status(400).json({ error: 'Missing videoId or playlistId' });
}