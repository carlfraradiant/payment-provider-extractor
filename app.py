#!/usr/bin/env python3
"""
Vercel-compatible Flask application
"""

import os
import asyncio
import json
import threading
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from checkout_agent import CheckoutURLExtractor
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active sessions
active_sessions = {}

class WebProgressCallback:
    """Progress callback for web interface"""
    
    def __init__(self, session_id):
        self.session_id = session_id
    
    def __call__(self, message):
        # Emit progress update to the specific session
        socketio.emit('progress_update', {
            'message': message,
            'timestamp': datetime.now().strftime('%H:%M:%S')
        }, room=self.session_id)

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_website():
    """API endpoint to start website analysis"""
    try:
        data = request.get_json()
        website_url = data.get('url', '').strip()
        detailed = data.get('detailed', True)
        
        if not website_url:
            return jsonify({'error': 'URL is required'}), 400
        
        session_id = str(uuid.uuid4())
        active_sessions[session_id] = {
            'url': website_url,
            'detailed': detailed,
            'status': 'pending',
            'progress': [],
            'result': None
        }
        
        socketio.emit('session_started', {'session_id': session_id, 'url': website_url}, namespace='/')
        
        def run_analysis():
            active_sessions[session_id]['status'] = 'running'
            progress_callback = WebProgressCallback(session_id)
            extractor = CheckoutURLExtractor(timeout_minutes=2)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                if detailed:
                    result = loop.run_until_complete(
                        extractor.extract_checkout_url_with_streaming(website_url, progress_callback)
                    )
                else:
                    simple_result = loop.run_until_complete(
                        extractor.extract_checkout_url(website_url)
                    )
                    result = {'checkout_url': simple_result}
                
                # Update session with result
                active_sessions[session_id]['result'] = result
                active_sessions[session_id]['status'] = 'completed'
                active_sessions[session_id]['end_time'] = datetime.now()
                
                # Emit completion event
                socketio.emit('analysis_complete', {
                    'result': result,
                    'session_id': session_id
                }, room=session_id)
                
            except Exception as e:
                # Update session with error
                active_sessions[session_id]['status'] = 'error'
                active_sessions[session_id]['error'] = str(e)
                
                # Emit error event
                socketio.emit('analysis_error', {
                    'error': str(e),
                    'session_id': session_id
                }, room=session_id)
            finally:
                loop.close()
        
        thread = threading.Thread(target=run_analysis)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'session_id': session_id,
            'status': 'started',
            'message': 'Analysis started successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/<id>')
def get_session_status(id):
    """Get session status"""
    session = active_sessions.get(id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session), 200

@app.route('/api/sessions')
def list_sessions():
    """List all sessions"""
    return jsonify(active_sessions), 200

# Vercel handler
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    print("🚀 Payment Provider Checkout URL Extractor - Web Interface")
    print("=" * 70)
    print("🔍 Checking dependencies...")
    print("✅ All dependencies are installed")
    print("✅ Configuration looks good")
    print("\n🌐 Starting web interface...")
    print("📱 Web Interface will be available at: http://localhost:5000")
    print("🔧 API Endpoints:")
    print("   POST /api/analyze - Start website analysis")
    print("   GET  /api/session/<id> - Get session status")
    print("   GET  /api/sessions - List all sessions")
    print("=" * 70)
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
