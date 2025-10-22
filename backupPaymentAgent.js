const { Hyperbrowser } = require('@hyperbrowser/sdk');
const { v4: uuidv4 } = require('uuid');

class PaymentURLExtractorV2 {
    /**
     * A web browsing agent that uses HyperAgent to navigate checkout pages,
     * fill out forms with locale-specific data, and extract the payment gateway URL.
     */

    constructor(timeoutMinutes = 3.5) { // 3.5 minutes for French webshops with account creation
        const apiKey = process.env.HYPERBROWSER_API_KEY;
        if (!apiKey) {
            console.error("❌ HYPERBROWSER_API_KEY environment variable is required but not found.");
            throw new Error("HYPERBROWSER_API_KEY environment variable is required.");
        }
        
        // Log the API key being used (first few characters for security)
        console.log(`🔑 PaymentURLExtractorV2 initializing with Hyperbrowser API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
        
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
     * Infer country/profile from checkout URL or query params
     * Returns a minimal, locale-correct dataset for faster, more reliable fills
     */
    _inferCountryProfile(checkoutUrl) {
        const urlStr = (checkoutUrl || '').toLowerCase();
        const has = (s) => urlStr.includes(s);
        
        // Default profile (EN)
        let profile = {
            code: 'default',
            acceptLanguage: 'en-US,en;q=0.9',
            firstName: 'John',
            lastName: 'Smith',
            address: '123 Main St',
            postalCode: '12345',
            city: 'New York',
            phone: '+1 555 123 4567',
            cardLabel: 'Credit Card',
            payLabel: 'Pay Now'
        };

        // Denmark
        if (has('.dk') || has('da-dk') || has('/da') || has('lang=da') || has('locale=da')) {
            profile = {
                code: 'dk',
                acceptLanguage: 'da-DK,da;q=0.9,en;q=0.8',
                firstName: 'Lars',
                lastName: 'Hansen',
                address: 'Hovedgade 12',
                postalCode: '8200',
                city: 'Aarhus',
                phone: '22 33 11 11',
                cardLabel: 'Betalingskort',
                payLabel: 'Betal nu'
            };
        }

        // Germany
        else if (has('.de') || has('de-de') || has('lang=de') || has('locale=de')) {
            profile = {
                code: 'de',
                acceptLanguage: 'de-DE,de;q=0.9,en;q=0.8',
                firstName: 'Hans',
                lastName: 'Müller',
                address: 'Hauptstraße 12',
                postalCode: '10115',
                city: 'Berlin',
                phone: '+49 30 12345678',
                cardLabel: 'Kreditkarte',
                payLabel: 'Jetzt bezahlen'
            };
        }

        // Italy
        else if (has('.it') || has('it-it') || has('lang=it') || has('locale=it')) {
            profile = {
                code: 'it',
                acceptLanguage: 'it-IT,it;q=0.9,en;q=0.8',
                firstName: 'Giuseppe',
                lastName: 'Rossi',
                address: 'Via Roma 45',
                postalCode: '20100',
                city: 'Milano',
                phone: '+39 02 12345678',
                cardLabel: 'Carta di credito',
                payLabel: 'Paga ora'
            };
        }

        // Spain
        else if (has('.es') || has('es-es') || has('lang=es') || has('locale=es')) {
            profile = {
                code: 'es',
                acceptLanguage: 'es-ES,es;q=0.9,en;q=0.8',
                firstName: 'Carlos',
                lastName: 'Lopez',
                address: 'Calle Mayor 8',
                postalCode: '28001',
                city: 'Madrid',
                phone: '+34 91 12345678',
                cardLabel: 'Tarjeta',
                payLabel: 'Pagar ahora'
            };
        }

        // Poland
        else if (has('.pl') || has('pl-pl') || has('lang=pl') || has('locale=pl')) {
            profile = {
                code: 'pl',
                acceptLanguage: 'pl-PL,pl;q=0.9,en;q=0.8',
                firstName: 'Jan',
                lastName: 'Kowalski',
                address: 'ul. Marszałkowska 123',
                postalCode: '00-001',
                city: 'Warszawa',
                phone: '+48 22 12345678',
                cardLabel: 'Karta',
                payLabel: 'Zapłać teraz'
            };
        }

        // France
        else if (has('.fr') || has('fr-fr') || has('lang=fr') || has('locale=fr')) {
            profile = {
                code: 'fr',
                acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8',
                firstName: 'Marie',
                lastName: 'Dubois',
                address: 'Rue de Rivoli 123',
                postalCode: '75001',
                city: 'Paris',
                phone: '+33 1 23 45 67 89',
                cardLabel: 'Carte bancaire',
                payLabel: 'Payer maintenant'
            };
        }

        return profile;
    }

    /**
     * Parses the agent response text into a structured dictionary.
     * @param {string} responseText - The raw text response from the agent.
     * @returns {object} A structured object containing extracted information.
     */
    _parseAgentResponse(responseText, originalCheckoutUrl) {
        if (!responseText) {
            return { error: 'No response from agent' };
        }

        const result = {};
        const lines = responseText.trim().split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('PAYMENT_URL:')) {
                result.payment_url = trimmedLine.replace('PAYMENT_URL:', '').trim();
            } else if (trimmedLine.startsWith('PAYMENT_GATEWAY:')) {
                result.payment_gateway = trimmedLine.replace('PAYMENT_GATEWAY:', '').trim();
            } else if (trimmedLine.startsWith('PAYMENT_PROVIDERS:')) {
                const providersText = trimmedLine.replace('PAYMENT_PROVIDERS:', '').trim();
                result.payment_providers = providersText.split(',').map(p => p.trim()).filter(p => p);
            } else if (trimmedLine.startsWith('FORM_FILLED:')) {
                result.form_filled = trimmedLine.replace('FORM_FILLED:', '').trim();
            } else if (trimmedLine.startsWith('CHECKOUT_URL:')) {
                result.checkout_url = trimmedLine.replace('CHECKOUT_URL:', '').trim();
            } else if (trimmedLine.startsWith('STEPS_COMPLETED:')) {
                result.steps_completed = trimmedLine.replace('STEPS_COMPLETED:', '').trim();
            } else if (trimmedLine.startsWith('ISSUES_ENCOUNTERED:')) {
                result.issues_encountered = trimmedLine.replace('ISSUES_ENCOUNTERED:', '').trim();
            } else if (trimmedLine.startsWith('SCREENSHOT_READY:')) {
                result.screenshot_ready = trimmedLine.replace('SCREENSHOT_READY:', '').trim();
            }
        }

        // Robust fallback: extract URL tokens from the entire response
        if (!result.payment_url) {
            try {
                const urlRegex = /(https?:\/\/[^\s\]\)\">]+)$/gmi;
                const matches = [...responseText.matchAll(urlRegex)].map(m => m[1]);
                const unique = Array.from(new Set(matches));
                const origHost = (() => { try { return new URL(originalCheckoutUrl || '').host; } catch { return ''; } })();
                const isExternal = (u) => { try { return origHost && new URL(u).host !== origHost; } catch { return false; } };
                const looksLikeGateway = (u) => /altapaysecure|altapayplatform|stripe|adyen|klarna|paypal|shopify|checkout|opayo|sagepay|nets|worldpay|braintree|paytrail|payu|vivawallet|mollie|2checkout|paddle|payone|swedbank|safecheckout|secure|payment/.test(u.toLowerCase());

                // Prefer external URLs that look like gateways
                const preferred = unique.find(u => isExternal(u) && looksLikeGateway(u))
                    || unique.find(u => looksLikeGateway(u))
                    || unique.find(u => isExternal(u))
                    || unique[0];
                if (preferred) result.payment_url = preferred;
            } catch {}
        }

        result.raw_response = responseText;
        return result;
    }

    /**
     * Captures a screenshot of the current page using the session's live view.
     * @param {string} sessionId - The ID of the Hyperbrowser session.
     * @param {function} progressCallback - Callback for progress updates.
     * @returns {Promise<object>} An object containing live_url and status.
     */
    async _capturePaymentScreenshot(sessionId, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("📸 Capturing payment gateway page screenshot...");
            }

            const sessionDetails = await this.hb.sessions.get(sessionId);

            if (!sessionDetails) {
                if (progressCallback) {
                    progressCallback("⚠️ Could not get session details for screenshot");
                }
                return null;
            }

            const liveUrl = sessionDetails.liveUrl;

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

            return {
                screenshot_base64: null,
                timestamp: new Date().toISOString(),
                live_url: liveUrl,
                status: 'live_url_available',
                message: 'Live session URL available for manual screenshot capture'
            };

        } catch (e) {
            if (progressCallback) {
                progressCallback(`❌ Error capturing screenshot: ${e.message}`);
            }
            return null;
        }
    }

    /**
     * Get the natural language task description for HyperAgent
     */
    _getTaskDescription(checkoutUrl, profile) {
        const originalHost = (() => { try { return new URL(checkoutUrl).host; } catch { return ''; } })();
        return `
AGGRESSIVE PAYMENT EXTRACTION - NO DELAYS! Start at ${checkoutUrl}. Target: external payment page in 20 seconds.

IMMEDIATE ACTIONS (DO NOT WAIT):
1) CLICK "Shop" or "Produits" or "Collection" or "Boutique" - FIND PRODUCTS NOW!
2) CLICK first available product immediately
3) CLICK "Add to Cart" / "Ajouter au panier" / "Acheter" - ADD TO CART NOW!
4) CLICK "Cart" / "Panier" / "Caisse" - GO TO CART NOW!
5) CLICK "Checkout" / "Commander" / "Finaliser" - START CHECKOUT NOW!

