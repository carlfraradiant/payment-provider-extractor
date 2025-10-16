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
You are a FAST and EFFICIENT payment gateway extraction agent. Your goal is to quickly navigate to ${checkoutUrl}, fill out the checkout form with random data, and reach the payment gateway page to extract the payment URL.

SPEED IS CRITICAL - Complete this task in 10-20 seconds total. Be extremely fast and decisive.

MULTILINGUAL SUPPORT: This checkout page may be in English, French, Italian, German, Spanish, Polish, or other languages. Look for these common terms:

ENGLISH: Email, Address, Phone, City, Country, Card, Pay Now, Continue, Proceed, Complete Order
FRENCH: Email, Adresse, Téléphone, Ville, Pays, Carte, Payer maintenant, Continuer, Finaliser
ITALIAN: Email, Indirizzo, Telefono, Città, Paese, Carta, Paga ora, Continua, Completa ordine
GERMAN: E-Mail, Adresse, Telefon, Stadt, Land, Karte, Jetzt bezahlen, Weiter, Bestellung abschließen
SPANISH: Email, Dirección, Teléfono, Ciudad, País, Tarjeta, Pagar ahora, Continuar, Completar pedido
POLISH: Email, Adres, Telefon, Miasto, Kraj, Karta, Zapłać teraz, Kontynuuj, Zakończ zamówienie

FAST EXECUTION STRATEGY:

STEP 1 - AGGRESSIVE POPUP ELIMINATION (2 seconds max)
- Go to: ${checkoutUrl}
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

STEP 2 - RAPID FORM FILLING (5 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Look for checkout form fields and fill them with RANDOM data:
  * Email: Use format "test123@example.com" or "user456@test.com"
  * First Name: "John", "Maria", "Giuseppe", "Hans", "Carlos", "Jan"
  * Last Name: "Smith", "Garcia", "Rossi", "Müller", "Lopez", "Kowalski"
  * Address: "123 Main St", "Via Roma 45", "Hauptstraße 12", "Calle Mayor 8"
  * City: "New York", "Milan", "Berlin", "Madrid", "Warsaw"
  * Country: Select first available option or "United States", "Italy", "Germany", "Spain", "Poland"
  * Phone: "1234567890", "+1234567890", "123-456-7890"
  * ZIP/Postal Code: "12345", "20100", "10115", "28001", "00-001"
- **FILL ALL REQUIRED FIELDS** - Look for red asterisks (*) or "required" labels
- **SKIP OPTIONAL FIELDS** - Don't waste time on non-required fields
- **USE TAB KEY** to navigate between fields quickly

STEP 3 - PAYMENT METHOD SELECTION (3 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Look for payment method options:
  * Credit Card / Debit Card / Card payment
  * PayPal (if available, but prefer card)
  * Bank transfer (avoid if possible)
- **SELECT CARD PAYMENT** - This usually leads to payment gateway
- **AVOID** PayPal, Apple Pay, Google Pay if you want to reach external payment gateway

STEP 4 - PROCEED TO PAYMENT (3 seconds max)
- **FIRST**: Check for and close ANY new popups that appeared
- Look for and click payment buttons:
  * "Pay Now", "Complete Order", "Continue to Payment", "Proceed to Payment"
  * "Place Order", "Finalize Payment", "Pay with Card"
- **MULTILINGUAL PAYMENT BUTTONS**:
  * ENGLISH: Pay Now, Complete Order, Continue, Proceed, Place Order
  * FRENCH: Payer maintenant, Finaliser, Continuer, Passer commande
  * ITALIAN: Paga ora, Completa ordine, Continua, Procedi, Ordina
  * GERMAN: Jetzt bezahlen, Bestellung abschließen, Weiter, Fortfahren
  * SPANISH: Pagar ahora, Completar pedido, Continuar, Proceder
  * POLISH: Zapłać teraz, Zakończ zamówienie, Kontynuuj, Przejdź

STEP 5 - EXTRACT PAYMENT GATEWAY URL (2 seconds max)
- **WAIT** for payment gateway page to load completely
- **COPY** the current URL immediately - this is the payment gateway URL
- **IDENTIFY** the payment gateway provider (Stripe, PayPal, Adyen, etc.)
- **REPORT** results instantly

CRITICAL RULES:
- **POPUP ELIMINATION IS TOP PRIORITY** - Close ALL popups before doing ANYTHING else
- **PAYMENT URL EXTRACTION IS ULTIMATE PRIORITY** - Extract payment gateway URL FIRST and FASTEST
- BE LIGHTNING FAST - Complete entire task in 10-20 seconds total
- BE DECISIVE - If you see a button that looks right, click it immediately
- USE RANDOM DATA - Don't spend time on realistic data, just fill required fields
- MULTILINGUAL - Recognize buttons and fields in any language (including Polish)
- DIRECT PATH - Take the fastest route to payment gateway page
- **POPUP PERSISTENCE**: If popups keep appearing, refresh page and start over
- **POPUP BLOCKING**: Never proceed if ANY popup is visible - close it first

REPORT FORMAT:
CHECKOUT_URL: ${checkoutUrl}
FORM_FILLED: Yes
PAYMENT_URL: [full payment gateway URL]
PAYMENT_GATEWAY: [gateway provider name]
STEPS_COMPLETED: [summary]
ISSUES_ENCOUNTERED: [any problems]
SCREENSHOT_READY: Yes

START NOW - BE FAST AND EFFICIENT!
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

            // Start the browser use task with ultra-optimized settings for 10-20 second execution
            const browserTaskPromise = this.hb.agents.browserUse.startAndWait({
                task: taskDescription,
                sessionId: sessionId,
                maxSteps: 15, // Reduced steps for 10-20 second execution
                maxFailures: 3, // Minimal failures for speed
                useVision: true, // Enable vision for better form understanding
                validateOutput: false, // Disable validation for maximum speed
                keepBrowserOpen: false, // Close browser after task completion
                maxActionsPerStep: 3, // Limit actions per step for speed
                plannerInterval: 3, // Check progress very frequently
                maxInputTokens: 2500 // Reduce token limit for faster processing
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
