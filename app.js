const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { CheckoutURLExtractor } = require('./checkoutAgent');
const { PaymentURLExtractorV2 } = require('./paymentAgentV2'); // Updated to use HyperAgent version
const { FranceShopifyCheckoutExtractor } = require('./franceShopifyAgent');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS (only for local development)
let io = null;
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    const socketIo = require('socket.io');
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active sessions
const activeSessions = new Map();

// Helper: schedule a hard timeout for session records to stop endless polling
function scheduleSessionTimeout(sessionId, minutes = 5, slackMs = 2000) {
    const timeoutMs = Math.round(minutes * 60 * 1000 + slackMs);
    setTimeout(() => {
        const session = activeSessions.get(sessionId);
        if (!session) return;
        // If still not terminal, mark as error/timeout so clients stop polling
        const isTerminal = session.status === 'completed' || session.status === 'error';
        if (!isTerminal) {
            session.status = 'error';
            session.error = `Timed out after ${minutes} minutes`;
            session.end_time = new Date().toISOString();
            session.progress = session.progress || [];
            session.progress.push({
                message: `🛑 Server timeout: stopped polling after ${minutes} minutes`,
                timestamp: session.end_time
            });
            if (io) {
                io.emit('analysis_error', { session_id: sessionId, error: session.error });
            }
        }
    }, timeoutMs);
}

// Web Progress Callback class
class WebProgressCallback {
    constructor(sessionId) {
        this.sessionId = sessionId;
    }

