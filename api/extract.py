from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        video_id = query_params.get('id', [None])[0]

        self.send_response(200 if video_id else 400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        self.end_headers()

        if not video_id:
            self.wfile.write(json.dumps({'error': 'Missing video ID'}).encode())
            return

        youtube_url = f"https://www.youtube.com/watch?v={video_id}"

        # 1. Try Cobalt API (Highly stable and unblocked)
        try:
            payload = json.dumps({
                "url": youtube_url,
                "isAudioOnly": True,
                "downloadMode": "audio"
            }).encode("utf-8")

            req = urllib.request.Request(
                "https://api.cobalt.tools/api/json",
                data=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0"
                }
            )

            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    res_data = json.loads(response.read().decode())
                    stream_url = res_data.get("url")
                    if stream_url:
                        self.wfile.write(json.dumps({
                            'title': 'Santali Track',
                            'artist': 'Santali Artist',
                            'streamUrl': stream_url
                        }).encode())
                        return
        except Exception:
            pass

        # 2. Fallback to Piped stream mirror if Cobalt fails
        try:
            req = urllib.request.Request(
                f"https://pipedapi.adminforge.de/streams/{video_id}",
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    if 'audioStreams' in data and len(data['audioStreams']) > 0:
                        audio_stream = next((s for s in data['audioStreams'] if 'audio/mp4' in s.get('mimeType', '')), data['audioStreams'][0])
                        self.wfile.write(json.dumps({
                            'title': data.get('title', 'Santali Track'),
                            'artist': data.get('uploader', 'Santali Artist'),
                            'streamUrl': audio_stream.get('url')
                        }).encode())
                        return
        except Exception:
            pass

        self.send_response(500)
        self.wfile.write(json.dumps({'error': 'Extraction failed'}).encode())