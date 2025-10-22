const { Hyperbrowser } = require('@hyperbrowser/sdk');
const { v4: uuidv4 } = require('uuid');

class PaymentURLExtractor {
    /**
     * A web browsing agent that navigates to checkout pages,
     * fills out forms with random data, and extracts the payment gateway URL.
     */

    constructor(timeoutMinutes = 3.5) { // 3.5 minutes maximum timeout for French webshops with account creation
        const apiKey = process.env.HYPERBROWSER_API_KEY;
        if (!apiKey) {
            console.error("❌ HYPERBROWSER_API_KEY environment variable is required but not found.");
            throw new Error("HYPERBROWSER_API_KEY environment variable is required.");
        }
        
        // Log the API key being used (first few characters for security)
        console.log(`🔑 PaymentURLExtractor initializing with Hyperbrowser API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
        
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
                phone: '22 33 11 11', // Danish 8-digit, spaced
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
    _parseAgentResponse(responseText) {
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
     * Get the detailed task description for the payment agent
     */
    _getTaskDescription(checkoutUrl, profile) {
        return `
 Go to ${checkoutUrl} and extract payment gateway URL. Simple task: fill form fields and click pay button. USE EXACT LOCALE DATA BELOW – do NOT invent US defaults when profile is set.

STEPS:
1. Close popups (Accept, OK, X, Close)
2. Fill form fields ONE BY ONE in this EXACT order (no hesitation, no skipping):
   a) Email: "test@example.com"
   b) First Name: "${profile.firstName}"
   c) Last Name: "${profile.lastName}"
   d) Address: "${profile.address}"
   e) Postal Code/ZIP/Postnummer: "${profile.postalCode}" (CRITICAL - must be filled for delivery validation)
   f) City: "${profile.city}"
   g) Phone: "${profile.phone}"
   h) Country: match currently selected country; if dropdown exists, keep ${profile.code.toUpperCase()} selected
   i) Company: "${profile.company || ''}" (if field exists)
3. Select "${profile.cardLabel}" payment
4. Click "${profile.payLabel}" button
5. Copy the payment gateway URL

RULES:
- Fill fields ONE BY ONE in the exact order listed above (a, b, c, d, e, f, g, h, i)
- NO HESITATION - fill each field immediately when you see it
- Fill EVERY field with red border or error message
- Use TAB to navigate between fields
- POSTAL CODE IS CRITICAL - must be filled for delivery validation
- Do NOT skip any fields - fill ALL visible fields
- Wait for delivery options after filling address (do NOT click pay until delivery methods appear)
- Only click pay button after ALL fields filled
- Extract URL when payment page loads

REPORT:
CHECKOUT_URL: ${checkoutUrl}
FORM_FILLED: Yes
PAYMENT_URL: [gateway URL]
PAYMENT_GATEWAY: [provider name]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [problems]
SCREENSHOT_READY: Yes
        `.trim();
    }

    /**
     * Get session configuration options
     */
    _getSessionOptions(profile = { code: 'default', acceptLanguage: 'en-US,en;q=0.9' }) {
        const isDK = profile && profile.code === 'dk';
        return {
            accept_cookies: true,
            headless: true, // Use headless for faster execution
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport_width: 1280, // Smaller viewport for faster rendering
            viewport_height: 720,
            enable_web_recording: true,
            block_ads: true, // Block ads for faster loading
            block_trackers: true, // Block trackers for faster loading
            disable_images: false, // Keep images for better form recognition
            disable_javascript: false, // Keep JS for modern checkout forms
            timeout: 30000, // 30 second page load timeout
            accept_language: profile.acceptLanguage,
            preferred_languages: profile.acceptLanguage ? profile.acceptLanguage.split(',').map(s => s.split(';')[0]) : undefined,
            timezone: isDK ? 'Europe/Copenhagen' : undefined,
            locale: isDK ? 'da-DK' : undefined
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
                progressCallback("🤖 Starting payment gateway extraction task...");
                progressCallback(`⏰ Timeout protection: Session will be stopped after ${this.timeoutMinutes} minutes to prevent excessive credit usage`);
            }

            // Start the browser use task with focused settings for simple form filling
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                llm: process.env.OPENAI_LLM || "gpt-4o", // Use gpt-4o for best speed and performance
                plannerLlm: process.env.OPENAI_LLM || "gpt-4o-mini", // Use gpt-4o-mini for planner for speed
                pageExtractionLlm: process.env.OPENAI_LLM || "gpt-4o-mini", // Use gpt-4o-mini for page extraction for speed
                maxSteps: 12, // Focused steps for simple task
                maxFailures: 3, // Minimal failures for speed
                useVision: true, // Enable vision for form recognition
                validateOutput: false, // Disable validation for speed
                keepBrowserOpen: false, // Close browser after completion
                maxActionsPerStep: 4, // Focused actions per step
                plannerInterval: 3, // Check progress frequently
                maxInputTokens: 1500, // Reduced tokens for lean prompt
                useCustomApiKeys: true,
                apiKeys: { openai: process.env.OPENAI_API_KEY },
                timeout: this.timeoutMinutes * 60 // Set timeout in seconds
            });

            // Race between the task and timeout
            const result = await Promise.race([browserTaskPromise, timeoutPromise]);

            // Clear timeout since we completed successfully
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (progressCallback) {
                progressCallback("✅ Payment gateway extraction completed successfully!");
            }

            // Capture screenshot before stopping the session
            const screenshotData = await this._capturePaymentScreenshot(sessionId, progressCallback);

            // Parse the agent response
            let parsedResult = {};
            if (result && result.data && result.data.finalResult) {
                parsedResult = this._parseAgentResponse(result.data.finalResult);
            } else if (result && result.finalResult) {
                parsedResult = this._parseAgentResponse(result.finalResult);
            } else {
                // Fallback if no structured response
                parsedResult = {
                    checkout_url: 'Unknown',
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
     * Extracts the payment gateway URL from a given checkout URL.
     * @param {string} checkoutUrl - The URL of the checkout page.
     * @param {function} progressCallback - Callback for real-time progress updates.
     * @returns {Promise<object>} An object containing payment_url, payment_gateway, and screenshot data.
     */
    async extractPaymentURLWithStreaming(checkoutUrl, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback("🚀 Starting payment gateway URL extraction...");
            }

            const profile = this._inferCountryProfile(checkoutUrl);
            const taskDescription = this._getTaskDescription(checkoutUrl, profile);
            const sessionOptions = this._getSessionOptions(profile);

            const result = await this._runWithSessionTimeout(
                taskDescription, 
                sessionOptions, 
                progressCallback
            );

            if (progressCallback) {
                progressCallback("✅ Payment gateway URL extraction completed!");
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

module.exports = { PaymentURLExtractor };
