# 🛒 Payment Provider Checkout URL Extractor

AI-powered e-commerce analysis tool that automatically navigates through checkout processes to identify payment providers.

## 🚀 Features

- **Automated Checkout Navigation**: AI agent navigates through e-commerce websites
- **Payment Provider Detection**: Identifies all available payment methods
- **Real-time Progress Tracking**: Live updates via WebSocket connections
- **Screenshot Capture**: Live session URLs for visual verification
- **Timeout Protection**: 3.5-minute limit for French webshops with account creation
- **Modern Web Interface**: Beautiful, responsive UI with real-time updates

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Real-time**: Socket.io for WebSocket connections
- **AI Agent**: Hyperbrowser SDK for web automation
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Deployment**: Vercel (optimized for Node.js)

## 📋 Prerequisites

- Node.js 18+ 
- Hyperbrowser API key
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/carlfraradiant/payment-provider-extractor.git
cd payment-provider-extractor
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
cp env_template_nodejs.txt .env
```

Edit `.env` and add your API keys:
```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
NODE_ENV=development
PORT=3000
```

### 4. Run Locally
```bash
npm start
```

Visit `http://localhost:3000` to access the web interface.

## 🌐 Web Interface

The application provides a modern web interface where you can:

1. **Enter Website URL**: Input any e-commerce website URL
2. **Start Analysis**: Click "Start Analysis" to begin the process
3. **Real-time Progress**: Watch live updates as the AI navigates the site
4. **View Results**: See checkout URL, payment providers, and screenshots

## 🔧 API Endpoints

- `GET /` - Web interface
- `POST /api/analyze` - Start website analysis
- `GET /api/session/<id>` - Get session status
- `GET /api/sessions` - List all sessions
- `GET /health` - Health check
- `GET /test` - Test endpoint

## 📸 Screenshot Feature

The tool captures live session URLs that allow you to:
- View the current state of the checkout page
- See all JavaScript widgets fully rendered
- Identify payment providers visually
- Take manual screenshots if needed

## ⏱️ Timeout Protection

- **3.5-minute limit**: Enhanced for French webshops with account creation
- **Automatic session cleanup**: Stops Hyperbrowser sessions on timeout
- **Credit protection**: Ensures you don't exceed your API limits

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**: Import your GitHub repository
2. **Set Environment Variables**:
   - `HYPERBROWSER_API_KEY`
   - `NODE_ENV=production`
3. **Deploy**: Vercel automatically detects Node.js and deploys

### Manual Deployment

```bash
# Build (no build step required)
npm run build

# Start production server
npm start
```

## 🔍 How It Works

1. **Cookie Acceptance**: Automatically accepts cookie consent dialogs
2. **Product Discovery**: Navigates through the website to find products
3. **Add to Cart**: Selects and adds a product to the shopping cart
4. **Cart Navigation**: Explicitly clicks cart button to go to cart page
5. **Checkout Process**: Clicks checkout button to reach final checkout page
6. **Data Extraction**: Extracts checkout URL and identifies payment providers
7. **Screenshot Capture**: Provides live session URL for visual verification

## 🛡️ Error Handling

- **Robust Error Recovery**: Handles popups, modals, and navigation issues
- **Session Management**: Proper cleanup of browser sessions
- **Timeout Protection**: Prevents runaway processes
- **User Feedback**: Clear error messages and progress updates

## 📊 Example Output

```json
{
  "checkout_url": "https://shop.example.com/checkout",
  "payment_providers": ["PayPal", "Stripe", "Apple Pay"],
  "product_added": "Blue T-Shirt - Size M",
  "website_name": "Example Shop",
  "screenshot": {
    "live_url": "https://hyperbrowser.ai/session/abc123",
    "status": "live_url_available"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: Check the code comments for detailed explanations
- **API Docs**: [Hyperbrowser Documentation](https://docs.hyperbrowser.ai/)

## 🎯 Version History

- **v2.0.0**: Complete migration to Node.js + Vercel
- **v1.0.0**: Original Python + Flask version

---

**Built with ❤️ using Node.js, Express, Socket.io, and Hyperbrowser**