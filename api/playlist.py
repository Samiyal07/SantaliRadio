from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        playlist_id = query_params.get('id', [None])[0]

        self.send_response(200 if playlist_id else 400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 's-maxage=3600, stale-while-revalidate')
        self.end_headers()

        if not playlist_id:
            self.wfile.write(json.dumps({'error': 'Missing playlist ID'}).encode())
            return

        # Active public API mirrors
        instances = [
            f"https://pipedapi.adminforge.de/playlists/{playlist_id}",
            f"https://inv.nadeko.net/api/v1/playlists/{playlist_id}",
            f"https://invidious.nerdvpn.de/api/v1/playlists/{playlist_id}"
        ]

        tracks = []
        playlist_title = "Santali Radio"
        req_headers = {'User-Agent': 'Mozilla/5.0'}

        for url in instances:
            try:
                req = urllib.request.Request(url, headers=req_headers)
                with urllib.request.urlopen(req, timeout=4) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode())
                        
                        if 'relatedStreams' in data:
                            playlist_title = data.get('name', 'Santali Radio')
                            for item in data['relatedStreams']:
                                v_url = item.get('url', '')
                                v_id = v_url.split('v=')[-1] if 'v=' in v_url else item.get('videoId')
                                if v_id:
                                    tracks.append({
                                        'id': v_id,
                                        'title': item.get('title', 'Unknown'),
                                        'artist': item.get('uploaderName', 'Santali Artist')
                                    })
                            break
                        elif 'videos' in data:
                            playlist_title = data.get('title', 'Santali Radio')
                            for item in data['videos']:
                                v_id = item.get('videoId')
                                if v_id:
                                    tracks.append({
                                        'id': v_id,
                                        'title': item.get('title', 'Unknown'),
                                        'artist': item.get('author', 'Santali Artist')
                                    })
                            break
            except Exception:
                continue

        response_data = {
            'playlistTitle': playlist_title,
            'totalTracks': len(tracks),
            'tracks': tracks
        }
        self.wfile.write(json.dumps(response_data).encode())