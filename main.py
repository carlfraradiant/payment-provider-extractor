#!/usr/bin/env python3
"""
Payment Provider Checkout URL Extractor

This script uses Hyperbrowser to automatically navigate e-commerce websites,
add products to cart, and extract checkout URLs to identify payment providers.

Usage:
    python main.py
    python main.py --url "https://example-shop.com"
    python main.py --url "https://example-shop.com" --detailed
"""

import asyncio
import argparse
import sys
from checkout_agent import CheckoutURLExtractor

def print_banner():
    """Print a nice banner for the application"""
    print("=" * 60)
    print("🛒 PAYMENT PROVIDER CHECKOUT URL EXTRACTOR")
    print("=" * 60)
    print("This tool will navigate to e-commerce websites,")
    print("add products to cart, and extract checkout URLs")
    print("to help identify payment providers.")
    print("=" * 60)

def print_results(result, detailed=False):
    """Print the results in a formatted way"""
    if 'error' in result:
        print(f"\n❌ Error: {result['error']}")
        return
    
    print(f"\n✅ SUCCESS!")
    print("-" * 40)
    
    if detailed:
        print(f"🏪 Website: {result.get('website_name', 'Unknown')}")
        print(f"🛍️ Product Added: {result.get('product_added', 'Unknown')}")
        print(f"💳 Payment Providers: {', '.join(result.get('payment_providers', []))}")
        print(f"🔗 Checkout URL: {result.get('checkout_url', 'Not found')}")
        
        if result.get('steps_completed'):
            print(f"✅ Steps Completed: {result.get('steps_completed')}")
        
        if result.get('issues_encountered'):
            print(f"⚠️ Issues Encountered: {result.get('issues_encountered')}")
        
        # Screenshot information
        if result.get('screenshot'):
            screenshot_data = result['screenshot']
            if screenshot_data and screenshot_data.get('screenshot_base64'):
                print(f"📸 Screenshot: Captured successfully ({len(screenshot_data['screenshot_base64'])} chars)")
                if screenshot_data.get('timestamp'):
                    print(f"⏰ Screenshot timestamp: {screenshot_data['timestamp']}")
            elif screenshot_data and screenshot_data.get('live_url'):
                print(f"📸 Live Session URL: {screenshot_data['live_url']}")
                print("💡 You can visit this URL to see the current state of the checkout page")
            else:
                print("📸 Screenshot: Not available")
        else:
            print("📸 Screenshot: Not captured")
    else:
        print(f"🔗 Checkout URL: {result.get('checkout_url', 'Not found')}")
    
    if result.get('raw_response'):
        print(f"\n📝 Raw Agent Response:")
        print("-" * 20)
        print(result['raw_response'])

async def interactive_mode():
    """Run the tool in interactive mode"""
    extractor = CheckoutURLExtractor()
    
    print("\n🔍 Interactive Mode")
    print("Enter website URLs to analyze (type 'quit' to exit)")
    print("-" * 50)
    
    while True:
        try:
            url = input("\n🌐 Enter website URL: ").strip()
            
            if url.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not url:
                print("❌ Please enter a valid URL")
                continue
            
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            
            print(f"\n🔄 Analyzing: {url}")
            print("⏳ This may take a few minutes...")
            
            # Ask for detailed analysis
            detailed = input("📊 Include detailed analysis? (y/N): ").strip().lower() == 'y'
            
            if detailed:
                result = await extractor.extract_checkout_url_with_details(url)
            else:
                simple_result = await extractor.extract_checkout_url(url)
                result = {'checkout_url': simple_result}
            
            print_results(result, detailed)
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")

async def single_url_mode(url, detailed=False, streaming=False):
    """Run the tool for a single URL"""
    extractor = CheckoutURLExtractor()
    
    print(f"\n🔄 Analyzing: {url}")
    
    if streaming:
        print("📡 Streaming mode enabled - you'll see real-time progress updates")
        print("⏳ This may take 2-5 minutes depending on the website...")
        
        def progress_callback(message):
            print(f"  {message}")
        
        if detailed:
            result = await extractor.extract_checkout_url_with_streaming(url, progress_callback)
        else:
            # For simple mode with streaming, we'll use the detailed version but only show checkout URL
            result = await extractor.extract_checkout_url_with_streaming(url, progress_callback)
    else:
        print("⏳ This may take a few minutes...")
        
        if detailed:
            result = await extractor.extract_checkout_url_with_details(url)
        else:
            simple_result = await extractor.extract_checkout_url(url)
            result = {'checkout_url': simple_result}
    
    print_results(result, detailed)

def main():
    """Main function to handle command line arguments and run the tool"""
    parser = argparse.ArgumentParser(
        description="Extract checkout URLs from e-commerce websites to identify payment providers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 main.py                                    # Interactive mode
  python3 main.py --url "https://shop.example.com"  # Single URL mode
  python3 main.py --url "https://shop.example.com" --detailed  # Detailed analysis
  python3 main.py --url "https://shop.example.com" --streaming  # Real-time progress
  python3 main.py --url "https://shop.example.com" --detailed --streaming  # Full analysis with streaming
        """
    )
    
    parser.add_argument(
        '--url', 
        type=str, 
        help='URL of the e-commerce website to analyze'
    )
    
    parser.add_argument(
        '--detailed', 
        action='store_true', 
        help='Include detailed analysis (payment providers, product info, etc.)'
    )
    
    parser.add_argument(
        '--streaming', 
        action='store_true', 
        help='Enable real-time progress streaming (recommended for debugging)'
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    try:
        if args.url:
            # Single URL mode
            asyncio.run(single_url_mode(args.url, args.detailed, args.streaming))
        else:
            # Interactive mode
            asyncio.run(interactive_mode())
            
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
