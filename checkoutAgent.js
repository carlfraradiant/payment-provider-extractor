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
You are a FAST e-commerce checkout agent specialized for Italian webshops. Start at ${websiteUrl}. Goal: add ONE product to cart and reach the final checkout page quickly, then output the checkout URL and visible payment providers.

Execute this strictly:
1) Close popups immediately (Accetta/OK/X/Chiudi; multilingual variants allowed). Look for cookie banners and consent dialogs first.
2) Open a product page (first obvious product or from Shop/Prodotti/Collezione). Avoid pages that are out of stock.
3) FIND AND CLICK THE ADD-TO-CART BUTTON RELIABLY:
   - If the button is not visible, SCROLL the page: use small incremental scrolls down the page until buttons and forms become visible; if you reach the bottom without finding it, scroll back up a little and try again.
   - Recognize Italian labels for add-to-cart: "Aggiungi al carrello", "Aggiungi", "Acquista", "Compra", "Aggiungi al cestino", "Metti nel carrello", "Aggiungi alla borsa", "Aggiungi al paniere".
   - Also detect common selectors/attributes: buttons or inputs with type=submit near product forms; ids/classes containing add-to-cart, add, cart, purchase, buy; Shopify examples like button[name="add"], #AddToCart, [data-testid*="add-to-cart"].
   - If variants (taglia/colore) are REQUIRED, quickly choose the first available option for each required selector before clicking add to cart.
   - Ensure QUANTITÀ = 1.
