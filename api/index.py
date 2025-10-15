#!/usr/bin/env python3
"""
Vercel serverless function entry point
"""

import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web_app import app

# This is the entry point for Vercel
def handler(request):
    return app(request.environ, start_response)

def start_response(status, headers):
    pass

# For Vercel's Python runtime
if __name__ == "__main__":
    app.run()