    call(message) {
        if (io) {
            io.emit('progress_update', {
                session_id: this.sessionId,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Documentation page
app.get('/api', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

// Payment URL Finder page
app.get('/paymenturlfinder', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'paymenturlfinder.html'));
});

// French Shopify GET endpoint: GET /api/france/shopify/:encoded_url
app.get('/api/france/shopify/:encoded_url(*)', async (req, res) => {
    try {
        const encodedUrl = req.params.encoded_url;
        
        if (!encodedUrl || !encodedUrl.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Decode the URL
        const websiteUrl = decodeURIComponent(encodedUrl);
        
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            return res.status(400).json({ error: 'URL must start with http:// or https://' });
        }

        const sessionId = uuidv4();

        // Store session info
        activeSessions.set(sessionId, {
            url: websiteUrl,
            status: 'starting',
            start_time: new Date().toISOString(),
            progress: []
        });

        console.log(`🇫🇷 Starting French Shopify checkout extraction for: ${websiteUrl}`);

        // Start the extraction process
        const extractor = new FranceShopifyCheckoutExtractor(4); // 4 minutes timeout
        
        // Schedule session timeout
        scheduleSessionTimeout(sessionId, 4); // 4 minutes timeout

        try {
            const result = await extractor.extractCheckoutURLWithStreaming(websiteUrl, (message) => {
                // Update progress
                if (activeSessions.has(sessionId)) {
                    activeSessions.get(sessionId).progress.push({
                        message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Emit progress via Socket.IO if available
                if (io) {
                    io.emit('analysis_progress', { session_id: sessionId, message });
                }
            });

            // Update session status
            if (activeSessions.has(sessionId)) {
                activeSessions.get(sessionId).status = 'completed';
                activeSessions.get(sessionId).end_time = new Date().toISOString();
            }

            // Emit completion via Socket.IO if available
            if (io) {
                io.emit('analysis_complete', { session_id: sessionId, result });
            }

            // Return success response
            res.json({
                session_id: sessionId,
                status: 'completed',
                message: 'French Shopify checkout extraction completed',
                url: websiteUrl,
                start_time: activeSessions.get(sessionId)?.start_time,
                end_time: activeSessions.get(sessionId)?.end_time,
                result: result
            });

        } catch (error) {
            console.error('Error in French Shopify checkout extraction:', error);
            
            const endTime = new Date().toISOString();
            
            if (activeSessions.has(sessionId)) {
                activeSessions.get(sessionId).status = 'error';
                activeSessions.get(sessionId).end_time = endTime;
            }
            
            const errorMessage = `Error: ${error.message}`;
            if (activeSessions.get(sessionId)) {
                activeSessions.get(sessionId).progress.push({
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (io) {
                io.emit('analysis_error', { session_id: sessionId, error: error.message });
            }

            // Return error response
            res.status(500).json({
                session_id: sessionId,
                status: 'error',
                message: 'French Shopify checkout extraction failed',
                url: websiteUrl,
                start_time: activeSessions.get(sessionId)?.start_time,
                end_time: endTime,
                error: error.message,
                progress: activeSessions.get(sessionId)?.progress || []
            });
        }

    } catch (error) {
        console.error('Error in French Shopify GET endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// French Shopify page
app.get('/france-shopify', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'france-shopify.html'));
});


app.post('/api/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const sessionId = uuidv4();
        const websiteUrl = url.trim();

        // Store session info
        activeSessions.set(sessionId, {
            url: websiteUrl,
            status: 'starting',
            start_time: new Date().toISOString(),
            progress: [],
            result: null
        });

        // Ensure polling callers stop after hard timeout
        scheduleSessionTimeout(sessionId, 5, 2000);

        // Start analysis in background
        setImmediate(async () => {
            try {
                // Log environment variables being used (for debugging)
                console.log("🔍 Vercel Runtime Environment Check:");
                console.log(`HYPERBROWSER_API_KEY (first 5 chars): ${process.env.HYPERBROWSER_API_KEY ? process.env.HYPERBROWSER_API_KEY.substring(0, 5) + '...' : 'NOT SET'}`);
                console.log(`OPENAI_API_KEY (first 5 chars): ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'NOT SET'}`);
                console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
                
                const extractor = new CheckoutURLExtractor(5); // 5 minute maximum timeout for French webshops with account creation
                console.log("✅ CheckoutURLExtractor initialized successfully");
                const progressCallback = new WebProgressCallback(sessionId);
                
                // Override the call method to emit to Socket.IO
                progressCallback.call = (message) => {
                    const session = activeSessions.get(sessionId);
                    if (session) {
                        session.progress.push({
                            message: message,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    if (io) {
                        io.emit('progress_update', {
                            session_id: sessionId,
                            message: message,
                            timestamp: new Date().toISOString()
                        });
                    }
                };

                const result = await extractor.extractCheckoutURLWithStreaming(
                    websiteUrl, 
                    progressCallback.call.bind(progressCallback)
                );

                // Update session with result
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.result = result;
                    session.status = 'completed';
                    session.end_time = new Date().toISOString();
                }

                // Emit final result
                if (io) {
                    io.emit('analysis_complete', {
                        session_id: sessionId,
                        result: result
                    });
                }

            } catch (error) {
                // Update session with error
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.status = 'error';
                    session.error = error.message;
                    session.end_time = new Date().toISOString();
                }

                // Emit error
                if (io) {
                    io.emit('analysis_error', {
                        session_id: sessionId,
                        error: error.message
                    });
                }
            }
        });

        res.json({
            session_id: sessionId,
            status: 'started',
            message: 'Analysis started successfully'
        });

    } catch (error) {
        console.error('Error starting analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/session/:id', (req, res) => {
    const sessionId = req.params.id;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
});

app.get('/api/sessions', (req, res) => {
    const sessions = Object.fromEntries(activeSessions);
    res.json(sessions);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Payment Provider Extractor is running on Node.js + Vercel',
        version: '2.0.0',
        platform: 'nodejs-vercel',
        timestamp: new Date().toISOString()
    });
});

app.get('/test', (req, res) => {
    res.json({
        message: 'Test endpoint working on Node.js + Vercel!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Socket.IO connection handling (only for local development)
if (io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Payment extraction API endpoint: POST /api/payment/extract
app.post('/api/payment/extract', async (req, res) => {
    try {
        const { checkout_url, detailed } = req.body;
        
        if (!checkout_url || !checkout_url.trim()) {
            return res.status(400).json({ error: 'Checkout URL is required' });
        }

        const sessionId = uuidv4();
        const websiteUrl = checkout_url.trim();

        // Store session info
        activeSessions.set(sessionId, {
            url: websiteUrl,
            status: 'starting',
            start_time: new Date().toISOString(),
            progress: [],
            result: null
        });

        // Ensure polling callers stop after hard timeout
        scheduleSessionTimeout(sessionId, 5, 2000);

        // Start analysis in background
        setImmediate(async () => {
            try {
                console.log(`🚀 Starting payment extraction for: ${websiteUrl}`);
                
                const extractor = new PaymentURLExtractorV2(5); // 5 minute maximum timeout for French webshops with account creation
                console.log("✅ PaymentURLExtractorV2 initialized successfully");
                
                const progressCallback = new WebProgressCallback(sessionId);
                
                // Override the call method to emit to Socket.IO (if available)
                progressCallback.call = (message) => {
                    const session = activeSessions.get(sessionId);
                    if (session) {
                        session.progress.push({
                            message: message,
                            timestamp: new Date().toISOString()
                        });
                    }
                    if (io) {
                        io.emit('progress_update', {
                            session_id: sessionId,
                            message: message,
                            timestamp: new Date().toISOString()
                        });
                    }
                };

                progressCallback.call(`Starting payment gateway extraction for: ${websiteUrl}`);
                const result = await extractor.extractPaymentURLWithStreaming(websiteUrl, progressCallback.call.bind(progressCallback));
                
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.result = result;
                    session.status = 'completed';
                    session.end_time = new Date().toISOString();
                }
                progressCallback.call("Payment gateway extraction completed successfully!");
                
                if (io) {
                    io.emit('analysis_complete', { session_id: sessionId, result: result });
                }

            } catch (error) {
                console.error(`Error during payment extraction for session ${sessionId}:`, error);
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.status = 'error';
                    session.error = error.message;
                    session.end_time = new Date().toISOString();
                }
                const errorMessage = `Error: ${error.message}`;
                if (activeSessions.get(sessionId)) {
                    activeSessions.get(sessionId).progress.push({
                        message: errorMessage,
                        timestamp: new Date().toISOString()
                    });
                }
                if (io) {
                    io.emit('analysis_error', { session_id: sessionId, error: error.message });
                }
            }
        });

        res.json({
            session_id: sessionId,
            status: 'started',
            message: 'Payment gateway extraction started successfully'
        });

    } catch (error) {
        console.error('Error starting payment extraction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Payment session status endpoint: GET /api/payment/session/:id
app.get('/api/payment/session/:id', (req, res) => {
    const sessionId = req.params.id;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
});

// Direct Payment API endpoint: GET /api/payment/:encoded_url (SYNCHRONOUS)
app.get('/api/payment/:encoded_url(*)', async (req, res) => {
    try {
        const { encoded_url } = req.params;
        
        if (!encoded_url || !encoded_url.trim()) {
            return res.status(400).json({ error: 'Checkout URL is required' });
        }

        // Decode the URL parameter
        const checkoutUrl = decodeURIComponent(encoded_url.trim());
        
        // Validate URL format
        try {
            new URL(checkoutUrl);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const sessionId = uuidv4();
        const startTime = new Date().toISOString();

        // Store session info
        activeSessions.set(sessionId, {
            url: checkoutUrl,
            status: 'running',
            start_time: startTime,
            progress: [],
            result: null
        });

        console.log(`🚀 Starting SYNCHRONOUS payment extraction for: ${checkoutUrl}`);
        
        try {
            const extractor = new PaymentURLExtractorV2(5); // 5 minute maximum timeout for French webshops with account creation
            console.log("✅ PaymentURLExtractorV2 initialized successfully");
            
            const progressCallback = new WebProgressCallback(sessionId);
            
            // Override the call method to store progress
            progressCallback.call = (message) => {
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.progress.push({
                        message: message,
                        timestamp: new Date().toISOString()
                    });
                }
                if (io) {
                    io.emit('progress_update', {
                        session_id: sessionId,
                        message: message,
                        timestamp: new Date().toISOString()
                    });
                }
            };

            progressCallback.call(`Starting payment gateway extraction for: ${checkoutUrl}`);
            
            // SYNCHRONOUS EXECUTION - Wait for completion
            const result = await extractor.extractPaymentURLWithStreaming(checkoutUrl, progressCallback.call.bind(progressCallback));
            
            const endTime = new Date().toISOString();
            
            // Update session with results
            const session = activeSessions.get(sessionId);
            if (session) {
                session.result = result;
                session.status = 'completed';
                session.end_time = endTime;
            }
            
            progressCallback.call("Payment gateway extraction completed successfully!");
            
            if (io) {
                io.emit('analysis_complete', { session_id: sessionId, result: result });
            }

            // Return complete results immediately
            res.json({
                session_id: sessionId,
                status: 'completed',
                message: 'Payment gateway extraction completed successfully',
                checkout_url: checkoutUrl,
                start_time: startTime,
                end_time: endTime,
                duration_seconds: Math.round((new Date(endTime) - new Date(startTime)) / 1000),
                result: result,
                progress: session ? session.progress : []
            });

        } catch (error) {
            console.error(`Error during payment extraction for session ${sessionId}:`, error);
            const endTime = new Date().toISOString();
            
            const session = activeSessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.error = error.message;
                session.end_time = endTime;
            }
            
            const errorMessage = `Error: ${error.message}`;
            if (activeSessions.get(sessionId)) {
                activeSessions.get(sessionId).progress.push({
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (io) {
                io.emit('analysis_error', { session_id: sessionId, error: error.message });
            }

            // Return error response
            res.status(500).json({
                session_id: sessionId,
                status: 'error',
                message: 'Payment gateway extraction failed',
                checkout_url: checkoutUrl,
                start_time: startTime,
                end_time: endTime,
                error: error.message,
                progress: session ? session.progress : []
            });
        }

    } catch (error) {
        console.error('Error in direct payment API endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Direct API endpoint: GET /api/url/:encoded_url (SYNCHRONOUS)
app.get('/api/url/:encoded_url(*)', async (req, res) => {
    try {
        const { encoded_url } = req.params;
        
        if (!encoded_url || !encoded_url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Decode the URL parameter
        const websiteUrl = decodeURIComponent(encoded_url.trim());
        
        // Validate URL format
        try {
            new URL(websiteUrl);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const sessionId = uuidv4();
        const startTime = new Date().toISOString();

        // Store session info
        activeSessions.set(sessionId, {
            url: websiteUrl,
            status: 'running',
            start_time: startTime,
            progress: [],
            result: null
        });

        console.log(`🚀 Starting SYNCHRONOUS direct API analysis for: ${websiteUrl}`);
        
        try {
            const extractor = new CheckoutURLExtractor(5); // 5 minute maximum timeout for French webshops with account creation
            console.log("✅ CheckoutURLExtractor initialized successfully");
            
            const progressCallback = new WebProgressCallback(sessionId);
            
            // Override the call method to store progress
            progressCallback.call = (message) => {
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.progress.push({
                        message: message,
                        timestamp: new Date().toISOString()
                    });
                }
                if (io) {
                    io.emit('progress_update', {
                        session_id: sessionId,
                        message: message,
                        timestamp: new Date().toISOString()
                    });
                }
            };

            progressCallback.call(`Starting analysis for: ${websiteUrl}`);
            
            // SYNCHRONOUS EXECUTION - Wait for completion
            const result = await extractor.extractCheckoutURLWithStreaming(websiteUrl, progressCallback.call.bind(progressCallback));
            
            const endTime = new Date().toISOString();
            
            // Update session with results
            const session = activeSessions.get(sessionId);
            if (session) {
                session.result = result;
                session.status = 'completed';
                session.end_time = endTime;
            }
            
            progressCallback.call("Analysis completed successfully!");
            
            if (io) {
                io.emit('analysis_complete', { session_id: sessionId, result: result });
            }

            // Return complete results immediately
            res.json({
                session_id: sessionId,
                status: 'completed',
                message: 'Analysis completed successfully',
                url: websiteUrl,
                start_time: startTime,
                end_time: endTime,
                duration_seconds: Math.round((new Date(endTime) - new Date(startTime)) / 1000),
                result: result,
                progress: session ? session.progress : []
            });

        } catch (error) {
            console.error(`Error during direct API analysis for session ${sessionId}:`, error);
            const endTime = new Date().toISOString();
            
            const session = activeSessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.error = error.message;
                session.end_time = endTime;
            }
            
            const errorMessage = `Error: ${error.message}`;
            if (activeSessions.get(sessionId)) {
                activeSessions.get(sessionId).progress.push({
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (io) {
                io.emit('analysis_error', { session_id: sessionId, error: error.message });
            }

            // Return error response
            res.status(500).json({
                session_id: sessionId,
                status: 'error',
                message: 'Analysis failed',
                url: websiteUrl,
                start_time: startTime,
                end_time: endTime,
                error: error.message,
                progress: session ? session.progress : []
            });
        }

    } catch (error) {
        console.error('Error in direct API endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// French Shopify checkout extraction API endpoint: POST /api/france/shopify/analyze
app.post('/api/france/shopify/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const sessionId = uuidv4();
        const websiteUrl = url.trim();

        // Store session info
        activeSessions.set(sessionId, {
            url: websiteUrl,
            status: 'starting',
            start_time: new Date().toISOString(),
            progress: [],
            result: null
        });

        // Ensure polling callers stop after hard timeout
        scheduleSessionTimeout(sessionId, 4, 2000);

        // Start analysis in background
        setImmediate(async () => {
            try {
                console.log(`🇫🇷 Starting French Shopify checkout extraction for: ${websiteUrl}`);
                
                const extractor = new FranceShopifyCheckoutExtractor(4); // 4 minute timeout for Shopify
                
                const result = await extractor.extractCheckoutURLWithStreaming(websiteUrl, (message) => {
                    const session = activeSessions.get(sessionId);
                    if (session) {
                        session.progress.push({
                            message,
                            timestamp: new Date().toISOString()
                        });
                        
                        if (io) {
                            io.emit('analysis_progress', { session_id: sessionId, message });
                        }
                    }
                });

                // Update session with result
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.status = 'completed';
                    session.result = result;
                    session.end_time = new Date().toISOString();
                    session.progress.push({
                        message: '✅ French Shopify checkout extraction completed!',
                        timestamp: new Date().toISOString()
                    });
                }
                
                if (io) {
                    io.emit('analysis_complete', { session_id: sessionId, result });
                }

            } catch (error) {
                console.error('Error in French Shopify checkout extraction:', error);
                
                const session = activeSessions.get(sessionId);
                const startTime = session ? session.start_time : new Date().toISOString();
                const endTime = new Date().toISOString();
                
                if (session) {
                    session.status = 'error';
                    session.error = error.message;
                    session.end_time = endTime;
                    const errorMessage = `❌ French Shopify checkout extraction failed: ${error.message}`;
                    session.progress.push({
                        message: errorMessage,
                        timestamp: new Date().toISOString()
                    });
                }
                
                if (io) {
                    io.emit('analysis_error', { session_id: sessionId, error: error.message });
                }
            }
        });

        // Return session ID immediately
        res.json({
            session_id: sessionId,
            status: 'started',
            message: 'French Shopify checkout extraction started',
            url: websiteUrl,
            start_time: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error starting French Shopify checkout extraction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Vercel serverless function export
module.exports = app;

// Start server locally (for development)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🚀 Payment Provider Extractor running on port ${PORT}`);
        console.log(`📱 Web interface: http://localhost:${PORT}`);
        console.log(`🔧 API endpoints:`);
        console.log(`   POST /api/analyze - Start website analysis`);
        console.log(`   POST /api/france/shopify/analyze - French Shopify checkout extraction`);
        console.log(`   GET  /api/session/<id> - Get session status`);
        console.log(`   GET  /api/sessions - List all sessions`);
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /test - Test endpoint`);
    });
}
