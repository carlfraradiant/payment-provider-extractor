const { Hyperbrowser } = require('@hyperbrowser/sdk');

class FranceShopifyCheckoutExtractor {
    /**
     * Specialized agent for French Shopify webshops.
     * Focuses solely on adding products to cart and extracting checkout URLs.
     * No account creation functionality.
     */
    
    constructor(timeoutMinutes = 4) { // 4 minutes for Shopify checkout
        const apiKey = process.env.HYPERBROWSER_API_KEY;
        if (!apiKey) {
            console.error("❌ HYPERBROWSER_API_KEY environment variable is required but not found.");
            throw new Error("HYPERBROWSER_API_KEY environment variable is required.");
        }
        
        // Log the API key being used (first few characters for security)
        console.log(`🔑 FranceShopifyCheckoutExtractor initializing with Hyperbrowser API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
        
        try {
            this.hb = new Hyperbrowser({ apiKey });
            console.log("✅ Hyperbrowser client initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Hyperbrowser client:", error.message);
            throw error;
        }
        
        this.timeoutMinutes = timeoutMinutes;
        console.log(`🔧 FranceShopifyCheckoutExtractor initialized with timeout: ${this.timeoutMinutes} minutes`);
    }

    /**
     * Extract checkout URL from French Shopify webshops
     */
    async extractCheckoutURLWithStreaming(websiteUrl, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("🇫🇷 Starting French Shopify checkout extraction...");
            }

            const taskDescription = this._getFrenchShopifyTaskDescription(websiteUrl);
            const sessionOptions = this._getShopifySessionOptions();

            const result = await this._runShopifyTask(
                taskDescription, 
                sessionOptions, 
                progressCallback
            );

            if (progressCallback) {
                progressCallback("✅ French Shopify checkout extraction completed!");
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
     * Task description optimized for French Shopify webshops
     */
    _getFrenchShopifyTaskDescription(websiteUrl) {
        return `
🇫🇷 FRENCH SHOPIFY MISSION 🇫🇷

GOAL: Add product to cart, go to checkout, Extract checkout URL and payment providers from ${websiteUrl}

STEP 1 - CLOSE POPUPS:
- Press ESC key immediately
- Click "X", "Close", "Fermer", "No thanks", "Non merci"
- Click outside popup area
- DO NOT proceed until popup is gone

STEP 2 - ADD PRODUCT TO CART:
- Find any product and click it
- Click "Add to cart", "AJOUTER AU PANIER", "Acheter"
- Keep quantity at 1

STEP 3 - GO TO CHECKOUT:
- Click "Checkout", "Panier", "Commander", cart icon
- Copy the EXACT URL from address bar

STEP 4 - EXTRACT DATA:
- Look for payment providers: Shopify Payments, Shop Pay, PayPal, Visa, Mastercard
- Extract the EXACT CHECKOUT URL from the address bar
- Scroll to see all payment options

OUTPUT FORMAT:
WEBSITE_NAME: [domain]
PRODUCT_ADDED: [product name]
CHECKOUT_URL: [exact URL from address bar]
PAYMENT_PROVIDERS: [comma-separated list]
STEPS_COMPLETED: [what you did]
ISSUES_ENCOUNTERED: [any problems]

START: ${websiteUrl}
        `.trim();
    }

    /**
     * Session options optimized for French Shopify stores
     */
    _getShopifySessionOptions() {
        return {
            acceptCookies: true,
            headless: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewportWidth: 1280,
            viewportHeight: 720,
            enableWebRecording: false,
            blockAds: false,
            blockTrackers: false,
            disableImages: false,
            disableJavascript: false,
            timeout: 15000,
            // French browser settings
            acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8',
            timezone: 'Europe/Paris',
            locale: 'fr-FR',
            // Speed optimizations
            ignoreHTTPSErrors: true,
            waitUntil: 'domcontentloaded',
            // Popup handling
            autoAcceptDialogs: true,
            dismissDialogs: true,
            // Enhanced popup detection
            extraHTTPHeaders: {
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        };
    }

    /**
     * Run the Shopify checkout task
     */
    async _runShopifyTask(taskDescription, sessionOptions, progressCallback = null) {
        let sessionId = null;
        let timeoutId = null;

        try {
            if (progressCallback) {
                progressCallback("🌐 Creating French Shopify browser session...");
            }

            // Create a new session with optimized settings
            const session = await this.hb.sessions.create(sessionOptions);
            sessionId = session.id;

            if (progressCallback) {
                progressCallback(`📱 Browser session created: ${sessionId}`);
            }

            // Set up timeout with session termination
            const timeoutMs = this.timeoutMinutes * 60 * 1000;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(async () => {
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
                progressCallback("🚀 Starting French Shopify checkout task...");
                progressCallback("⚡ Optimized for French Shopify stores");
                progressCallback(`⏰ Timeout protection: ${this.timeoutMinutes} minutes maximum`);
            }

            // Browser Use task with optimized parameters for Shopify
            const browserUsePromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                // Use fast models
                llm: "gpt-4o",
                plannerLlm: "gpt-4.1", 
                pageExtractionLlm: "gpt-4.1",
                // Ultra-fast settings for simple Shopify flow
                maxSteps: 20, // Very reduced for speed
                maxFailures: 3, // Fail fast
                useVision: true,
                validateOutput: false,
                maxActionsPerStep: 10, // Very reduced for speed
                plannerInterval: 8,
                maxInputTokens: 500, // Reduced for speed
                // Use custom API keys
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                keepBrowserOpen: false
            });

            // Execute the task with timeout protection
            const result = await Promise.race([browserUsePromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ French Shopify checkout task completed!");
            }

            // Parse the agent response
            let parsedResult = {};
            if (result && result.data && result.data.finalResult) {
                parsedResult = this._parseShopifyResponse(result.data.finalResult);
            } else if (result && result.finalResult) {
                parsedResult = this._parseShopifyResponse(result.finalResult);
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
     * Parse the agent response with Shopify-specific logic
     */
    _parseShopifyResponse(responseText) {
        if (!responseText) {
            return { error: 'No response from agent' };
        }

        const result = {};
        const lines = responseText.trim().split('\n');

        // Parse structured format first
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
            }
        }

        // Enhanced URL extraction with Shopify-specific logic
        if (!result.checkout_url || !/^https?:\/\//i.test(result.checkout_url)) {
            try {
                // Method 1: Look for URLs in the response
                const urlRegex = /(https?:\/\/[^\s\]\)\">]+)/gmi;
                const matches = [...responseText.matchAll(urlRegex)].map(m => (m[1] || '').trim());
                const unique = Array.from(new Set(matches));
                
                // Filter for Shopify checkout URLs
                const isLoginUrl = (u) => /login|signin|signup|register|account\/login|account\/signup|auth/i.test(u);
                const looksLikeCheckout = (u) => /checkout|checkouts|cart|panier/i.test(u);
                
                // Prefer URLs that look like checkout and are NOT login pages
                const checkoutUrls = unique.filter(u => looksLikeCheckout(u) && !isLoginUrl(u));
                const preferred = checkoutUrls[0] || unique.find(u => !isLoginUrl(u)) || unique[0];
                
                if (preferred) {
                    result.checkout_url = preferred;
                }
            } catch {}
        }

        // Enhanced payment provider extraction with Shopify focus
        if (!result.payment_providers || result.payment_providers.length === 0) {
            try {
                const shopifyPaymentKeywords = [
                    'Shopify Payments', 'Shop Pay', 'Google Pay', 'Apple Pay', 'PayPal',
                    'Visa', 'Mastercard', 'American Express', 'CB', 'Carte Bancaire',
                    'Stripe', 'Adyen', 'Klarna', 'Afterpay'
                ];
                
                const foundProviders = [];
                const responseLower = responseText.toLowerCase();
                
                for (const provider of shopifyPaymentKeywords) {
                    if (responseLower.includes(provider.toLowerCase())) {
                        foundProviders.push(provider);
                    }
                }
                
                if (foundProviders.length > 0) {
                    result.payment_providers = foundProviders;
                }
            } catch {}
        }

        // Enhanced website name extraction
        if (!result.website_name || result.website_name === 'Unknown') {
            try {
                // Extract domain from checkout URL if available
                if (result.checkout_url) {
                    const url = new URL(result.checkout_url);
                    result.website_name = url.hostname.replace('www.', '');
                } else {
                    // Look for domain patterns in the response
                    const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;
                    const domainMatches = [...responseText.matchAll(domainRegex)];
                    if (domainMatches.length > 0) {
                        result.website_name = domainMatches[0][1];
                    }
                }
            } catch {}
        }

        // Enhanced product name extraction
        if (!result.product_added || result.product_added === 'Unknown') {
            try {
                // Look for product-related keywords in the response
                const productKeywords = ['product', 'item', 'perfume', 'fragrance', 'bottle', 'shirt', 'dress', 'shoes'];
                const responseLower = responseText.toLowerCase();
                
                for (const keyword of productKeywords) {
                    if (responseLower.includes(keyword)) {
                        // Try to extract the product name from context
                        const lines = responseText.split('\n');
                        for (const line of lines) {
                            if (line.toLowerCase().includes(keyword) && line.length > 5 && line.length < 100) {
                                result.product_added = line.trim();
                                break;
                            }
                        }
                        if (result.product_added) break;
                    }
                }
            } catch {}
        }

        // Store the raw response for debugging
        result.raw_response = responseText;

        return result;
    }
}

module.exports = { FranceShopifyCheckoutExtractor };
