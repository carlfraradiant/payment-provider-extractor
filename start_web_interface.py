#!/usr/bin/env python3
"""
Startup script for the Payment Provider Checkout URL Extractor Web Interface
"""

import subprocess
import sys
import os

def check_dependencies():
    """Check if all required packages are installed"""
    print("🔍 Checking dependencies...")
    
    try:
        import flask
        import flask_socketio
        import hyperbrowser
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("📦 Installing missing dependencies...")
        
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✅ Dependencies installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False

def main():
    """Main startup function"""
    print("🚀 Payment Provider Checkout URL Extractor - Web Interface")
    print("=" * 70)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Cannot start web interface due to missing dependencies")
        sys.exit(1)
    
    # Check configuration
    try:
        from config import HYPERBROWSER_API_KEY
        if not HYPERBROWSER_API_KEY or HYPERBROWSER_API_KEY == "your_hyperbrowser_key_here":
            print("❌ Hyperbrowser API key not configured")
            print("Please update config.py with your API key")
            sys.exit(1)
        print("✅ Configuration looks good")
    except ImportError:
        print("❌ Configuration file not found")
        sys.exit(1)
    
    print("\n🌐 Starting web interface...")
    print("📱 Web Interface will be available at: http://localhost:5001")
    print("🔧 API Endpoints:")
    print("   POST /api/analyze - Start website analysis")
    print("   GET  /api/session/<id> - Get session status")
    print("   GET  /api/sessions - List all sessions")
    print("\n💡 Press Ctrl+C to stop the server")
    print("=" * 70)
    
    # Start the web application
    try:
        from web_app import app, socketio
        socketio.run(app, debug=False, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\n👋 Web interface stopped")
    except Exception as e:
        print(f"\n❌ Error starting web interface: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
