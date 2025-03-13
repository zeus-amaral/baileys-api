#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# Variável global para armazenar o último QR Code recebido
latest_qr_code = None

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        global latest_qr_code

        # Obtém o tamanho do conteúdo
        content_length = int(self.headers.get('Content-Length', 0))
        # Lê os dados enviados
        post_data = self.rfile.read(content_length)

        print("Received POST data:")
        print(f"Path: {self.path}")
        print(f"Headers: {self.headers}")
        try:
            # Tenta interpretar os dados como JSON
            json_data = json.loads(post_data)
            print("JSON data:")
            print(json.dumps(json_data, indent=2))
        except json.JSONDecodeError:
            # Se não for JSON, retorna erro 400
            print("Raw data:")
            print(post_data.decode('utf-8'))
            self.send_response(400)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Invalid JSON')
            return

        # Verifica se o evento é "qr"
        if json_data.get("event") == "connection.update":
            qr_code = json_data.get("data", {}).get("qrCode")
            if qr_code:
                # Atualiza o último QR Code recebido
                latest_qr_code = qr_code
                # Responde com uma página HTML exibindo o QR Code atualizado
                html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QR Code Atualizado</title>
</head>
<body>
    <h1>QR Code Atualizado</h1>
    <img src="{qr_code}" alt="QR Code">
</body>
</html>"""
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(html.encode("utf-8"))
                return

        # Para outros eventos, responde com OK em texto simples
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')

    def do_GET(self):
        # Retorna uma página HTML simples que exibe o último QR Code
        # e atualiza automaticamente a cada 3 segundos
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="3">
    <title>Monitor de QR Code</title>
</head>
<body>
"""
        if latest_qr_code:
            html += "<h1>QR Code</h1>\n"
            html += f'<img src="{latest_qr_code}" alt="QR Code">\n'
        else:
            html += "<h1>Aguardando QR Code...</h1>\n"
        html += """
</body>
</html>
"""
        self.wfile.write(html.encode("utf-8"))

def run_server(host='0.0.0.0', port=3026):
    server_address = (host, port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f"Server running at http://{host}:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
