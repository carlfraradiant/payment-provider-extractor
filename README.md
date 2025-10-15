# 🛒 Payment Provider Checkout URL Extractor

An AI-powered web browsing agent that automatically navigates e-commerce websites, adds products to cart, and extracts checkout URLs to identify payment providers.

## ✨ Features

- **🤖 AI-Powered Navigation**: Uses Hyperbrowser AI to autonomously navigate e-commerce sites
- **🛍️ Smart Product Selection**: Automatically finds and adds products to cart
- **💳 Payment Provider Detection**: Identifies all available payment methods
- **📸 Screenshot Capture**: Provides live session URLs for visual verification
- **⏱️ Session Management**: Built-in timeout protection to prevent excessive credit usage
- **🌐 Web Interface**: Beautiful, real-time web interface for easy use
- **🔌 API Ready**: REST API endpoints for integration with other systems
- **📊 Real-time Progress**: Live streaming of analysis progress

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/payment-provider-extractor.git
cd payment-provider-extractor

# Install dependencies
python3 setup.py
```

### 2. Configuration

```bash
# Copy the config template
cp config.py.template config.py

# Edit config.py with your API keys
nano config.py
```

### 3. Usage

#### Web Interface (Recommended)
```bash
python3 start_web_interface.py
# Open http://localhost:5001 in your browser
```

#### Command Line Interface
```bash
# Single URL analysis
python3 main.py --url "https://example-shop.com" --detailed

# Interactive mode
python3 main.py
```

## 🔧 API Endpoints

### Web Interface
- `GET /` - Main web interface
- `POST /api/analyze` - Start website analysis
- `GET /api/session/<id>` - Get session status
- `GET /api/sessions` - List all sessions

### REST API (Coming Soon)
- `POST /api/v1/analyze` - Analyze single URL
- `POST /api/v1/batch-analyze` - Analyze multiple URLs
- `GET /api/v1/status/<id>` - Get analysis status
- `GET /api/v1/results/<id>` - Get analysis results

## 📋 Requirements

- Python 3.9+
- Hyperbrowser API key
- Internet connection

## 🛠️ Dependencies

- `hyperbrowser` - AI web browsing
- `flask` - Web framework
- `flask-socketio` - Real-time communication
- `python-dotenv` - Environment variables
- `Pillow` - Image processing

## 📸 Screenshots

The tool captures live session URLs that show the exact checkout page state, ensuring all JavaScript widgets and payment forms are fully rendered.

## ⏱️ Timeout Protection

Built-in 2-minute timeout with proper session management prevents excessive credit usage by automatically stopping Hyperbrowser sessions.

## 🔒 Security

- API keys are stored in local config files
- No sensitive data is logged or transmitted
- Session management ensures proper cleanup

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
# Build image
docker build -t payment-extractor .

# Run container
docker run -p 5001:5001 payment-extractor
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue for bugs or feature requests
- Check the documentation for common questions
- Join our community discussions

## 🔗 Links

- [Hyperbrowser Documentation](https://docs.hyperbrowser.ai/)
- [Live Demo](https://your-demo-url.vercel.app)
- [API Documentation](https://your-api-docs.vercel.app)

---

Made with ❤️ for e-commerce analysis