#!/usr/bin/env python3
"""
Web-based interface for Payment Provider Checkout URL Extractor
"""

import asyncio
import json
import threading
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from checkout_agent import CheckoutURLExtractor
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
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
        
        if not website_url.startswith(('http://', 'https://')):
            website_url = 'https://' + website_url
        
        # Create a unique session ID
        session_id = str(uuid.uuid4())
        
        # Store session info
        active_sessions[session_id] = {
            'url': website_url,
            'detailed': detailed,
            'status': 'starting',
            'start_time': datetime.now(),
            'progress': [],
            'result': None
        }
        
        # Start analysis in background thread
        thread = threading.Thread(
            target=run_analysis,
            args=(session_id, website_url, detailed)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'session_id': session_id,
            'status': 'started',
            'message': 'Analysis started successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def run_analysis(session_id, website_url, detailed):
    """Run the analysis in a background thread"""
    try:
        # Update session status
        active_sessions[session_id]['status'] = 'running'
        
        # Create progress callback
        progress_callback = WebProgressCallback(session_id)
        
        # Create extractor with 2-minute timeout and run analysis
        extractor = CheckoutURLExtractor(timeout_minutes=2)
        
        # Run the async function in the thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
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

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_session')
def handle_join_session(data):
    """Handle client joining a session"""
    session_id = data.get('session_id')
    if session_id:
        # Join the session room
        from flask_socketio import join_room
        join_room(session_id)
        
        # Send current session status if it exists
        if session_id in active_sessions:
            session_data = active_sessions[session_id]
            emit('session_status', {
                'status': session_data['status'],
                'url': session_data['url'],
                'detailed': session_data['detailed'],
                'start_time': session_data['start_time'].isoformat() if session_data['start_time'] else None,
                'result': session_data.get('result'),
                'error': session_data.get('error')
            })

@app.route('/api/session/<session_id>')
def get_session_status(session_id):
    """Get session status"""
    if session_id in active_sessions:
        session_data = active_sessions[session_id]
        return jsonify({
            'session_id': session_id,
            'status': session_data['status'],
            'url': session_data['url'],
            'detailed': session_data['detailed'],
            'start_time': session_data['start_time'].isoformat() if session_data['start_time'] else None,
            'end_time': session_data.get('end_time').isoformat() if session_data.get('end_time') else None,
            'result': session_data.get('result'),
            'error': session_data.get('error')
        })
    else:
        return jsonify({'error': 'Session not found'}), 404

@app.route('/api/sessions')
def list_sessions():
    """List all active sessions"""
    sessions = []
    for session_id, data in active_sessions.items():
        sessions.append({
            'session_id': session_id,
            'url': data['url'],
            'status': data['status'],
            'start_time': data['start_time'].isoformat() if data['start_time'] else None,
            'end_time': data.get('end_time').isoformat() if data.get('end_time') else None
        })
    return jsonify(sessions)

if __name__ == '__main__':
    print("🚀 Starting Payment Provider Checkout URL Extractor Web Interface")
    print("=" * 70)
    print("📱 Web Interface: http://localhost:5000")
    print("🔧 API Endpoints:")
    print("   POST /api/analyze - Start website analysis")
    print("   GET  /api/session/<id> - Get session status")
    print("   GET  /api/sessions - List all sessions")
    print("=" * 70)
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
