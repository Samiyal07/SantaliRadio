from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import urllib.request
import urllib.error

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        video_id = query_params.get('id', [None])[0]

        # Enable CORS and 24-Hour Edge CDN Caching
        self.send_response(200 if video_id else 400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        self.end_headers()

        if not video_id:
            self.wfile.write(json.dumps({'error': 'Missing video ID'}).encode())
            return

        # List of reliable stream extraction provider APIs
        providers = [
            f"https://pipedapi.kavin.rocks/streams/{video_id}",
            f"https://api.piped.yt/streams/{video_id}",
            f"https://inv.nadeko.net/api/v1/videos/{video_id}"
        ]

        stream_url = None
        title = "Santali Track"
        artist = "Santali Radio"

        req_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

        for provider in providers:
            try:
                req = urllib.request.Request(provider, headers=req_headers)
                with urllib.request.urlopen(req, timeout=4) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode())
                        
                        # Handle Piped API Response format
                        if 'audioStreams' in data and len(data['audioStreams']) > 0:
                            # Prefer m4a / mp4 audio
                            audio_stream = next((s for s in data['audioStreams'] if 'audio/mp4' in s.get('mimeType', '')), data['audioStreams'][0])
                            stream_url = audio_stream.get('url')
                            title = data.get('title', title)
                            artist = data.get('uploader', artist)
                            break
                        
                        # Handle Invidious API Response format
                        elif 'adaptiveFormats' in data:
                            audio_stream = next((f for f in data['adaptiveFormats'] if 'audio' in f.get('type', '')), None)
                            if audio_stream:
                                stream_url = audio_stream.get('url')
                                title = data.get('title', title)
                                artist = data.get('author', artist)
                                break
            except Exception as e:
                continue # Fallback to next provider if one fails or times out

        if stream_url:
            response_data = {
                'title': title,
                'artist': artist,
                'streamUrl': stream_url
            }
            self.wfile.write(json.dumps(response_data).encode())
        else:
            self.send_response(500)
            self.wfile.write(json.dumps({'error': 'All extraction streams failed.'}).encode())