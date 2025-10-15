#!/usr/bin/env python3
"""
Minimal Vercel-compatible Flask application
"""

import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    """Main page"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Provider Extractor</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; border-radius: 10px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px; }
            .btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            .result { background: white; padding: 15px; border-radius: 5px; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🛒 Payment Provider Checkout URL Extractor</h1>
            <p>AI-powered e-commerce analysis tool</p>
        </div>
        
        <div class="content">
            <h2>🌐 Website Analysis</h2>
            <form id="analysisForm">
                <input type="url" id="websiteUrl" placeholder="https://example-shop.com" style="width: 70%; padding: 10px; margin-right: 10px;" required>
                <button type="submit" class="btn">🚀 Start Analysis</button>
            </form>
            
            <div id="result" class="result" style="display: none;">
                <h3>📊 Results</h3>
                <div id="resultContent"></div>
            </div>
        </div>
        
        <script>
            document.getElementById('analysisForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const url = document.getElementById('websiteUrl').value;
                const resultDiv = document.getElementById('result');
                const contentDiv = document.getElementById('resultContent');
                
                contentDiv.innerHTML = '<p>⏳ Analysis in progress...</p>';
                resultDiv.style.display = 'block';
                
                try {
                    const response = await fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: url, detailed: true })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        contentDiv.innerHTML = `
                            <p><strong>Session ID:</strong> ${data.session_id}</p>
                            <p><strong>Status:</strong> ${data.status}</p>
                            <p>Check back in a few minutes for results!</p>
                        `;
                    } else {
                        contentDiv.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                    }
                } catch (error) {
                    contentDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
                }
            });
        </script>
    </body>
    </html>
    """

@app.route('/api/analyze', methods=['POST'])
def analyze_website():
    """API endpoint to start website analysis"""
    try:
        from flask import request
        data = request.get_json()
        website_url = data.get('url', '').strip()
        
        if not website_url:
            return jsonify({'error': 'URL is required'}), 400
        
        # For now, return a simple response
        return jsonify({
            'session_id': 'test-session-123',
            'status': 'started',
            'message': f'Analysis started for {website_url}',
            'note': 'Full analysis functionality will be available after environment variables are configured'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'message': 'Payment Provider Extractor is running',
        'version': '1.0.0'
    }), 200

@app.route('/test')
def test_endpoint():
    """Simple test endpoint"""
    return jsonify({
        'message': 'Payment Provider Extractor API is working!',
        'version': '1.0.0',
        'endpoints': [
            'GET / - Web interface',
            'POST /api/analyze - Start analysis',
            'GET /health - Health check',
            'GET /test - This test endpoint'
        ]
    }), 200

# Vercel handler
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)