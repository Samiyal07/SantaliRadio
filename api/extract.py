from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        video_id = query_params.get('id', [None])[0]

        self.send_response(200 if video_id else 400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        # 24-Hour Edge CDN Cache for instant loading
        self.send_header('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        self.end_headers()

        if not video_id:
            self.wfile.write(json.dumps({'error': 'Missing video ID'}).encode())
            return

        url = f"https://www.youtube.com/watch?v={video_id}"
        
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'quiet': True,
            'skip_download': True
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                response_data = {
                    'title': info.get('title'),
                    'artist': info.get('uploader'),
                    'streamUrl': info.get('url')
                }
                self.wfile.write(json.dumps(response_data).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())