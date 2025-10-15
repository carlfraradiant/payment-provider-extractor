#!/usr/bin/env python3
"""
Setup script for the Payment Provider Checkout URL Extractor
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call(["python3", "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False

def check_config():
    """Check if configuration is set up correctly"""
    print("🔧 Checking configuration...")
    
    try:
        from config import HYPERBROWSER_API_KEY, OPENAI_API_KEY
        
        if not HYPERBROWSER_API_KEY or HYPERBROWSER_API_KEY == "your_hyperbrowser_key_here":
            print("❌ Hyperbrowser API key not configured")
            return False
        
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your_openai_key_here":
            print("❌ OpenAI API key not configured")
            return False
        
        print("✅ Configuration looks good!")
        return True
        
    except ImportError as e:
        print(f"❌ Error importing config: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Payment Provider Checkout URL Extractor")
    print("=" * 60)
    
    # Install requirements
    if not install_requirements():
        print("❌ Setup failed: Could not install requirements")
        sys.exit(1)
    
    # Check configuration
    if not check_config():
        print("❌ Setup failed: Configuration issues")
        sys.exit(1)
    
    print("\n✅ Setup completed successfully!")
    print("\n📖 Usage:")
    print("  python main.py                    # Interactive mode")
    print("  python main.py --url <URL>        # Single URL mode")
    print("  python main.py --url <URL> --detailed  # Detailed analysis")
    print("\n🎉 You're ready to extract checkout URLs!")

if __name__ == "__main__":
    main()
