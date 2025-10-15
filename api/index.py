def handler(request):
    """Ultra-minimal Vercel serverless function"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': '{"message": "Payment Provider Extractor API is working!", "status": "healthy", "version": "1.0.6"}'
    }