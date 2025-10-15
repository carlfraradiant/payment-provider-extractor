const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * A web browsing agent that navigates to e-commerce websites,
     * adds products to cart, and extracts the checkout URL.
     */
    
    constructor(timeoutMinutes = 2) {
        const apiKey = process.env.HYPERBROWSER_API_KEY;
        if (!apiKey) {
            console.error("❌ HYPERBROWSER_API_KEY environment variable is required but not found.");
            throw new Error("HYPERBROWSER_API_KEY environment variable is required.");
        }
        
        // Log the API key being used (first few characters for security)
        console.log(`🔑 CheckoutURLExtractor initializing with Hyperbrowser API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
        
        try {
            this.hb = new Hyperbrowser({ apiKey });
            console.log("✅ Hyperbrowser client initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Hyperbrowser client:", error.message);
            throw error;
        }
        
        this.timeoutMinutes = timeoutMinutes;
    }

    /**
     * Extract checkout URL with detailed analysis and real-time streaming
     */
    async extractCheckoutURLWithStreaming(websiteUrl, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("🚀 Starting checkout URL extraction...");
            }

            const taskDescription = this._getTaskDescription(websiteUrl);
            const sessionOptions = this._getSessionOptions();

            const result = await this._runWithSessionTimeout(
                taskDescription, 
                sessionOptions, 
                progressCallback
            );

            if (progressCallback) {
                progressCallback("✅ Checkout URL extraction completed!");
            }

            return result;

        } catch (error) {
            if (progressCallback) {
                progressCallback(`❌ Error during extraction: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get the detailed task description for the browser agent
     */
    _getTaskDescription(websiteUrl) {
        return `
You are an AI web browsing agent specialized in e-commerce checkout analysis. Your task is to navigate to the website: ${websiteUrl}, add a product to the cart, and reach the final checkout page to extract payment provider information.

CRITICAL: Follow these steps EXACTLY in order:

STEP 1 - INITIAL NAVIGATION & COOKIE ACCEPTANCE (CRITICAL)
- Go to the website: ${websiteUrl}
- Look for and click "Accept", "Accept All", "I Accept", or similar cookie consent buttons
- If you see cookie banners, popups, or consent dialogs, click the accept button
- If there are multiple cookie options, choose "Accept All" or "Accept Essential Cookies"
- If no cookie popup appears, proceed to step 2

STEP 2 - PRODUCT DISCOVERY
- Navigate through the website to find products
- Look for product categories, featured products, or product listings
- Browse the product catalog to identify available items

STEP 3 - PRODUCT SELECTION
- Click on a product to view its details
- Look for "Add to Cart", "Add to Bag", "Buy Now", or similar buttons
- If the product has options (size, color, quantity), select appropriate options
- Click the "Add to Cart" button

STEP 4 - CART VERIFICATION
- Verify that the product has been added to the cart
- Look for confirmation messages like "Added to cart", "Item added", or cart count updates
- If the product wasn't added, try again or select a different product

STEP 5 - CART BUTTON CLICK (CRITICAL)
- Look for and click the cart icon, "View Cart", "Shopping Cart", or "Cart" button
- This should take you to the cart/shopping bag page
- Do NOT proceed to checkout from the product page - you MUST go to the cart page first

STEP 6 - CHECKOUT BUTTON CLICK (CRITICAL - MUST REACH FINAL CHECKOUT)
- On the cart page, look for "Checkout", "Proceed to Checkout", "Buy Now", or similar buttons
- Click the checkout button to proceed to the checkout page
- This should take you to the FINAL checkout page where payment information is collected

STEP 7 - URL EXTRACTION
- Once you reach the final checkout page, extract the current URL
- This URL should contain checkout, payment, or billing information
- Report the URL as: CHECKOUT_URL: [the full URL]

STEP 8 - PAYMENT PROVIDER IDENTIFICATION
- On the checkout page, identify all visible payment providers
- Look for logos, text, or buttons indicating payment methods
- Common providers include: PayPal, Stripe, Square, Apple Pay, Google Pay, Amazon Pay, Klarna, Afterpay, etc.
- Report as: PAYMENT_PROVIDERS: [comma-separated list of providers]

STEP 9 - SCREENSHOT CAPTURE (CRITICAL)
- Wait for the page to fully load and all JavaScript widgets to render
- Ensure all payment forms and provider logos are visible
- Report as: SCREENSHOT_READY: true

IMPORTANT RULES:
- If you encounter popups, modals, or overlays, try to close them by clicking 'X', pressing Escape, or clicking outside
- If a page doesn't load properly, refresh and try again
- If you can't find products, try searching or browsing different categories
- If checkout requires account creation, try to find guest checkout options
- If you encounter CAPTCHA, report it and continue with available information
- Always wait for pages to fully load before proceeding
- If you get stuck on any step, try refreshing the page and starting that step again

REPORT FORMAT:
After completing all steps, provide a structured report with:
- CHECKOUT_URL: [the final checkout page URL]
- PAYMENT_PROVIDERS: [list of identified payment providers]
- PRODUCT_ADDED: [description of product added to cart]
- WEBSITE_NAME: [name of the e-commerce website]
- STEPS_COMPLETED: [summary of completed steps]
- ISSUES_ENCOUNTERED: [any problems or limitations encountered]
- SCREENSHOT_READY: [true/false]

Website URL: ${websiteUrl}
        `.trim();
    }

    /**
     * Get session configuration options
     */
    _getSessionOptions() {
        return {
            accept_cookies: true,
            headless: false,
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport_width: 1920,
            viewport_height: 1080,
            enable_web_recording: true
        };
    }

    /**
     * Run the browser task with session timeout management
     */
    async _runWithSessionTimeout(taskDescription, sessionOptions, progressCallback = null) {
        let sessionId = null;
        let timeoutId = null;

        try {
            if (progressCallback) {
                progressCallback("🌐 Creating browser session...");
            }

            // Create a new session
            const session = await this.hb.sessions.create(sessionOptions);
            sessionId = session.id;

            if (progressCallback) {
                progressCallback(`📱 Browser session created: ${sessionId}`);
            }

            // Set up timeout
            const timeoutMs = this.timeoutMinutes * 60 * 1000;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Task timed out after ${this.timeoutMinutes} minutes`));
                }, timeoutMs);
            });

            if (progressCallback) {
                progressCallback("🤖 Starting browser automation task...");
            }

            // Start the browser use task with optimized settings
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 50, // Allow more steps for complex checkout flows
                maxFailures: 5, // Allow some failures before giving up
                useVision: true, // Enable vision for better page understanding
                validateOutput: true, // Validate the output format
                keepBrowserOpen: false // Close browser after task completion
            });

            // Race between the task and timeout
            const result = await Promise.race([browserTaskPromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ Browser task completed successfully!");
            }

            // Capture screenshot before stopping the session
            const screenshotData = await this._captureCheckoutScreenshot(sessionId, progressCallback);

            // Parse the agent response
            const parsedResult = this._parseAgentResponse(result.data?.finalResult);

            // Add screenshot data if available
            if (screenshotData) {
                parsedResult.screenshot = screenshotData;
            }

            // Stop the session since we're done
            try {
                await this.hb.sessions.stop(sessionId);
                if (progressCallback) {
                    progressCallback("🛑 Browser session stopped successfully");
                }
            } catch (stopError) {
                if (progressCallback) {
                    progressCallback(`⚠️ Warning: Could not stop session cleanly: ${stopError.message}`);
                }
            }

            return parsedResult;

        } catch (error) {
            // Clear timeout if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Stop the session if it was created
            if (sessionId) {
                try {
                    await this.hb.sessions.stop(sessionId);
                    if (progressCallback) {
                        progressCallback("🛑 Browser session stopped due to error");
                    }
                } catch (stopError) {
                    if (progressCallback) {
                        progressCallback(`⚠️ Warning: Could not stop session after error: ${stopError.message}`);
                    }
                }
            }

            throw error;
        }
    }

    /**
     * Capture a screenshot of the current page using the session's live view
     */
    async _captureCheckoutScreenshot(sessionId, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("📸 Capturing checkout page screenshot...");
            }

            // Get session details to access the live URL
            const sessionDetails = await this.hb.sessions.get(sessionId);

            if (!sessionDetails) {
                if (progressCallback) {
                    progressCallback("⚠️ Could not get session details for screenshot");
                }
                return null;
            }

            // Get the live URL from session details
            const liveUrl = sessionDetails.live_url;

            if (!liveUrl) {
                if (progressCallback) {
                    progressCallback("⚠️ No live URL available for screenshot");
                }
                return null;
            }

            if (progressCallback) {
                progressCallback(`📸 Live session URL: ${liveUrl}`);
                progressCallback("📸 Screenshot capture completed - live URL available");
            }

            // Return the live URL information for screenshot capture
            return {
                screenshot_base64: null,
                timestamp: new Date().toISOString(),
                live_url: liveUrl,
                status: 'live_url_available',
                message: 'Live session URL available for manual screenshot capture'
            };

        } catch (error) {
            if (progressCallback) {
                progressCallback(`❌ Error capturing screenshot: ${error.message}`);
            }
            return null;
        }
    }

    /**
     * Parse the agent response text into a structured object
     */
    _parseAgentResponse(responseText) {
        if (!responseText) {
            return { error: 'No response from agent' };
        }

        const result = {};
        const lines = responseText.trim().split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('CHECKOUT_URL:')) {
                result.checkout_url = trimmedLine.replace('CHECKOUT_URL:', '').trim();
            } else if (trimmedLine.startsWith('PAYMENT_PROVIDERS:')) {
                const providersText = trimmedLine.replace('PAYMENT_PROVIDERS:', '').trim();
                result.payment_providers = providersText.split(',').map(p => p.trim()).filter(p => p);
            } else if (trimmedLine.startsWith('PRODUCT_ADDED:')) {
                result.product_added = trimmedLine.replace('PRODUCT_ADDED:', '').trim();
            } else if (trimmedLine.startsWith('WEBSITE_NAME:')) {
                result.website_name = trimmedLine.replace('WEBSITE_NAME:', '').trim();
            } else if (trimmedLine.startsWith('STEPS_COMPLETED:')) {
                result.steps_completed = trimmedLine.replace('STEPS_COMPLETED:', '').trim();
            } else if (trimmedLine.startsWith('ISSUES_ENCOUNTERED:')) {
                result.issues_encountered = trimmedLine.replace('ISSUES_ENCOUNTERED:', '').trim();
            } else if (trimmedLine.startsWith('SCREENSHOT_READY:')) {
                result.screenshot_ready = trimmedLine.replace('SCREENSHOT_READY:', '').trim();
            }
        }

        // Store the raw response for debugging
        result.raw_response = responseText;

        return result;
    }
}

module.exports = { CheckoutURLExtractor };