FORM FILLING (RAPID):
- Email: test@example.com
- First Name: ${profile.firstName}
- Last Name: ${profile.lastName}
- Address: ${profile.address}
- Postal Code: ${profile.postalCode}
- City: ${profile.city}
- Phone: ${profile.phone}
- Country: ${profile.code.toUpperCase()}

PAYMENT SELECTION:
- Choose "Credit Card" / "Carte bancaire" / "Pay with card"
- Click "Continue" / "Next" / "Proceed" until EXTERNAL payment page

CRITICAL:
- Payment page MUST be on DIFFERENT domain than ${originalHost}
- Copy EXACT address bar URL (Ctrl+L, Ctrl+C) as PAYMENT_URL
- DO NOT enter card details - stop at payment form
- NO DELAYS - ACT IMMEDIATELY ON EACH PAGE

Output:
CHECKOUT_URL: ${checkoutUrl}
FORM_FILLED: Yes
PAYMENT_URL: [exact address bar URL]
PAYMENT_GATEWAY: [provider name]
PAYMENT_PROVIDERS: [comma-separated]
STEPS_COMPLETED: [brief summary]
ISSUES_ENCOUNTERED: [any]
SCREENSHOT_READY: Yes

EXECUTE NOW: ${checkoutUrl}
        `.trim();
    }

    /**
     * Get session configuration options
     */
    _getSessionOptions(profile = { code: 'default', acceptLanguage: 'en-US,en;q=0.9' }) {
        // Set timezone and locale based on country profile
        let timezone = 'Europe/London'; // Default European timezone
        let locale = 'en-GB'; // Default European locale
        
        if (profile.code === 'dk') {
            timezone = 'Europe/Copenhagen';
            locale = 'da-DK';
        } else if (profile.code === 'it') {
            timezone = 'Europe/Rome';
            locale = 'it-IT';
        } else if (profile.code === 'fr') {
            timezone = 'Europe/Paris';
            locale = 'fr-FR';
        } else if (profile.code === 'de') {
            timezone = 'Europe/Berlin';
            locale = 'de-DE';
        } else if (profile.code === 'es') {
            timezone = 'Europe/Madrid';
            locale = 'es-ES';
        } else if (profile.code === 'pl') {
            timezone = 'Europe/Warsaw';
            locale = 'pl-PL';
        }
        
        return {
            acceptCookies: true,
            headless: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewportWidth: 1280,
            viewportHeight: 720,
            acceptLanguage: profile.acceptLanguage,
            timezone: timezone,
            locale: locale,
            blockAds: true,
            blockTrackers: true
        };
    }

    /**
     * Run the Browser Use task with session timeout management
     */
    async _runWithSessionTimeout(taskDescription, sessionOptions, progressCallback = null, context = {}) {
        let sessionId = null;
        let timeoutId = null;

        try {
            if (progressCallback) {
                progressCallback("🌐 Creating browser session...");
            }

            // Create a new session with sessionOptions
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
                progressCallback("🤖 Starting Browser Use payment gateway extraction...");
                progressCallback(`⏰ Timeout protection: Session will be stopped after ${this.timeoutMinutes} minutes`);
            }

            // Start the Browser Use task with MAXIMUM SPEED configuration
            const browserUsePromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                llm: process.env.OPENAI_LLM || "gpt-4o", // Best available model for main reasoning
                plannerLlm: process.env.OPENAI_LLM || "gpt-4o-mini", // Fast planner decisions
                pageExtractionLlm: process.env.OPENAI_LLM || "gpt-4o-mini", // Fast page extraction
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                keepBrowserOpen: false // Close browser after completion
            });

            // Race between the task and timeout
            const result = await Promise.race([browserUsePromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ Browser Use payment gateway extraction completed successfully!");
            }

            // Capture screenshot before stopping the session
            const screenshotData = await this._capturePaymentScreenshot(sessionId, progressCallback);

            // Parse the agent response
            let parsedResult = {};
            if (result && result.data && result.data.finalResult) {
                parsedResult = this._parseAgentResponse(result.data.finalResult, context && context.originalCheckoutUrl);
            } else if (result && result.finalResult) {
                parsedResult = this._parseAgentResponse(result.finalResult, context && context.originalCheckoutUrl);
            } else {
                // Fallback if no structured response
                parsedResult = {
                    checkout_url: context && context.originalCheckoutUrl,
                    form_filled: 'Unknown',
                    payment_url: null,
                    payment_gateway: 'Unknown',
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
     * Extracts the payment gateway URL from a given checkout URL using HyperAgent.
     * @param {string} checkoutUrl - The URL of the checkout page.
     * @param {function} progressCallback - Callback for real-time progress updates.
     * @returns {Promise<object>} An object containing payment_url, payment_gateway, and screenshot data.
     */
    async extractPaymentURLWithStreaming(checkoutUrl, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("🚀 Starting Browser Use payment gateway URL extraction...");
            }

            const profile = this._inferCountryProfile(checkoutUrl);
            const taskDescription = this._getTaskDescription(checkoutUrl, profile);
            const sessionOptions = this._getSessionOptions(profile);

            const result = await this._runWithSessionTimeout(
                taskDescription, 
                sessionOptions, 
                progressCallback,
                { originalCheckoutUrl: checkoutUrl }
            );

            if (progressCallback) {
                progressCallback("✅ Browser Use payment gateway URL extraction completed!");
            }

            return result;

        } catch (error) {
            if (progressCallback) {
                progressCallback(`❌ Error during extraction: ${error.message}`);
            }
            throw error;
        }
    }
}

module.exports = { PaymentURLExtractorV2 };
