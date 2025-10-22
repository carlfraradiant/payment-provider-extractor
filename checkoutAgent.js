const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * A web browsing agent that navigates to e-commerce websites,
     * adds products to cart, and extracts the checkout URL.
     */
    
    constructor(timeoutMinutes = 3.5) { // 3.5 minutes maximum timeout for French webshops with account creation
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
        console.log(`🔧 CheckoutURLExtractor initialized with timeout: ${this.timeoutMinutes} minutes`);
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
     * Detect if website is Italian or French based on URL and content
     * Defaults to European settings for better European webshop access
     */
    _detectCountry(websiteUrl) {
        const urlStr = (websiteUrl || '').toLowerCase();
        const has = (s) => urlStr.includes(s);
        
        if (has('.it') || has('it-it') || has('lang=it') || has('locale=it')) {
            return 'it';
        } else if (has('.fr') || has('fr-fr') || has('lang=fr') || has('locale=fr')) {
            return 'fr';
        } else if (has('.de') || has('.dk') || has('.es') || has('.pl') || has('.nl') || has('.be') || has('.at') || has('.ch')) {
            // Other European countries default to European settings
            return 'european';
        }
        return 'default';
    }

    /**
     * Get the detailed task description for HyperAgent with country-specific prompts
     */
    _getTaskDescription(websiteUrl) {
        const country = this._detectCountry(websiteUrl);
        
        if (country === 'it') {
            return this._getItalianTaskDescription(websiteUrl);
        } else if (country === 'fr') {
            return this._getFrenchTaskDescription(websiteUrl);
        } else if (country === 'european') {
            return this._getEuropeanTaskDescription(websiteUrl);
        } else {
            return this._getDefaultTaskDescription(websiteUrl);
        }
    }

    /**
     * Italian-specific task description
     */
    _getItalianTaskDescription(websiteUrl) {
        return `
ULTRA-FAST Italian e-commerce checkout agent. Start at ${websiteUrl}. Goal: add ONE product to cart and reach checkout page in under 30 seconds.

ITALIAN PATTERNS:
- Italian labels: "Aggiungi al carrello", "Acquista", "Compra", "Cassa", "Procedi al checkout"
- Variants: "taglia/colore" - choose first available
- Ensure QUANTITÀ = 1

EXECUTE RAPIDLY:
1) Close popups (Accetta/OK/X/Chiudi)
2) Find product page (Shop/Prodotti/Collezione)
3) Add to cart: "Aggiungi al carrello", "Acquista", "Compra" - ensure QUANTITÀ = 1
4) Go to cart: "Cassa", "Procedi al checkout", "Finalizza ordine"
5) Extract checkout URL and payment providers

SPEED: Be decisive, avoid optional choices, single item only.

Output:
WEBSITE_NAME: [domain]
PRODUCT_ADDED: [product name]
CHECKOUT_URL: [full URL]
PAYMENT_PROVIDERS: [comma-separated]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any]
SCREENSHOT_READY: Yes

START NOW: ${websiteUrl}
        `.trim();
    }

    /**
     * French-specific task description with account creation handling
     */
    _getFrenchTaskDescription(websiteUrl) {
        return `
ULTRA-FAST French e-commerce checkout agent. Start at ${websiteUrl}. Goal: add ONE product to cart and reach checkout page in under 30 seconds.

FRENCH PATTERNS:
- Account creation often required: look for "Commander sans compte", "Acheter en tant qu'invité" first
- If account needed: Email: test@example.com, Password: Test123456, Accept CGV
- French labels: "Ajouter au panier", "Acheter", "Commander", "Caisse", "Finaliser la commande"

EXECUTE RAPIDLY:
1) Close popups (Accepter/OK/X/Fermer)
2) Find product page (Shop/Produits/Collection)
3) Add to cart: "Ajouter au panier", "Acheter", "Commander" - ensure QUANTITÉ = 1
4) Go to cart: "Caisse", "Finaliser la commande", "Commander"
5) Handle account creation if required (guest checkout preferred)
6) Extract checkout URL and payment providers

SPEED: Be decisive, avoid optional choices, single item only.

Output:
WEBSITE_NAME: [domain]
PRODUCT_ADDED: [product name]
CHECKOUT_URL: [full URL]
PAYMENT_PROVIDERS: [comma-separated]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any]
SCREENSHOT_READY: Yes

START NOW: ${websiteUrl}
        `.trim();
    }

    /**
     * European-specific task description for other European countries
     */
    _getEuropeanTaskDescription(websiteUrl) {
        return `
ULTRA-FAST European e-commerce checkout agent. Start at ${websiteUrl}. Goal: add ONE product to cart and reach checkout page in under 30 seconds.

EUROPEAN PATTERNS:
- GDPR cookie banners: Accept/OK/X/Close
- Guest checkout preferred: "Guest checkout", "Continue without account", "Buy as guest"
- Multi-language labels: "Add to cart", "Kaufen", "Køb", "Comprar", "Añadir al carrito"

EXECUTE RAPIDLY:
1) Close popups (Accept/OK/X/Close)
2) Find product page (Shop/Products/Collection)
3) Add to cart: "Add to cart", "Kaufen", "Køb", "Comprar" - ensure QUANTITY = 1
4) Go to cart: "Checkout", "Kasse", "Køb nu", "Pagar"
5) Handle account creation if required (guest checkout preferred)
6) Extract checkout URL and payment providers

SPEED: Be decisive, avoid optional choices, single item only.

Output:
WEBSITE_NAME: [domain]
PRODUCT_ADDED: [product name]
CHECKOUT_URL: [full URL]
PAYMENT_PROVIDERS: [comma-separated]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any]
SCREENSHOT_READY: Yes

START NOW: ${websiteUrl}
        `.trim();
    }

    /**
     * Default task description for non-European countries
     */
    _getDefaultTaskDescription(websiteUrl) {
        return `
ULTRA-FAST e-commerce checkout agent. Start at ${websiteUrl}. Goal: add ONE product to cart and reach checkout page in under 30 seconds.

EXECUTE RAPIDLY:
1) Close popups (Accept/OK/X/Close)
2) Find product page (Shop/Products/Collection)
3) Add to cart: "Add to cart", "Buy", "Comprar", "Acheter" - ensure QUANTITY = 1
4) Go to cart: "Checkout", "Proceed to checkout", "Cassa", "Pagar"
5) Extract checkout URL and payment providers

SPEED: Be decisive, avoid optional choices, single item only.

Output:
WEBSITE_NAME: [domain]
PRODUCT_ADDED: [product name]
CHECKOUT_URL: [full URL]
PAYMENT_PROVIDERS: [comma-separated]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any]
SCREENSHOT_READY: Yes

START NOW: ${websiteUrl}
        `.trim();
    }

    /**
     * Get session configuration options with European browser settings
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
            timeout: 30000, // 30 second page load timeout
            // European browser settings
            accept_language: 'en-GB,en;q=0.9,fr;q=0.8,de;q=0.7,it;q=0.6,es;q=0.5,da;q=0.4,pl;q=0.3',
            timezone: 'Europe/London', // Default to London timezone for European access
            locale: 'en-GB' // Default to UK locale for European access
        };
    }

    /**
     * Run the HyperAgent task with session timeout management for maximum speed
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
                progressCallback("🚀 Starting HyperAgent task for maximum speed...");
                progressCallback(`⏰ Timeout protection: Session will be stopped after ${this.timeoutMinutes} minutes to prevent excessive credit usage`);
            }

            // Start HyperAgent task using our own OpenAI keys for maximum speed
            const hyperAgentPromise = this.hb.agents.hyperAgent.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                llm: process.env.OPENAI_LLM || "gpt-4o", // Use gpt-4o for best speed and performance
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                timeout: this.timeoutMinutes * 60, // Set timeout in seconds
                sessionOptions
            });

            // Race between the task and timeout
            const result = await Promise.race([hyperAgentPromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ HyperAgent task completed successfully!");
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

        // Fallback: robust URL extraction if CHECKOUT_URL not explicitly provided
        if (!result.checkout_url || !/^https?:\/\//i.test(result.checkout_url)) {
            try {
                const urlRegex = /(https?:\/\/[^\s\]\)\">]+)/gmi;
                const matches = [...responseText.matchAll(urlRegex)].map(m => (m[1] || '').trim());
                const unique = Array.from(new Set(matches));
                const looksLikeCheckout = (u) => /checkout|checkouts|cart|kasse|kassa|cassa|panier|koszyk|ko\u0161\u00edk|carrello|k\u00f8b/i.test(u);
                // Prefer URLs that look like checkout first
                const preferred = unique.find(looksLikeCheckout) || unique[0];
                if (preferred) {
                    result.checkout_url = preferred;
                }
            } catch {}
        }

        // Store the raw response for debugging
        result.raw_response = responseText;

        return result;
    }
}

module.exports = { CheckoutURLExtractor };
