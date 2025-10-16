const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { CheckoutURLExtractor } = require('./checkoutAgent');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active sessions
const activeSessions = new Map();

// Web Progress Callback class
class WebProgressCallback {
    constructor(sessionId) {
        this.sessionId = sessionId;
    }

    call(message) {
        io.emit('progress_update', {
            session_id: this.sessionId,
            message: message,
            timestamp: new Date().toISOString()
        });
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

        // Start analysis in background
        setImmediate(async () => {
            try {
                // Log environment variables being used (for debugging)
                console.log("🔍 Vercel Runtime Environment Check:");
                console.log(`HYPERBROWSER_API_KEY (first 5 chars): ${process.env.HYPERBROWSER_API_KEY ? process.env.HYPERBROWSER_API_KEY.substring(0, 5) + '...' : 'NOT SET'}`);
                console.log(`OPENAI_API_KEY (first 5 chars): ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'NOT SET'}`);
                console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
                
                const extractor = new CheckoutURLExtractor(2); // 2 minute maximum timeout for safety, targeting 5-10 seconds
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
                    
                    io.emit('progress_update', {
                        session_id: sessionId,
                        message: message,
                        timestamp: new Date().toISOString()
                    });
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
                io.emit('analysis_complete', {
                    session_id: sessionId,
                    result: result
                });

            } catch (error) {
                // Update session with error
                const session = activeSessions.get(sessionId);
                if (session) {
                    session.status = 'error';
                    session.error = error.message;
                    session.end_time = new Date().toISOString();
                }

                // Emit error
                io.emit('analysis_error', {
                    session_id: sessionId,
                    error: error.message
                });
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🚀 Payment Provider Extractor running on port ${PORT}`);
        console.log(`📱 Web interface: http://localhost:${PORT}`);
        console.log(`🔧 API endpoints:`);
        console.log(`   POST /api/analyze - Start website analysis`);
        console.log(`   GET  /api/session/<id> - Get session status`);
        console.log(`   GET  /api/sessions - List all sessions`);
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /test - Test endpoint`);
    });
}

module.exports = { app, server, io };
