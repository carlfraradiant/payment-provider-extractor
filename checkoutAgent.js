const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * A web browsing agent that navigates to e-commerce websites,
     * adds products to cart, and extracts the checkout URL.
     */
    
    constructor(timeoutMinutes = 2.5) { // 2.5 minutes maximum timeout for safety, but targeting 5-10 seconds
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
     * Get the detailed task description for HyperAgent
     */
    _getTaskDescription(websiteUrl) {
        return `
You are a FAST e-commerce checkout agent. Start at ${websiteUrl}. Goal: add ONE product to cart and reach the final checkout page quickly, then output the checkout URL and visible payment providers.

Do this strictly:
1) Close popups immediately (Accept/OK/X/Close; multilingual variants allowed). Look for cookie banners and consent dialogs first.
2) Open a product page (first obvious product or from Shop/Products/Collection). Avoid pages that are out of stock.
3) FIND AND CLICK THE ADD-TO-CART BUTTON RELIABLY:
   - If the button is not visible, SCROLL the page: use small incremental scrolls down the page until buttons and forms become visible; if you reach the bottom without finding it, scroll back up a little and try again.
   - Accept multilingual labels for add-to-cart: "Add to cart", "Add to bag", "Add to basket", "Buy", "Comprar", "Acheter", "Ajouter au panier", "In den Warenkorb", "Aggiungi al carrello", "Dodaj do koszyka", "Dodaj do koszyka", "Køb", "Læg i kurv", "Tilføj til kurv", "Køb nu", "Dodaj do koszyka", "Dodaj do košíku".
   - Also detect common selectors/attributes: buttons or inputs with type=submit near product forms; ids/classes containing add-to-cart, add, cart, purchase, buy; Shopify examples like button[name="add"], #AddToCart, [data-testid*="add-to-cart"].
   - If variants (size/color) are REQUIRED, quickly choose the first available option for each required selector before clicking add to cart.
   - Ensure QUANTITY = 1.
4) Confirm the cart drawer or cart page shows exactly one item. If the cart is empty, try the add-to-cart step again once after a short scroll and wait.
5) Open the cart and click "Checkout" / "Proceed to checkout" / localized equivalents ("Kasse", "Zur Kasse", "Cassa", "Pagar", "Finaliser la commande", "Do kasy").
6) On the checkout page, copy the full URL and return.

Speed rules:
- Be decisive and fast. Avoid optional choices unless mandatory.
- Always close popups before continuing.
- Only add a single item.
- If stuck, refresh and retry once.

Report format (exact keys):
WEBSITE_NAME: [domain or site name]
PRODUCT_ADDED: [product name or Yes]
CHECKOUT_URL: [full checkout URL]
PAYMENT_PROVIDERS: [comma-separated list]
STEPS_COMPLETED: [short summary]
ISSUES_ENCOUNTERED: [problems if any]
SCREENSHOT_READY: Yes

START NOW.
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
     * Run the HyperAgent task with session timeout management
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

            // Set up timeout with session termination
            const timeoutMs = this.timeoutMinutes * 60 * 1000;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(async () => {
                    // Actively stop the Hyperbrowser session to prevent credit usage
                    try {
                        if (sessionId) {
                            await this.hb.sessions.stop(sessionId);
                            if (progressCallback) {
                                progressCallback(`🛑 Session ${sessionId} stopped due to timeout`);
                            }
                        }
                    } catch (stopError) {
                        if (progressCallback) {
                            progressCallback(`⚠️ Warning: Could not stop session after timeout: ${stopError.message}`);
                        }
                    }
                    reject(new Error(`Task timed out after ${this.timeoutMinutes} minutes`));
                }, timeoutMs);
            });

            if (progressCallback) {
                progressCallback("🤖 Starting browser automation task...");
                progressCallback(`⏰ Timeout protection: Session will be stopped after ${this.timeoutMinutes} minutes to prevent excessive credit usage`);
            }

            // Start Browser Use task using our own OpenAI keys
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                llm: process.env.OPENAI_LLM || "gpt-4o",
                plannerLlm: process.env.OPENAI_LLM || "gpt-4o",
                pageExtractionLlm: process.env.OPENAI_LLM || "gpt-4o",
                maxSteps: 28,
                maxFailures: 3,
                useVision: true,
                validateOutput: false,
                maxActionsPerStep: 2,
                plannerInterval: 3,
                maxInputTokens: 2000,
                keepBrowserOpen: false,
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                sessionOptions
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
            const liveUrl = sessionDetails.liveUrl || sessionDetails.live_url;

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
