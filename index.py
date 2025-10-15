from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Payment Provider Extractor API is working!',
        'status': 'healthy',
        'version': '1.0.1',
        'deployment': 'latest'
    })

@app.route('/test')
def test():
    return jsonify({
        'message': 'Test endpoint working!',
        'endpoints': ['/', '/test', '/health']
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

# Vercel entry point
def handler(request):
    return app(request.environ, lambda status, headers: None)

# WSGI entry point
def application(environ, start_response):
    return app(environ, start_response)

if __name__ == '__main__':
    app.run(debug=True)
