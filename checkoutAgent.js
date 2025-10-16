const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * A web browsing agent that navigates to e-commerce websites,
     * adds products to cart, and extracts the checkout URL.
     */
    
    constructor(timeoutMinutes = 2) { // 2 minutes maximum timeout for safety, but targeting 5-10 seconds
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

SPEED IS CRITICAL - Complete this task in 5-10 seconds total. Be extremely fast and decisive.

MULTILINGUAL SUPPORT: This website may be in English, French, Italian, German, Spanish, Polish, or other languages. Look for these common terms:

ENGLISH: Accept, Add to Cart, Cart, Checkout, Buy Now, Proceed
FRENCH: Accepter, Ajouter au panier, Panier, Commander, Acheter maintenant
ITALIAN: Accetta, Aggiungi al carrello, Carrello, Checkout, Acquista ora
GERMAN: Akzeptieren, In den Warenkorb, Warenkorb, Zur Kasse, Jetzt kaufen
SPANISH: Aceptar, Añadir al carrito, Carrito, Finalizar compra, Comprar ahora
POLISH: Akceptuj, Dodaj do koszyka, Koszyk, Do kasy, Kup teraz, Przejdź

FAST EXECUTION STRATEGY:

STEP 1 - AGGRESSIVE POPUP ELIMINATION (2 seconds max)
- Go to: ${websiteUrl}
- **CRITICAL**: IMMEDIATELY scan for and eliminate ALL popups:
  * Cookie consent popups - click "Accept", "OK", "Allow", "I Agree", "Accept All"
  * Email subscription popups - click "X", "Close", "No Thanks", "Skip"
  * Newsletter popups - click "X", "Close", "Not Now", "Maybe Later"
  * Age verification popups - click "Yes", "I'm 18+", "Enter", "Continue"
  * Location permission popups - click "Allow", "OK", "Accept"
  * Notification permission popups - click "Allow", "Block", "Not Now"
  * Any overlay, modal, or popup - click "X", "Close", "Skip", "Dismiss"
- **MULTILINGUAL POPUP CLOSING**:
  * ENGLISH: Accept, OK, Allow, Close, X, Skip, Dismiss, No Thanks
  * FRENCH: Accepter, OK, Autoriser, Fermer, X, Ignorer, Refuser
  * ITALIAN: Accetta, OK, Consenti, Chiudi, X, Salta, Rifiuta
  * GERMAN: Akzeptieren, OK, Erlauben, Schließen, X, Überspringen, Ablehnen
  * SPANISH: Aceptar, OK, Permitir, Cerrar, X, Omitir, Rechazar
  * POLISH: Akceptuj, OK, Zezwól, Zamknij, X, Pomiń, Odrzuć
- **POPUP CLOSING STRATEGIES** (try in order):
  1. Click any "Accept", "OK", "Allow" button
  2. Click "X" in top-right corner
  3. Click "Close", "Skip", "No Thanks" buttons
  4. Press Escape key
  5. Click outside the popup area
  6. Look for small close buttons or icons
- **IF POPUP PERSISTS**: Refresh page and try again
- **ONLY PROCEED** when ALL popups are completely closed

STEP 2 - INSTANT PRODUCT SELECTION (2 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Look for the FIRST visible product on homepage
- If no products visible, click "Shop" or similar link
- Pick the FIRST available product immediately

STEP 3 - RAPID ADD TO CART (2 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Click the product
- **CRITICAL: Ensure quantity is 1 before adding**
- Click "Add to Cart" button immediately
- Skip all optional selections (size, color, etc.)
- **IF POPUP APPEARS**: Close it immediately before proceeding

STEP 4 - DIRECT TO CHECKOUT (2 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Click cart icon or "Cart" button
- Click "Checkout" or "Proceed" button immediately
- Go directly to checkout page
- **IF POPUP APPEARS**: Close it immediately before proceeding

STEP 5 - EXTRACT CRITICAL INFO (1 second max)
- Copy the checkout URL immediately
- Scan for payment provider logos (PayPal, Visa, Mastercard, etc.)
- Report results instantly

CRITICAL RULES:
- **POPUP ELIMINATION IS TOP PRIORITY** - Close ALL popups before doing ANYTHING else
- **ULTIMATE PRIORITY**: Checkout URL and Payment Providers - extract these FIRST and FASTEST
- BE LIGHTNING FAST - Complete entire task in 5-10 seconds total
- BE DECISIVE - If you see a button that looks right, click it immediately
- SKIP ALL OPTIONS - Don't spend time on size/color/quantity unless required
- MULTILINGUAL - Recognize buttons in any language (including Polish)
- SINGLE ITEM ONLY - Add exactly 1 item to cart, never 2 or more
- DIRECT PATH - Take the fastest route to checkout page
- **POPUP PERSISTENCE**: If popups keep appearing, refresh page and start over
- **POPUP BLOCKING**: Never proceed if ANY popup is visible - close it first

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
- **POPUP ELIMINATION STRATEGY**:
  * IMMEDIATELY scan for ANY popup, modal, overlay, or banner
  * Try these actions in order: Accept/OK → X button → Close → Skip → Escape key → Click outside
  * Look for small close buttons, X icons, or dismiss options
  * If popup persists, refresh page and try again
  * NEVER proceed with ANY popup visible
- **POPUP TYPES TO CLOSE**:
  * Cookie consent (Accept, OK, Allow, I Agree)
  * Email subscription (X, Close, No Thanks, Skip)
  * Newsletter signup (X, Close, Not Now, Maybe Later)
  * Age verification (Yes, I'm 18+, Enter, Continue)
  * Location permission (Allow, OK, Accept)
  * Notification permission (Allow, Block, Not Now)
  * Any overlay, modal, or popup
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

            // Start the browser use task with ultra-optimized settings for 5-10 second execution
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 10, // Ultra-reduced steps for 5-10 second execution
                maxFailures: 2, // Minimal failures for speed
                useVision: true, // Enable vision for better page understanding
                validateOutput: false, // Disable validation for maximum speed
                keepBrowserOpen: false, // Close browser after task completion
                maxActionsPerStep: 2, // Limit actions per step for speed
                plannerInterval: 3, // Check progress very frequently
                maxInputTokens: 2000 // Reduce token limit for faster processing
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
