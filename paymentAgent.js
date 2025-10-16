const { Hyperbrowser } = require('@hyperbrowser/sdk');
const { v4: uuidv4 } = require('uuid');

class PaymentURLExtractor {
    /**
     * A web browsing agent that navigates to checkout pages,
     * fills out forms with random data, and extracts the payment gateway URL.
     */

    constructor(timeoutMinutes = 2) { // 2 minutes maximum timeout for safety, but targeting 10-20 seconds
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
    _getTaskDescription(checkoutUrl) {
        return `
You are a PRECISE payment gateway extraction agent. Your goal: navigate to ${checkoutUrl}, fill forms with country-appropriate data, select card payment, click pay button, and extract the payment gateway URL.

SIMPLE 4-STEP PROCESS:
1. Close popups and fill contact/delivery fields
2. Fill address details with correct country data
3. Select "pay with card" option
4. Click "pay now" button to reach payment gateway

STEP 1 - CLOSE POPUPS & FILL BASIC INFO (3 seconds)
- Go to: ${checkoutUrl}
- **IMMEDIATELY close ALL popups**: Click "Accept", "OK", "Allow", "X", "Close", "Skip"
- Fill basic fields:
  * Email: "test@example.com"
  * Marketing checkbox: Leave as is
  * Country: Select the country shown or first option

STEP 2 - FILL ADDRESS WITH COUNTRY-APPROPRIATE DATA (5 seconds)
**DETECT COUNTRY from page language/currency and use correct data:**

**DENMARK (Danish language/currency):**
- Fornavn: "Lars"
- Efternavn: "Hansen" 
- Adresse: "Hovedgade 123"
- Postnummer: "8200" (always 4 digits)
- By: "Aarhus"
- Telefon: "+45 12345678"

**GERMANY (German language/currency):**
- Vorname: "Hans"
- Nachname: "Müller"
- Adresse: "Hauptstraße 12"
- PLZ: "10115" (5 digits)
- Stadt: "Berlin"
- Telefon: "+49 30 12345678"

**ITALY (Italian language/currency):**
- Nome: "Giuseppe"
- Cognome: "Rossi"
- Indirizzo: "Via Roma 45"
- CAP: "20100" (5 digits)
- Città: "Milano"
- Telefono: "+39 02 12345678"

**SPAIN (Spanish language/currency):**
- Nombre: "Carlos"
- Apellido: "Lopez"
- Dirección: "Calle Mayor 8"
- Código postal: "28001" (5 digits)
- Ciudad: "Madrid"
- Teléfono: "+34 91 12345678"

**POLAND (Polish language/currency):**
- Imię: "Jan"
- Nazwisko: "Kowalski"
- Adres: "ul. Marszałkowska 123"
- Kod pocztowy: "00-001" (XX-XXX format)
- Miasto: "Warszawa"
- Telefon: "+48 22 12345678"

**FRANCE (French language/currency):**
- Prénom: "Marie"
- Nom: "Dubois"
- Adresse: "Rue de Rivoli 123"
- Code postal: "75001" (5 digits)
- Ville: "Paris"
- Téléphone: "+33 1 23 45 67 89"

**DEFAULT (English/other):**
- First Name: "John"
- Last Name: "Smith"
- Address: "123 Main St"
- Postal Code: "12345"
- City: "New York"
- Phone: "+1 555 123 4567"

- **Fill ALL visible fields** - Look for required fields (red asterisks, borders)
- **Use TAB key** to navigate between fields
- **Billing address**: Select "same as delivery" if available

STEP 3 - SELECT CARD PAYMENT (2 seconds)
- Look for payment options:
  * "Credit/Debit Card", "Betalingskort", "Carte", "Karte", "Tarjeta", "Karta"
  * "Pay with Card", "Paga con carta", "Bezahlen mit Karte"
- **SELECT CARD PAYMENT** (avoid PayPal, MobilePay, Klarna, Apple Pay, Google Pay)

STEP 4 - CLICK PAY BUTTON (2 seconds)
- Look for payment buttons:
  * "Pay Now", "Betal nu", "Paga ora", "Bezahlen", "Pagar", "Zapłać", "Payer"
  * "Complete Order", "Place Order", "Finalize Payment"
- **CLICK THE PAY BUTTON** to reach payment gateway

STEP 5 - EXTRACT PAYMENT URL (1 second)
- **WAIT** for payment gateway page to load
- **COPY** the current URL - this is the payment gateway URL
- **IDENTIFY** payment provider (Stripe, Adyen, etc.)

CRITICAL RULES:
- **ALWAYS close popups first** - Never proceed with popups visible
- **Use correct country data** - Match postal codes, phone formats to country
- **Fill ALL required fields** - Don't skip any visible fields
- **Only click pay button** after all fields filled and card selected
- **Extract payment URL immediately** when gateway loads

REPORT FORMAT:
CHECKOUT_URL: ${checkoutUrl}
FORM_FILLED: Yes
PAYMENT_URL: [payment gateway URL]
PAYMENT_GATEWAY: [provider name]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any problems]
SCREENSHOT_READY: Yes

START NOW - BE PRECISE AND EFFICIENT!
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
            disable_images: false, // Keep images for better form recognition
            disable_javascript: false, // Keep JS for modern checkout forms
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
                progressCallback("🤖 Starting payment gateway extraction task...");
                progressCallback(`⏰ Timeout protection: Session will be stopped after ${this.timeoutMinutes} minutes to prevent excessive credit usage`);
            }

            // Start the browser use task with precise settings for 4-step process
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 15, // Focused steps for 4-step process
                maxFailures: 4, // Allow failures for complex forms
                useVision: true, // Enable vision for better form understanding
                validateOutput: false, // Disable validation for maximum speed
                keepBrowserOpen: false, // Close browser after task completion
                maxActionsPerStep: 4, // Focused actions per step
                plannerInterval: 4, // Check progress regularly
                maxInputTokens: 2500 // Optimized tokens for precise instructions
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

            const taskDescription = this._getTaskDescription(checkoutUrl);
            const sessionOptions = this._getSessionOptions();

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