4) Confirm the cart drawer or cart page shows exactly one item. If the cart is empty, try the add-to-cart step again once after a short scroll and wait.
5) Open the cart and click "Checkout" / "Procedi al checkout" / localized equivalents ("Cassa", "Vai alla cassa", "Procedi", "Finalizza ordine", "Completa ordine").
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
     * French-specific task description with account creation handling
     */
    _getFrenchTaskDescription(websiteUrl) {
        return `
You are a FAST e-commerce checkout agent specialized for French webshops. Start at ${websiteUrl}. Goal: add ONE product to cart and reach the final checkout page quickly, then output the checkout URL and visible payment providers.

CRITICAL FRENCH E-COMMERCE PATTERNS:
- Most French sites require account creation before checkout
- Look for "Commander sans compte", "Acheter en tant qu'invité", or "Poursuivre sans compte" for guest checkout
- If account creation is mandatory, create one quickly with test data
- French sites often have complex navigation and multiple steps

Execute this strictly:
1) Close popups immediately (Accepter/OK/X/Fermer; multilingual variants allowed). Look for cookie banners and consent dialogs first.
2) Open a product page (first obvious product or from Shop/Produits/Collection). Avoid pages that are out of stock.
3) FIND AND CLICK THE ADD-TO-CART BUTTON RELIABLY:
   - If the button is not visible, SCROLL the page: use small incremental scrolls down the page until buttons and forms become visible; if you reach the bottom without finding it, scroll back up a little and try again.
   - Recognize French labels for add-to-cart: "Ajouter au panier", "Ajouter", "Acheter", "Ajouter au caddy", "Mettre dans le panier", "Ajouter à la corbeille", "Ajouter au sac", "Ajouter au chariot", "Commander".
   - Also detect common selectors/attributes: buttons or inputs with type=submit near product forms; ids/classes containing add-to-cart, add, cart, purchase, buy; Shopify examples like button[name="add"], #AddToCart, [data-testid*="add-to-cart"].
   - If variants (taille/couleur) are REQUIRED, quickly choose the first available option for each required selector before clicking add to cart.
   - Ensure QUANTITÉ = 1.
4) Confirm the cart drawer or cart page shows exactly one item. If the cart is empty, try the add-to-cart step again once after a short scroll and wait.
5) Open the cart and click "Checkout" / "Procéder au checkout" / localized equivalents ("Caisse", "Aller à la caisse", "Finaliser la commande", "Valider la commande", "Terminer la commande", "Commander").
6) HANDLE ACCOUNT CREATION IF REQUIRED:
   - If prompted to create account, look for "Commander sans compte", "Acheter en tant qu'invité", "Poursuivre sans compte" first
   - If guest checkout not available, create account quickly with:
     * Email: test@example.com
     * Password: Test123456
     * Confirm password: Test123456
     * Accept CGV/terms if required
   - Look for "Créer un compte", "S'inscrire", "Inscription" buttons
7) On the checkout page, copy the full URL and return.

FRENCH-SPECIFIC SPEED RULES:
- Be decisive and fast. Avoid optional choices unless mandatory.
- Always close popups before continuing.
- Only add a single item.
- If account creation is required, do it quickly with test data
- Look for guest checkout options first before creating account
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
     * European-specific task description for other European countries
     */
    _getEuropeanTaskDescription(websiteUrl) {
        return `
You are a FAST e-commerce checkout agent specialized for European webshops. Start at ${websiteUrl}. Goal: add ONE product to cart and reach the final checkout page quickly, then output the checkout URL and visible payment providers.

EUROPEAN E-COMMERCE PATTERNS:
- European sites often require account creation or offer guest checkout
- Look for "Guest checkout", "Continue without account", "Buy as guest" options
- European sites may have GDPR cookie banners and consent dialogs
- Multi-language support is common across European sites

Execute this strictly:
1) Close popups immediately (Accept/OK/X/Close; multilingual variants allowed). Look for cookie banners and consent dialogs first.
2) Open a product page (first obvious product or from Shop/Products/Collection). Avoid pages that are out of stock.
3) FIND AND CLICK THE ADD-TO-CART BUTTON RELIABLY:
   - If the button is not visible, SCROLL the page: use small incremental scrolls down the page until buttons and forms become visible; if you reach the bottom without finding it, scroll back up a little and try again.
   - Accept multilingual labels for add-to-cart: "Add to cart", "Add to bag", "Add to basket", "Buy", "Comprar", "Acheter", "Ajouter au panier", "In den Warenkorb", "Aggiungi al carrello", "Dodaj do koszyka", "Køb", "Læg i kurv", "Tilføj til kurv", "Køb nu", "Kaufen", "In winkelwagen", "Añadir al carrito", "Comprar".
   - Also detect common selectors/attributes: buttons or inputs with type=submit near product forms; ids/classes containing add-to-cart, add, cart, purchase, buy; Shopify examples like button[name="add"], #AddToCart, [data-testid*="add-to-cart"].
   - If variants (size/color) are REQUIRED, quickly choose the first available option for each required selector before clicking add to cart.
   - Ensure QUANTITY = 1.
4) Confirm the cart drawer or cart page shows exactly one item. If the cart is empty, try the add-to-cart step again once after a short scroll and wait.
5) Open the cart and click "Checkout" / "Proceed to checkout" / localized equivalents ("Kasse", "Zur Kasse", "Cassa", "Pagar", "Finaliser la commande", "Do kasy", "Afrekenen", "Kassa", "Checkout").
6) HANDLE ACCOUNT CREATION IF REQUIRED:
   - Look for "Guest checkout", "Continue without account", "Buy as guest" first
   - If account creation is mandatory, create one quickly with test data
7) On the checkout page, copy the full URL and return.

Speed rules:
- Be decisive and fast. Avoid optional choices unless mandatory.
- Always close popups before continuing.
- Only add a single item.
- If account creation is required, do it quickly with test data
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
     * Default task description for non-European countries
     */
    _getDefaultTaskDescription(websiteUrl) {
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
                llm: process.env.OPENAI_LLM || "gpt-5",
                plannerLlm: process.env.OPENAI_LLM || "gpt-5-mini",
                pageExtractionLlm: process.env.OPENAI_LLM || "gpt-5-mini",
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
                timeout: this.timeoutMinutes * 60, // Set timeout in seconds
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
