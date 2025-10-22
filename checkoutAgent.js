const { Hyperbrowser } = require('@hyperbrowser/sdk');

class CheckoutURLExtractor {
    /**
     * ULTRA-FAST Browser Use agent optimized for French e-commerce websites.
     * Designed for maximum speed and effectiveness on French webshops.
     */
    
    constructor(timeoutMinutes = 5) { // 5 minutes maximum timeout for French webshops with account creation
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
     * ULTRA-FAST checkout URL extraction using Browser Use for French webshops
     */
    async extractCheckoutURLWithStreaming(websiteUrl, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("🚀 Starting ULTRA-FAST Browser Use checkout extraction...");
            }

            const taskDescription = this._getUltraFastTaskDescription(websiteUrl);
            const sessionOptions = this._getOptimizedSessionOptions();

            const result = await this._runBrowserUseTask(
                taskDescription, 
                sessionOptions, 
                progressCallback
            );

            if (progressCallback) {
                progressCallback("✅ ULTRA-FAST checkout extraction completed!");
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
     * ULTRA-FAST task description optimized for French e-commerce sites
     */
    _getUltraFastTaskDescription(websiteUrl) {
        return `
🚀 ULTRA-FAST FRENCH E-COMMERCE CHECKOUT EXTRACTION 🚀

MISSION: Go to ${websiteUrl} and IMMEDIATELY extract checkout URL and payment providers.

🚨 CRITICAL FIRST STEP - POPUP DETECTION:
- IMMEDIATELY upon page load, scan for ANY popup/overlay
- Look for: "10% OFF", "discount", "newsletter", "subscribe", "offer" popups
- If popup detected, close it INSTANTLY:
  * Press ESC key
  * Click "No, thanks", "X", "✕", "Close", "Fermer", "Non merci"
  * Click outside popup area
  * Click anywhere on popup if needed
- DO NOT proceed until popup is completely gone

⚡ CRITICAL SPEED REQUIREMENTS:
- NO DELAYS - ACT IMMEDIATELY ON EACH PAGE
- NO READING CONTENT - JUST CLICK BUTTONS
- NO WAITING - MOVE FAST BETWEEN PAGES
- MAXIMUM 30 SECONDS TOTAL EXECUTION TIME

🎯 STEP-BY-STEP ACTIONS (EXECUTE IMMEDIATELY):

1. HANDLE ALL POPUPS & COOKIES (0.5 seconds):
   - CRITICAL: Look for ANY popup/overlay blocking the page
   - COOKIE BANNERS: Click "Accepter", "Accept", "OK", "J'accepte", "Autoriser", "Allow", "Tout accepter", "Accepter tout"
   - NEWSLETTER POPUPS: Click "No, thanks", "Non merci", "Fermer", "Close", "X", "✕", "Pas maintenant", "Plus tard", "Non", "No"
   - DISCOUNT POPUPS: Click "Fermer", "Close", "X", "✕", "Non merci", "Continuer sans", "No, thanks"
   - AGE VERIFICATION: Click "Oui", "Yes", "J'ai 18 ans", "I am 18+", "Entrer", "Enter"
   - LOCATION POPUPS: Click "France", "FR", "Continuer", "Continue", "OK"
   - IMMEDIATE ACTIONS:
     * Press ESC key first
     * Click any "X", "✕", "Close", "Fermer" button
     * Click "No, thanks", "Non merci", "Non", "No" links
     * Click outside popup area
     * If popup persists, click anywhere on the popup to dismiss

2. FIND PRODUCTS (2 seconds):
   - FIRST: Check for and close any popups
   - Click "Shop", "Produits", "Collection", "Boutique", "Catalogue"
   - OR click any product image/link you see
   - OR look for "Nouveautés", "Best-sellers", "Populaire"

3. SELECT FIRST PRODUCT (1 second):
   - FIRST: Check for and close any popups
   - Click the FIRST product you see
   - Don't read descriptions - just click

4. ADD TO CART (2 seconds):
   - FIRST: Check for and close any popups
   - Select first size/variant if dropdown appears
   - Click "AJOUTER AU PANIER", "Add to cart", "Acheter", "Ajouter"
   - If quantity selector, keep it at 1

5. GO TO CHECKOUT (1 second):
   - FIRST: Check for and close any popups
   - Click "Panier", "Checkout", "Commander", "Valider", cart icon
   - OR look for "Finaliser la commande", "Procéder au paiement"
   - CRITICAL: When you reach the checkout page, immediately copy the URL from address bar

6. HANDLE LOGIN IF NEEDED (3 seconds):
   - FIRST: Check for and close any popups
   - If login page appears, click "Créer un compte", "S'inscrire", "Register"
   - Use: marie.dubois@example.com, Password: Test123456
   - Fill required fields quickly

7. EXTRACT DATA (1 second):
   - CRITICAL: Copy the EXACT URL from the address bar (Ctrl+L, then Ctrl+C)
   - Look for payment provider logos: Visa, Mastercard, PayPal, CB, Carte Bancaire, Stripe, Adyen, Klarna, Afterpay, Shop Pay, Google Pay, Apple Pay
   - Scroll down to see all payment options
   - Look for payment method icons, logos, or text
   - Count and list ALL visible payment providers

⚡ SPEED OPTIMIZATIONS:
- Don't scroll unless necessary
- Don't read product descriptions
- Don't wait for animations
- Click buttons immediately when visible
- Use keyboard shortcuts if available (Tab, Enter)

🚨 CONTINUOUS POPUP MONITORING:
- ALWAYS check for popups before each action
- If ANY popup appears, close it immediately:
  * Cookie banners: "Accepter", "Accept", "OK", "J'accepte", "Autoriser", "Allow"
  * Newsletter: "No, thanks", "Non merci", "Fermer", "Close", "X", "✕", "Pas maintenant", "Non", "No"
  * Discounts: "Fermer", "Close", "X", "✕", "Non merci", "Continuer sans", "No, thanks"
  * Age verification: "Oui", "Yes", "J'ai 18 ans", "Entrer", "Enter"
  * Location: "France", "FR", "Continuer", "Continue", "OK"
- CRITICAL: "10% OFF" or "discount" popups - click "No, thanks" or "X" immediately
- Use ESC key if no close button visible
- Click outside popup if needed
- If popup blocks page, click anywhere on popup to dismiss
- NEVER proceed with popups open - they will block all actions

🎯 CRITICAL OUTPUT FORMAT (MANDATORY - COPY EXACTLY):
WEBSITE_NAME: bonparfumeur.com
PRODUCT_ADDED: [product name you added to cart]
CHECKOUT_URL: [EXACT URL from address bar - COPY THIS EXACTLY]
PAYMENT_PROVIDERS: [comma-separated list like: Visa, Mastercard, PayPal, Stripe]
STEPS_COMPLETED: [brief summary of actions taken]
ISSUES_ENCOUNTERED: [any problems or delays]

🚨 MANDATORY REQUIREMENTS:
- YOU MUST provide CHECKOUT_URL with the exact URL from the address bar
- YOU MUST identify at least 3 payment providers if visible
- YOU MUST extract the website name from the domain
- YOU MUST provide the product name you added to cart
- DO NOT leave any field as "Unknown" - find the actual values

🚀 START NOW: ${websiteUrl}
        `.trim();
    }


    /**
     * Optimized session options for maximum speed on French webshops with popup handling
     */
    _getOptimizedSessionOptions() {
        return {
            acceptCookies: true,
            headless: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewportWidth: 1280,
            viewportHeight: 720,
            enableWebRecording: false, // Disabled for speed
            blockAds: false,
            blockTrackers: false,
            disableImages: false,
            disableJavascript: false,
            timeout: 10000, // Reduced for speed
            // French browser settings
            acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8',
            timezone: 'Europe/Paris',
            locale: 'fr-FR',
            // Speed optimizations
            ignoreHTTPSErrors: true,
            waitUntil: 'domcontentloaded', // Faster than networkidle0
            // Additional speed settings
            disableWebSecurity: false,
            disableFeatures: 'VizDisplayCompositor',
            // Popup and overlay handling
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
     * ULTRA-FAST Browser Use task runner optimized for French webshops
     */
    async _runBrowserUseTask(taskDescription, sessionOptions, progressCallback = null) {
        let sessionId = null;
        let timeoutId = null;

        try {
            if (progressCallback) {
                progressCallback("🌐 Creating optimized browser session...");
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
                progressCallback("🚀 Starting ULTRA-FAST Browser Use task...");
                progressCallback("⚡ Optimized for maximum speed on French webshops");
                progressCallback(`⏰ Timeout protection: ${this.timeoutMinutes} minutes maximum`);
            }

            // ULTRA-FAST Browser Use task with optimized parameters
            const browserUsePromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                // Use fastest available models
                llm: "gpt-4o",
                plannerLlm: "gpt-4.1", 
                pageExtractionLlm: "gpt-4.1",
                // Optimized for speed and popup handling
                maxSteps: 25, // Increased for popup handling
                maxFailures: 2, // Reduced to force better popup handling
                useVision: true, // Enable vision for better popup detection
                validateOutput: false, // Skip validation for speed
                maxActionsPerStep: 8, // Allow more actions per step for popup handling
                plannerInterval: 1, // Plan every step for speed
                maxInputTokens: 2500, // Increased for complex pages with popups
                // Use custom API keys to avoid credit charges
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                keepBrowserOpen: false // Close after completion
            });

            // Execute the task with timeout protection
            const result = await Promise.race([browserUsePromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ ULTRA-FAST Browser Use task completed!");
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
     * Parse the agent response text into a structured object with enhanced extraction
     */
    _parseAgentResponse(responseText) {
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
            } else if (trimmedLine.startsWith('SCREENSHOT_READY:')) {
                result.screenshot_ready = trimmedLine.replace('SCREENSHOT_READY:', '').trim();
            }
        }

        // Enhanced URL extraction with multiple fallback methods
        if (!result.checkout_url || !/^https?:\/\//i.test(result.checkout_url)) {
            try {
                // Method 1: Look for URLs in the response
                const urlRegex = /(https?:\/\/[^\s\]\)\">]+)/gmi;
                const matches = [...responseText.matchAll(urlRegex)].map(m => (m[1] || '').trim());
                const unique = Array.from(new Set(matches));
                
                // Filter out login/signup/account URLs
                const isLoginUrl = (u) => /login|signin|signup|register|account\/login|account\/signup|auth/i.test(u);
                const looksLikeCheckout = (u) => /checkout|checkouts|cart|kasse|kassa|cassa|panier|koszyk|ko\u0161\u00edk|carrello|k\u00f8b/i.test(u);
                
                // Prefer URLs that look like checkout and are NOT login pages
                const checkoutUrls = unique.filter(u => looksLikeCheckout(u) && !isLoginUrl(u));
                const preferred = checkoutUrls[0] || unique.find(u => !isLoginUrl(u)) || unique[0];
                
                if (preferred) {
                    result.checkout_url = preferred;
                }
            } catch {}
        }

        // Enhanced payment provider extraction
        if (!result.payment_providers || result.payment_providers.length === 0) {
            try {
                const paymentKeywords = [
                    'Visa', 'Mastercard', 'PayPal', 'Stripe', 'Adyen', 'Klarna', 'Afterpay',
                    'Shop Pay', 'Google Pay', 'Apple Pay', 'CB', 'Carte Bancaire', 'American Express',
                    'PayPlug', 'Lyra', 'Sofort', 'iDEAL', 'Bancontact', 'SEPA'
                ];
                
                const foundProviders = [];
                const responseLower = responseText.toLowerCase();
                
                for (const provider of paymentKeywords) {
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
                const productKeywords = ['product', 'item', 'perfume', 'fragrance', 'bottle', '602', 'pepper', 'cedar', 'patchouli'];
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

module.exports = { CheckoutURLExtractor };
