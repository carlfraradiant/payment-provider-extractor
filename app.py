#!/usr/bin/env python3
"""
Render-compatible Flask application with full functionality
"""

import os
import asyncio
import threading
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from checkout_agent import CheckoutURLExtractor

app = Flask(__name__, template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Configure SocketIO for production
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Store active sessions
active_sessions = {}

class WebProgressCallback:
    def __init__(self, session_id):
        self.session_id = session_id
    
    def __call__(self, message):
        socketio.emit('progress_update', {
            'session_id': self.session_id,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })

@app.route('/')
def index():
    """Main web interface"""
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_website():
    """Start website analysis"""
    try:
        data = request.get_json()
        website_url = data.get('url', '').strip()
        
        if not website_url:
            return jsonify({'error': 'URL is required'}), 400

        session_id = str(uuid.uuid4())
        active_sessions[session_id] = {
            'url': website_url,
            'status': 'starting',
            'start_time': datetime.now().isoformat(),
            'progress': [],
            'result': None
        }

        def run_analysis_sync():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            extractor = CheckoutURLExtractor(timeout_minutes=2)
            
            progress_callback = WebProgressCallback(session_id)
            
            try:
                result = loop.run_until_complete(
                    extractor.extract_checkout_url_with_streaming(website_url, progress_callback)
                )
                active_sessions[session_id]['result'] = result
                active_sessions[session_id]['status'] = 'completed'
                active_sessions[session_id]['end_time'] = datetime.now().isoformat()
                
                # Emit final result
                socketio.emit('analysis_complete', {
                    'session_id': session_id,
                    'result': result
                })
                
            except Exception as e:
                active_sessions[session_id]['status'] = 'error'
                active_sessions[session_id]['error'] = str(e)
                socketio.emit('analysis_error', {
                    'session_id': session_id,
                    'error': str(e)
                })
            finally:
                loop.close()

        thread = threading.Thread(target=run_analysis_sync)
        thread.daemon = True
        thread.start()

        return jsonify({
            'session_id': session_id,
            'status': 'started',
            'message': 'Analysis started successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/<id>')
def get_session_status(id):
    """Get session status and results"""
    session = active_sessions.get(id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session), 200

@app.route('/api/sessions')
def list_sessions():
    """List all sessions"""
    return jsonify(active_sessions), 200

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Payment Provider Extractor is running on Render',
        'version': '2.0.0',
        'platform': 'render',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/test')
def test_endpoint():
    """Test endpoint"""
    return jsonify({
        'message': 'Test endpoint working on Render!',
        'status': 'success',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
else:
    # This is for Gunicorn
    application = socketio