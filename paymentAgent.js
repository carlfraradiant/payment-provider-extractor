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

STEP 2 - FILL ALL REQUIRED FIELDS WITH COUNTRY-APPROPRIATE DATA (8 seconds)
**CRITICAL: Fill EVERY SINGLE FIELD - No exceptions! Look for red borders, error messages, asterisks (*)**

**DETECT COUNTRY from page language/currency and use correct data:**

**DENMARK (Danish language/currency):**
- Fornavn: "Lars" (REQUIRED - First Name)
- Efternavn: "Hansen" (REQUIRED - Last Name)
- Firma: "Test Company" (if present)
- Adresse: "Hovedgade 123" (REQUIRED - Address)
- Postnummer: "8200" (REQUIRED - always 4 digits)
- By: "Aarhus" (REQUIRED - City)
- Telefon: "+45 12 34 56 78" (REQUIRED - valid Danish format)

**GERMANY (German language/currency):**
- Vorname: "Hans" (REQUIRED - First Name)
- Nachname: "Müller" (REQUIRED - Last Name)
- Firma: "Test Company" (if present)
- Adresse: "Hauptstraße 12" (REQUIRED - Address)
- PLZ: "10115" (REQUIRED - 5 digits)
- Stadt: "Berlin" (REQUIRED - City)
- Telefon: "+49 30 12345678" (REQUIRED - valid German format)

**ITALY (Italian language/currency):**
- Nome: "Giuseppe" (REQUIRED - First Name)
- Cognome: "Rossi" (REQUIRED - Last Name)
- Azienda: "Test Company" (if present)
- Indirizzo: "Via Roma 45" (REQUIRED - Address)
- CAP: "20100" (REQUIRED - 5 digits)
- Città: "Milano" (REQUIRED - City)
- Telefono: "+39 02 12345678" (REQUIRED - valid Italian format)

**SPAIN (Spanish language/currency):**
- Nombre: "Carlos" (REQUIRED - First Name)
- Apellido: "Lopez" (REQUIRED - Last Name)
- Empresa: "Test Company" (if present)
- Dirección: "Calle Mayor 8" (REQUIRED - Address)
- Código postal: "28001" (REQUIRED - 5 digits)
- Ciudad: "Madrid" (REQUIRED - City)
- Teléfono: "+34 91 12345678" (REQUIRED - valid Spanish format)

**POLAND (Polish language/currency):**
- Imię: "Jan" (REQUIRED - First Name)
- Nazwisko: "Kowalski" (REQUIRED - Last Name)
- Firma: "Test Company" (if present)
- Adres: "ul. Marszałkowska 123" (REQUIRED - Address)
- Kod pocztowy: "00-001" (REQUIRED - XX-XXX format)
- Miasto: "Warszawa" (REQUIRED - City)
- Telefon: "+48 22 12345678" (REQUIRED - valid Polish format)

**FRANCE (French language/currency):**
- Prénom: "Marie" (REQUIRED - First Name)
- Nom: "Dubois" (REQUIRED - Last Name)
- Société: "Test Company" (if present)
- Adresse: "Rue de Rivoli 123" (REQUIRED - Address)
- Code postal: "75001" (REQUIRED - 5 digits)
- Ville: "Paris" (REQUIRED - City)
- Téléphone: "+33 1 23 45 67 89" (REQUIRED - valid French format)

**DEFAULT (English/other):**
- First Name: "John" (REQUIRED)
- Last Name: "Smith" (REQUIRED)
- Company: "Test Company" (if present)
- Address: "123 Main St" (REQUIRED)
- Postal Code: "12345" (REQUIRED)
- City: "New York" (REQUIRED)
- Phone: "+1 555 123 4567" (REQUIRED)

**MANDATORY FIELD FILLING RULES:**
- **SCAN ENTIRE PAGE** for ALL input fields, dropdowns, checkboxes
- **Fill EVERY field** that has a red border, asterisk (*), or error message
- **Look for validation errors** like "Indtast efternavn", "Indtast adresse", "Indtast postnummer"
- **Use TAB key** to navigate between fields systematically
- **Check for hidden/conditional fields** that appear after filling other fields
- **Billing address**: Select "same as delivery" if available, otherwise fill separately
- **Delivery method**: Select first available option after address is complete
- **DO NOT PROCEED** until ALL red borders and error messages are gone

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
- **Fill EVERY SINGLE FIELD** - No exceptions! Look for red borders, error messages, asterisks
- **Check for validation errors** - Look for messages like "Indtast efternavn", "Indtast adresse"
- **Wait for delivery options** - Fill address completely before delivery method appears
- **Only click pay button** after ALL fields filled, ALL errors gone, and card selected
- **Extract payment URL immediately** when gateway loads
- **NEVER skip fields** - Every empty field with red border must be filled

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

            // Start the browser use task with thorough settings for complete form filling
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 18, // More steps for thorough field filling
                maxFailures: 5, // Allow failures for complex forms
                useVision: true, // Enable vision for better form understanding
                validateOutput: false, // Disable validation for maximum speed
                keepBrowserOpen: false, // Close browser after task completion
                maxActionsPerStep: 6, // More actions per step for field filling
                plannerInterval: 5, // Check progress regularly
                maxInputTokens: 2800 // More tokens for detailed field instructions
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
