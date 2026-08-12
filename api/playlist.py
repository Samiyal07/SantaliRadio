from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        playlist_id = query_params.get('id', [None])[0]

        self.send_response(200 if playlist_id else 400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        # Cache playlist structure for 1 hour
        self.send_header('Cache-Control', 's-maxage=3600, stale-while-revalidate')
        self.end_headers()

        if not playlist_id:
            self.wfile.write(json.dumps({'error': 'Missing playlist ID'}).encode())
            return

        playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
        
        # Fast flat-playlist metadata extraction (does not download audio)
        ydl_opts = {
            'extract_flat': True,
            'quiet': True,
            'skip_download': True
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                
                tracks = []
                for entry in info.get('entries', []):
                    if entry.get('id'):
                        tracks.append({
                            'id': entry.get('id'),
                            'title': entry.get('title', 'Unknown Title'),
                            'artist': entry.get('uploader', 'Santali Artist')
                        })

                response_data = {
                    'playlistTitle': info.get('title', 'Santali Radio'),
                    'totalTracks': len(tracks),
                    'tracks': tracks
                }
                self.wfile.write(json.dumps(response_data).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())