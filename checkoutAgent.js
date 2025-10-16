const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * A web browsing agent that navigates to e-commerce websites,
     * adds products to cart, and extracts the checkout URL.
     */
    
    constructor(timeoutMinutes = 1) {
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
You are a FAST and EFFICIENT e-commerce checkout agent. Your goal is to quickly navigate to ${websiteUrl}, add ANY product to cart, and reach the checkout page to extract the URL and payment providers.

SPEED IS CRITICAL - Complete this task in under 60 seconds. Be decisive and take the fastest path.

MULTILINGUAL SUPPORT: This website may be in English, French, Italian, German, or other languages. Look for these common terms:

ENGLISH: Accept, Add to Cart, Cart, Checkout, Buy Now, Proceed
FRENCH: Accepter, Ajouter au panier, Panier, Commander, Acheter maintenant
ITALIAN: Accetta, Aggiungi al carrello, Carrello, Checkout, Acquista ora
GERMAN: Akzeptieren, In den Warenkorb, Warenkorb, Zur Kasse, Jetzt kaufen
SPANISH: Aceptar, Añadir al carrito, Carrito, Finalizar compra, Comprar ahora

FAST EXECUTION STRATEGY:

STEP 1 - QUICK NAVIGATION (5 seconds max)
- Go to: ${websiteUrl}
- IMMEDIATELY look for cookie popup and click ANY accept button (Accept/Accepter/Akzeptieren/etc.)
- If no cookie popup, proceed immediately

STEP 2 - RAPID PRODUCT FINDING (10 seconds max)
- Look for the FIRST visible product on the homepage
- If no products on homepage, click "Shop", "Products", "Catalogue", or similar
- Pick the FIRST available product you see

STEP 3 - INSTANT ADD TO CART (5 seconds max)
- Click the product
- Look for "Add to Cart" button (in any language)
- Click it immediately - don't worry about size/color options unless required
- If it asks for required options, pick the first available option

STEP 4 - DIRECT TO CHECKOUT (10 seconds max)
- Look for cart icon or "Cart" button and click it
- On cart page, immediately look for "Checkout", "Proceed", "Buy Now" button
- Click it to go to checkout page

STEP 5 - EXTRACT RESULTS (5 seconds max)
- Once on checkout page, copy the URL
- Look for payment provider logos (PayPal, Visa, Mastercard, Apple Pay, etc.)
- Report results immediately

CRITICAL RULES:
- BE FAST - Don't overthink, take the first available option
- BE DECISIVE - If you see a button that looks right, click it
- SKIP OPTIONS - Don't spend time on size/color unless required
- MULTILINGUAL - Recognize buttons in any language
- TIMEOUT AWARENESS - You have 60 seconds total

REPORT FORMAT:
WEBSITE_NAME: [site name]
PRODUCT_ADDED: [product name or "Yes"]
CHECKOUT_URL: [full checkout URL]
PAYMENT_PROVIDERS: [comma-separated list]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any problems]
SCREENSHOT_READY: Yes

START NOW - BE FAST AND EFFICIENT!
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
            headless: true, // Use headless for faster execution
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport_width: 1280, // Smaller viewport for faster rendering
            viewport_height: 720,
            enable_web_recording: true,
            block_ads: true, // Block ads for faster loading
            block_trackers: true, // Block trackers for faster loading
            disable_images: false, // Keep images for better product recognition
            disable_javascript: false, // Keep JS for modern e-commerce sites
            timeout: 30000 // 30 second page load timeout
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

            // Start the browser use task with optimized settings for speed
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 20, // Reduced steps for faster execution
                maxFailures: 3, // Reduced failures for faster failure detection
                useVision: true, // Enable vision for better page understanding
                validateOutput: false, // Disable validation for speed
                keepBrowserOpen: false, // Close browser after task completion
                maxActionsPerStep: 3, // Limit actions per step for speed
                plannerInterval: 5 // Check progress more frequently
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
            let parsedResult = {};
            if (result && result.data && result.data.finalResult) {
                parsedResult = this._parseAgentResponse(result.data.finalResult);
            } else if (result && result.finalResult) {
                parsedResult = this._parseAgentResponse(result.finalResult);
            } else {
                // Fallback if no structured response
                parsedResult = {
                    website_name: 'Unknown',
                    product_added: 'Unknown',
                    checkout_url: null,
                    payment_providers: [],
                    steps_completed: 'Task completed but no structured response',
                    issues_encountered: 'No structured response from agent',
                    raw_response: JSON.stringify(result)
                };
            }

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
