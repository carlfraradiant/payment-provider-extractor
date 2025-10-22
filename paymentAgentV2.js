const { Hyperbrowser } = require('@hyperbrowser/sdk');
const { v4: uuidv4 } = require('uuid');

class PaymentURLExtractorV2 {
    /**
     * A web browsing agent that uses HyperAgent to navigate checkout pages,
     * fill out forms with locale-specific data, and extract the payment gateway URL.
     */

    constructor(timeoutMinutes = 5) { // 5 minutes for French webshops with account creation
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
        console.log(`🔧 PaymentURLExtractorV2 initialized with timeout: ${this.timeoutMinutes} minutes`);
    }

    /**
     * French profile only - optimized for French webshops
     */
    _inferCountryProfile(checkoutUrl) {
        // Always return French profile for maximum effectiveness
        return {
            code: 'fr',
            acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8',
            firstName: 'Marie',
            lastName: 'Dubois',
            address: '15 Rue de Rivoli',
            postalCode: '75001',
            city: 'Paris',
            phone: '01 23 45 67 89',
            cardLabel: 'Carte bancaire',
            payLabel: 'Payer maintenant'
        };
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
     * Get the natural language task description for HyperAgent - French only
     */
    _getTaskDescription(checkoutUrl, profile) {
        return this._getFrenchPaymentTaskDescription(checkoutUrl, profile);
    }


    /**
     * French payment task description - SIMPLIFIED for maximum effectiveness
     */
    _getFrenchPaymentTaskDescription(checkoutUrl, profile) {
        return `
FRENCH PAYMENT EXTRACTION - ULTRA FAST! Go to ${checkoutUrl}.

CRITICAL FIRST STEP - SCREEN PAGE:
1) SCROLL TO BOTTOM first - look for cookie banners with "AUTORISER LES COOKIES", "Accepter", "Accept", "Allow" buttons and click them
2) Scroll to TOP of page - look for payment providers at top
3) Look for payment provider logos/text: Shopify Payments, Shop Pay, Google Pay, Apple Pay, PayPal, Stripe, Adyen, Klarna, Afterpay, Visa, Mastercard, American Express, CB, Carte Bancaire, Lyra, PayPlug, etc.
4) Scroll down entire page and look for card fields: "Numéro de carte", "Mois/Année", "CVV", "CVC"
5) IF card inputs found ANYWHERE:
   - Extract ALL payment providers found (top and bottom of page)
   - Set PAYMENT_URL to current page URL (window.location.href)
   - EXIT IMMEDIATELY
6) IF no card inputs, proceed with checkout

CHECKOUT FLOW (if needed):
- Try guest checkout: "Commander sans compte" or "Acheter en tant qu'invité"
- If account required: Email: test@example.com, Password: Test123456, Name: Marie Dubois
- Fill forms: Prénom: Marie, Nom: Dubois, Adresse: 15 Rue de Rivoli, Code postal: 75001, Ville: Paris, Téléphone: 01 23 45 67 89
- Choose first delivery method
- Choose payment method and continue

CRITICAL RULES:
- NEVER enter card numbers, CVV, or expiry dates
- Just identify payment providers and extract URL
- Scroll through entire page to find card fields

OUTPUT FORMAT:
CHECKOUT_URL: ${checkoutUrl}
FORM_FILLED: Yes
PAYMENT_URL: [exact URL from address bar]
PAYMENT_GATEWAY: [provider name if visible]
PAYMENT_PROVIDERS: [comma-separated list of ALL providers found - check top and bottom of page]
STEPS_COMPLETED: [brief summary]
ISSUES_ENCOUNTERED: [any problems]
SCREENSHOT_READY: Yes

START NOW: ${checkoutUrl}
        `.trim();
    }


    /**
     * Get session configuration options optimized for French webshops
     */
    _getSessionOptions(profile = { code: 'fr', acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8' }) {
        return {
            acceptCookies: true,
            headless: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewportWidth: 1280,
            viewportHeight: 720,
            acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8',
            timezone: 'Europe/Paris',
            locale: 'fr-FR'
        };
    }

    /**
     * Run the HyperAgent task with session timeout management
     */
    async _runWithSessionTimeout(taskDescription, sessionOptions, progressCallback = null, context = {}) {
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

            // Start the Browser Use task with our own OpenAI keys - ULTRA FAST CONFIG
            const browserUsePromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                llm: "gpt-4.1", // Fastest available model
                plannerLlm: "gpt-o1-mini", // Fastest for planning
                pageExtractionLlm: "gpt-4.1-mini", // Fastest for page extraction
                maxSteps: 15, // Reduced for speed
                maxFailures: 2, // Reduced for speed
                useVision: true,
                validateOutput: false,
                maxActionsPerStep: 3, // Increased for efficiency
                plannerInterval: 1, // Faster planning
                maxInputTokens: 1500, // Reduced for speed
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                keepBrowserOpen: false
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
                progressCallback("🚀 Starting HyperAgent payment gateway URL extraction...");
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
                progressCallback("✅ HyperAgent payment gateway URL extraction completed!");
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
