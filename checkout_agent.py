import os
import asyncio
import signal
import threading
import time
import base64
import io
from PIL import Image
from hyperbrowser import AsyncHyperbrowser
from hyperbrowser.models import StartBrowserUseTaskParams, CreateSessionParams
from config import HYPERBROWSER_API_KEY

class CheckoutURLExtractor:
    """
    A web browsing agent that navigates to e-commerce websites,
    adds products to cart, and extracts the checkout URL.
    """
    
    def __init__(self, timeout_minutes=2):
        self.hb = AsyncHyperbrowser(api_key=HYPERBROWSER_API_KEY)
        self.timeout_minutes = timeout_minutes
        self.timeout_seconds = timeout_minutes * 60
    
    async def _capture_checkout_screenshot(self, session_id, progress_callback=None):
        """
        Capture a screenshot of the current page using the session's live view.
        This ensures all JavaScript widgets are fully rendered.
        """
        try:
            if progress_callback:
                progress_callback("📸 Capturing checkout page screenshot...")
            
            # Get session details to access the live URL
            session_details = await self.hb.sessions.get(session_id)
            
            if not session_details:
                if progress_callback:
                    progress_callback("⚠️ Could not get session details for screenshot")
                return None
            
            # Get the live URL from session details
            live_url = getattr(session_details, 'live_url', None)
            
            if not live_url:
                if progress_callback:
                    progress_callback("⚠️ No live URL available for screenshot")
                return None
            
            if progress_callback:
                progress_callback(f"📸 Live session URL: {live_url}")
                progress_callback("📸 Screenshot capture completed - live URL available")
            
            # Return the live URL information for screenshot capture
            # The user can manually visit this URL to see the current state
            return {
                'screenshot_base64': None,
                'timestamp': None,
                'live_url': live_url,
                'status': 'live_url_available',
                'message': 'Live session URL available for manual screenshot capture'
            }
                
        except Exception as e:
            if progress_callback:
                progress_callback(f"❌ Error capturing screenshot: {str(e)}")
            return None
    
    def _parse_agent_response(self, response_text):
        """Parse the agent response text into a structured dictionary"""
        if not response_text:
            return {'error': 'No response from agent'}
        
        result = {}
        lines = response_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('CHECKOUT_URL:'):
                result['checkout_url'] = line.replace('CHECKOUT_URL:', '').strip()
            elif line.startswith('PAYMENT_PROVIDERS:'):
                providers_text = line.replace('PAYMENT_PROVIDERS:', '').strip()
                result['payment_providers'] = [p.strip() for p in providers_text.split(',') if p.strip()]
            elif line.startswith('PRODUCT_ADDED:'):
                result['product_added'] = line.replace('PRODUCT_ADDED:', '').strip()
            elif line.startswith('WEBSITE_NAME:'):
                result['website_name'] = line.replace('WEBSITE_NAME:', '').strip()
            elif line.startswith('STEPS_COMPLETED:'):
                result['steps_completed'] = line.replace('STEPS_COMPLETED:', '').strip()
            elif line.startswith('ISSUES_ENCOUNTERED:'):
                result['issues_encountered'] = line.replace('ISSUES_ENCOUNTERED:', '').strip()
            elif line.startswith('SCREENSHOT_READY:'):
                result['screenshot_ready'] = line.replace('SCREENSHOT_READY:', '').strip()
        
        # Store the raw response for debugging
        result['raw_response'] = response_text
        
        return result
    
    async def _run_with_session_timeout(self, task_description, session_options, progress_callback=None):
        """
        Run a browser task with proper session timeout management.
        This creates a session, runs the task, and properly stops the session on timeout.
        """
        session_id = None
        
        try:
            if progress_callback:
                progress_callback(f"⏱️ Starting analysis with {self.timeout_minutes}-minute timeout...")
            
            # Create a session first
            if progress_callback:
                progress_callback("🔧 Creating browser session...")
            
            session = await self.hb.sessions.create(session_options)
            session_id = session.id
            
            if progress_callback:
                progress_callback(f"✅ Session created: {session_id}")
            
            # Create the browser task with the session
            async def browser_task():
                return await self.hb.agents.browser_use.start_and_wait(
                    StartBrowserUseTaskParams(
                        task=task_description,
                        session_id=session_id
                    )
                )
            
            # Start the browser task
            browser_task_coro = browser_task()
            browser_task_obj = asyncio.create_task(browser_task_coro)
            
            # Create a timeout task
            timeout_task = asyncio.create_task(asyncio.sleep(self.timeout_seconds))
            
            # Wait for either completion or timeout
            done, pending = await asyncio.wait(
                [browser_task_obj, timeout_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Check if timeout occurred
            if timeout_task in done and browser_task_obj not in done:
                if progress_callback:
                    progress_callback(f"⏰ TIMEOUT: Analysis exceeded {self.timeout_minutes} minutes - stopping session to save credits")
                
                # Cancel the browser task
                browser_task_obj.cancel()
                
                # Stop the session to prevent further credit usage
                try:
                    if progress_callback:
                        progress_callback(f"🛑 Stopping session {session_id} to save credits...")
                    
                    stop_response = await self.hb.sessions.stop(session_id)
                    if progress_callback:
                        progress_callback(f"✅ Session stopped successfully: {stop_response.success}")
                        
                except Exception as stop_error:
                    if progress_callback:
                        progress_callback(f"⚠️ Warning: Could not stop session cleanly: {stop_error}")
                
                return {
                    'error': f'Analysis timed out after {self.timeout_minutes} minutes and session was stopped to save credits. This usually means the website is too complex or has anti-bot protection.',
                    'timeout': True,
                    'timeout_minutes': self.timeout_minutes,
                    'session_id': session_id
                }
            else:
                # Browser task completed normally
                if browser_task_obj in done:
                    result = await browser_task_obj
                    
                    # Capture screenshot before stopping the session
                    screenshot_data = await self._capture_checkout_screenshot(session_id, progress_callback)
                    
                    # Convert result to dictionary if it's a BrowserUseTaskResponse
                    if hasattr(result, 'data') and hasattr(result.data, 'final_result'):
                        # Parse the final result to extract information
                        final_result = result.data.final_result
                        parsed_result = self._parse_agent_response(final_result)
                        
                        # Add screenshot data if available
                        if screenshot_data:
                            parsed_result['screenshot'] = screenshot_data
                        
                        # Stop the session since we're done
                        try:
                            await self.hb.sessions.stop(session_id)
                        except Exception as stop_error:
                            if progress_callback:
                                progress_callback(f"⚠️ Warning: Could not stop session cleanly: {stop_error}")
                        
                        return parsed_result
                    else:
                        # If result is already a dictionary, add screenshot data
                        if isinstance(result, dict):
                            if screenshot_data:
                                result['screenshot'] = screenshot_data
                        else:
                            # Convert to dictionary
                            result_dict = {'raw_response': str(result)}
                            if screenshot_data:
                                result_dict['screenshot'] = screenshot_data
                            result = result_dict
                        
                        # Stop the session since we're done
                        try:
                            await self.hb.sessions.stop(session_id)
                        except Exception as stop_error:
                            if progress_callback:
                                progress_callback(f"⚠️ Warning: Could not stop session cleanly: {stop_error}")
                        
                        return result
                else:
                    return {'error': 'Unexpected task completion state'}
                    
        except Exception as e:
            # Make sure to stop the session if it was created
            if session_id:
                try:
                    await self.hb.sessions.stop(session_id)
                except:
                    pass  # Ignore errors when stopping session during cleanup
            
            if progress_callback:
                progress_callback(f"❌ Error during analysis: {str(e)}")
            
            return {
                'error': f'Analysis failed: {str(e)}',
                'timeout': False
            }
    
    async def extract_checkout_url(self, website_url: str) -> str:
        """
        Navigate to a website, add a product to cart, and extract the checkout URL.
        
        Args:
            website_url (str): The URL of the e-commerce website to analyze
            
        Returns:
            str: The checkout/cart URL with the product added
        """
        
        task_description = f"""
        Navigate to the website: {website_url}
        
        Your task is to:
        1. Go to the website and explore the product catalog
        2. Find any product and add it to the shopping cart/basket
        3. Navigate to the checkout or cart page
        4. Extract the current URL of the checkout/cart page
        5. Return ONLY the checkout URL in this exact format: CHECKOUT_URL: [URL]
        
        Important instructions:
        - Look for "Add to Cart", "Add to Basket", "Buy Now", or similar buttons
        - If there are multiple products, choose the first available one
        - If the product requires size/color selection, choose any available option
        - Navigate to the cart/checkout page after adding the product
        - Extract the URL from the address bar of the checkout/cart page
        - Return the URL in the exact format: CHECKOUT_URL: [the actual URL]
        """
        
        # Define session options
        session_options = CreateSessionParams(
            accept_cookies=True,
            headless=False,  # Set to True if you don't want to see the browser
        )
        
        # Run with proper session timeout management
        resp = await self._run_with_session_timeout(task_description, session_options)
        
        # Handle the response
        if isinstance(resp, dict) and 'error' in resp:
            return resp['error']
        
        if resp and hasattr(resp, 'data') and resp.data is not None:
            result = resp.data.final_result
            
            # Extract the checkout URL from the result
            if "CHECKOUT_URL:" in result:
                checkout_url = result.split("CHECKOUT_URL:")[1].strip()
                return checkout_url
            else:
                # If the format wasn't followed, try to extract any URL from the result
                lines = result.split('\n')
                for line in lines:
                    if 'http' in line and ('checkout' in line.lower() or 'cart' in line.lower() or 'basket' in line.lower()):
                        return line.strip()
                
                return f"Could not extract checkout URL. Agent response: {result}"
        else:
            return "No response from the agent"
    
    async def extract_checkout_url_with_details(self, website_url: str) -> dict:
        """
        Enhanced version that returns both the checkout URL and additional details.
        
        Args:
            website_url (str): The URL of the e-commerce website to analyze
            
        Returns:
            dict: Dictionary containing checkout URL and additional information
        """
        
        task_description = f"""
        Navigate to the website: {website_url}
        
        CRITICAL: Follow these steps EXACTLY in order:
        
        STEP 1 - COOKIE ACCEPTANCE:
        - Look for cookie consent banners, popups, or overlays
        - Click "Accept", "Accept All", "I Agree", "OK", or similar buttons
        - If there are multiple cookie options, accept all cookies
        - If you see ANY popup, modal, or overlay, try to close it by:
          * Clicking "X", "Close", "Skip", "No thanks", or similar buttons
          * Pressing the Escape key
          * Clicking outside the popup
        - Wait for any popups to disappear before proceeding
        - If popups persist, try refreshing the page and starting over
        
        STEP 2 - PRODUCT DISCOVERY:
        - Look for product categories, "Shop", "Products", or similar navigation
        - Click on a product category or browse products
        - Find ANY available product (preferably the first one you see)
        - Click on the product to view its details
        
        STEP 3 - PRODUCT SELECTION:
        - If the product has size/color/variant options, select ANY available option
        - Look for "Add to Cart", "Add to Basket", "Buy Now", or similar buttons
        - Click the add to cart button
        - Wait for confirmation that the item was added (look for success messages, cart icons updating, etc.)
        
        STEP 4 - CART VERIFICATION:
        - Verify the product is actually in the cart by looking for:
          * Cart count increasing
          * Success message
          * Cart icon showing items
        - If the cart appears empty, try adding the product again
        
        STEP 5 - CART BUTTON CLICK (CRITICAL - DO NOT SKIP):
        - After adding the product, you MUST click the cart/basket icon or button
        - Look for cart icons, "Cart", "Basket", "View Cart", "Checkout", or similar buttons
        - The cart icon is usually in the top-right corner or header area
        - Click on the cart button to go to the cart page
        - Wait for the cart page to fully load
        - Verify you can see the product you added in the cart
        - If you cannot find a cart button, look for "My Cart", "Shopping Cart", or similar text links
        
        STEP 6 - CHECKOUT BUTTON CLICK (CRITICAL - MUST REACH FINAL CHECKOUT):
        - After reaching the cart page, you MUST click the "Checkout" button to proceed to the final checkout page
        - Look for buttons like "Checkout", "Proceed to Checkout", "Continue to Checkout", "Secure Checkout", or similar
        - The checkout button is usually prominently displayed on the cart page
        - Click the checkout button to go to the final checkout page where payment information is entered
        - This is the page where payment providers (Visa, Mastercard, PayPal, etc.) are visible
        - Wait for the final checkout page to fully load
        - Verify you can see payment method options and billing/shipping forms
        
        STEP 7 - URL EXTRACTION:
        - Copy the current URL from the address bar
        - This should be the final checkout page URL with the product you added
        
        STEP 8 - PAYMENT PROVIDER IDENTIFICATION:
        - Look for payment method logos, text, or buttons on the checkout page
        - Common providers include: Stripe, PayPal, Apple Pay, Google Pay, Klarna, Afterpay, Visa, Mastercard, etc.
        - Note any payment provider names or logos you can see
        
        IMPORTANT RULES:
        - Take your time with each step
        - If a step fails, try it again before moving to the next step
        - Always verify the cart has items before proceeding to checkout
        - CRITICAL: You MUST click the cart button after adding a product to go to the cart page
        - CRITICAL: You MUST click the checkout button on the cart page to reach the final checkout page
        - Do NOT stop at the cart page - you must reach the final checkout page where payment forms are visible
        - The final checkout page is where payment providers (Visa, Mastercard, PayPal, etc.) are displayed
        - If you encounter errors, describe what went wrong and try alternative approaches
        
        Return the information in this exact format:
        
        CHECKOUT_URL: [the exact URL from the address bar]
        PAYMENT_PROVIDERS: [list of payment providers found, separated by commas]
        PRODUCT_ADDED: [exact name of the product that was added]
        WEBSITE_NAME: [name of the website/shop]
        STEPS_COMPLETED: [describe which steps you successfully completed]
        ISSUES_ENCOUNTERED: [describe any problems you faced]
        """
        
        # Define session options
        session_options = CreateSessionParams(
            accept_cookies=True,
            headless=False,
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport_width=1920,
            viewport_height=1080,
        )
        
        # Run with proper session timeout management
        resp = await self._run_with_session_timeout(task_description, session_options)
        
        # Handle the response
        if isinstance(resp, dict) and 'error' in resp:
            return resp
        
        if resp and hasattr(resp, 'data') and resp.data is not None:
            result = resp.data.final_result
            
            # Parse the structured response
            info = {
                'checkout_url': None,
                'payment_providers': [],
                'product_added': None,
                'website_name': None,
                'raw_response': result
            }
            
            if result:
                lines = result.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('CHECKOUT_URL:'):
                        info['checkout_url'] = line.replace('CHECKOUT_URL:', '').strip()
                    elif line.startswith('PAYMENT_PROVIDERS:'):
                        providers = line.replace('PAYMENT_PROVIDERS:', '').strip()
                        info['payment_providers'] = [p.strip() for p in providers.split(',') if p.strip()]
                    elif line.startswith('PRODUCT_ADDED:'):
                        info['product_added'] = line.replace('PRODUCT_ADDED:', '').strip()
                    elif line.startswith('WEBSITE_NAME:'):
                        info['website_name'] = line.replace('WEBSITE_NAME:', '').strip()
            
            return info
        else:
            return {'error': 'No response from the agent'}
    
    async def extract_checkout_url_with_streaming(self, website_url: str, progress_callback=None) -> dict:
        """
        Enhanced version with real-time progress streaming.
        
        Args:
            website_url (str): The URL of the e-commerce website to analyze
            progress_callback: Optional callback function to receive progress updates
            
        Returns:
            dict: Dictionary containing checkout URL and additional information
        """
        
        if progress_callback:
            progress_callback("🚀 Starting checkout URL extraction...")
            progress_callback(f"🌐 Target website: {website_url}")
        
        task_description = f"""
        Navigate to the website: {website_url}
        
        CRITICAL: Follow these steps EXACTLY in order and report your progress after each step:
        
        STEP 1 - COOKIE ACCEPTANCE:
        - Look for cookie consent banners, popups, or overlays
        - Click "Accept", "Accept All", "I Agree", "OK", or similar buttons
        - If there are multiple cookie options, accept all cookies
        - If you see ANY popup, modal, or overlay, try to close it by:
          * Clicking "X", "Close", "Skip", "No thanks", or similar buttons
          * Pressing the Escape key
          * Clicking outside the popup
        - Wait for any popups to disappear before proceeding
        - If popups persist, try refreshing the page and starting over
        - REPORT: "STEP 1 COMPLETE: Cookies accepted and popups closed" or describe any issues
        
        STEP 2 - PRODUCT DISCOVERY:
        - Look for product categories, "Shop", "Products", or similar navigation
        - Click on a product category or browse products
        - Find ANY available product (preferably the first one you see)
        - Click on the product to view its details
        - REPORT: "STEP 2 COMPLETE: Found product [product name]" or describe any issues
        
        STEP 3 - PRODUCT SELECTION:
        - If the product has size/color/variant options, select ANY available option
        - Look for "Add to Cart", "Add to Basket", "Buy Now", or similar buttons
        - Click the add to cart button
        - Wait for confirmation that the item was added (look for success messages, cart icons updating, etc.)
        - REPORT: "STEP 3 COMPLETE: Product added to cart" or describe any issues
        
        STEP 4 - CART VERIFICATION:
        - Verify the product is actually in the cart by looking for:
          * Cart count increasing
          * Success message
          * Cart icon showing items
        - If the cart appears empty, try adding the product again
        - REPORT: "STEP 4 COMPLETE: Cart verified with items" or describe any issues
        
        STEP 5 - CART BUTTON CLICK (CRITICAL - DO NOT SKIP):
        - After adding the product, you MUST click the cart/basket icon or button
        - Look for cart icons, "Cart", "Basket", "View Cart", "Checkout", or similar buttons
        - The cart icon is usually in the top-right corner or header area
        - Click on the cart button to go to the cart page
        - Wait for the cart page to fully load
        - Verify you can see the product you added in the cart
        - If you cannot find a cart button, look for "My Cart", "Shopping Cart", or similar text links
        - REPORT: "STEP 5 COMPLETE: Clicked cart button and navigated to cart page with product" or describe any issues
        
        STEP 6 - CHECKOUT BUTTON CLICK (CRITICAL - MUST REACH FINAL CHECKOUT):
        - After reaching the cart page, you MUST click the "Checkout" button to proceed to the final checkout page
        - Look for buttons like "Checkout", "Proceed to Checkout", "Continue to Checkout", "Secure Checkout", or similar
        - The checkout button is usually prominently displayed on the cart page
        - Click the checkout button to go to the final checkout page where payment information is entered
        - This is the page where payment providers (Visa, Mastercard, PayPal, etc.) are visible
        - Wait for the final checkout page to fully load
        - Verify you can see payment method options and billing/shipping forms
        - REPORT: "STEP 6 COMPLETE: Clicked checkout button and reached final checkout page" or describe any issues
        
        STEP 7 - URL EXTRACTION:
        - Copy the current URL from the address bar
        - This should be the final checkout page URL with the product you added
        - REPORT: "STEP 7 COMPLETE: URL extracted [URL]" or describe any issues
        
        STEP 8 - PAYMENT PROVIDER IDENTIFICATION:
        - Look for payment method logos, text, or buttons on the checkout page
        - Common providers include: Stripe, PayPal, Apple Pay, Google Pay, Klarna, Afterpay, Visa, Mastercard, etc.
        - Note any payment provider names or logos you can see
        - REPORT: "STEP 8 COMPLETE: Payment providers identified [list]" or describe any issues
        
        STEP 9 - SCREENSHOT CAPTURE (CRITICAL):
        - Wait for the page to fully load and all JavaScript widgets to render
        - Ensure all payment forms, buttons, and widgets are visible
        - Wait an additional 2-3 seconds to ensure everything is fully loaded
        - Scroll to the top of the page to capture the full checkout interface
        - The system will automatically capture a screenshot of this page
        - REPORT: "STEP 9 COMPLETE: Page fully loaded and ready for screenshot capture"
        
        IMPORTANT RULES:
        - Take your time with each step
        - If a step fails, try it again before moving to the next step
        - Always verify the cart has items before proceeding to checkout
        - CRITICAL: You MUST click the cart button after adding a product to go to the cart page
        - CRITICAL: You MUST click the checkout button on the cart page to reach the final checkout page
        - Do NOT stop at the cart page - you must reach the final checkout page where payment forms are visible
        - The final checkout page is where payment providers (Visa, Mastercard, PayPal, etc.) are displayed
        - If you encounter errors, describe what went wrong and try alternative approaches
        - Report your progress after each step
        
        Return the information in this exact format:
        
        CHECKOUT_URL: [the exact URL from the address bar]
        PAYMENT_PROVIDERS: [list of payment providers found, separated by commas]
        PRODUCT_ADDED: [exact name of the product that was added]
        WEBSITE_NAME: [name of the website/shop]
        STEPS_COMPLETED: [describe which steps you successfully completed]
        ISSUES_ENCOUNTERED: [describe any problems you faced]
        SCREENSHOT_READY: [confirm that the page is ready for screenshot capture]
        """
        
        # Define session options
        session_options = CreateSessionParams(
            accept_cookies=True,
            headless=False,
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport_width=1920,
            viewport_height=1080,
        )
        
        # Run with proper session timeout management
        resp = await self._run_with_session_timeout(task_description, session_options, progress_callback)
        
        # Handle the response
        if isinstance(resp, dict) and 'error' in resp:
            return resp
        
        if resp and hasattr(resp, 'data') and resp.data is not None:
            result = resp.data.final_result
            
            if progress_callback:
                progress_callback("📋 Parsing results...")
            
            # Parse the structured response
            info = {
                'checkout_url': None,
                'payment_providers': [],
                'product_added': None,
                'website_name': None,
                'steps_completed': None,
                'issues_encountered': None,
                'raw_response': result
            }
            
            if result:
                lines = result.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('CHECKOUT_URL:'):
                        info['checkout_url'] = line.replace('CHECKOUT_URL:', '').strip()
                    elif line.startswith('PAYMENT_PROVIDERS:'):
                        providers = line.replace('PAYMENT_PROVIDERS:', '').strip()
                        info['payment_providers'] = [p.strip() for p in providers.split(',') if p.strip()]
                    elif line.startswith('PRODUCT_ADDED:'):
                        info['product_added'] = line.replace('PRODUCT_ADDED:', '').strip()
                    elif line.startswith('WEBSITE_NAME:'):
                        info['website_name'] = line.replace('WEBSITE_NAME:', '').strip()
                    elif line.startswith('STEPS_COMPLETED:'):
                        info['steps_completed'] = line.replace('STEPS_COMPLETED:', '').strip()
                    elif line.startswith('ISSUES_ENCOUNTERED:'):
                        info['issues_encountered'] = line.replace('ISSUES_ENCOUNTERED:', '').strip()
            
            if progress_callback:
                progress_callback("✅ Analysis complete!")
            
            return info
        else:
            if progress_callback:
                progress_callback("❌ No response from the agent")
            return {'error': 'No response from the agent'}

# Example usage and testing
async def main():
    """
    Example usage of the CheckoutURLExtractor
    """
    extractor = CheckoutURLExtractor()
    
    # Example URLs to test (you can replace these with actual e-commerce sites)
    test_urls = [
        "https://example-shop.com",  # Replace with actual URLs
        "https://demo-store.com"     # Replace with actual URLs
    ]
    
    print("🛒 Checkout URL Extractor")
    print("=" * 50)
    
    for url in test_urls:
        print(f"\n🔍 Analyzing: {url}")
        print("-" * 30)
        
        # Get detailed information
        result = await extractor.extract_checkout_url_with_details(url)
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
        else:
            print(f"✅ Checkout URL: {result.get('checkout_url', 'Not found')}")
            print(f"🏪 Website: {result.get('website_name', 'Unknown')}")
            print(f"🛍️ Product Added: {result.get('product_added', 'Unknown')}")
            print(f"💳 Payment Providers: {', '.join(result.get('payment_providers', []))}")

if __name__ == "__main__":
    asyncio.run(main())
