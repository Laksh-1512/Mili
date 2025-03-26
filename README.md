# Document Generation Service For Wealth Advisors 🚀

A powerful, production-ready microservice that transforms HTML content into professional PDF and DOCX documents. Built for scale, security, and reliability.

## Why Choose Our Service?

### Core Features
- **Dynamic Document Generation**
  - Convert HTML to PDF/DOCX with pixel-perfect accuracy
  - Smart template system with placeholder support (`{{variable}}`)
  - Professional headers and footers with auto page numbering
  - Intelligent page breaks and section handling

- **Enterprise-Grade Security**
  - Advanced HTML sanitization (powered by JSDOM)
  - Rate limiting protection (express-rate-limit)
  - Input validation with Joi schemas
  - Comprehensive error handling

- **Professional Formatting**
  - Table support with proper styling
  - List formatting with bullets and numbering
  - Custom fonts and styling
  - Responsive layouts that work across devices

### 🌟 Advanced Features

#### Document Enhancement
- **Watermark Support**
  - Text watermarks with custom opacity
  - Image watermarks (supports base64)
  - Multi-page watermark application
  - Configurable positioning

#### Storage & Performance
- **Smart File Handling**
  - Automatic file compression for large documents
  - S3 bucket integration for scalable storage
  - Local temp file management
  - Configurable file size limits

#### Monitoring & Debugging
- **Comprehensive Logging**
  - Request/Response logging (Morgan)
  - Error tracking with stack traces (Winston)
  - Performance metrics
  - Local log files for easy debugging

## 🛠️ Technical Stack

- **Core Framework**: Express.js
- **PDF Generation**: Puppeteer (Chrome headless)
- **DOCX Generation**: docx library
- **HTML Processing**: JSDOM
- **Validation**: Joi
- **Storage**: AWS S3
- **Logging**: Winston & Morgan
- **Testing**: Jest & Supertest
- **Security**: express-rate-limit, helmet


## 🔍 Testing & Quality Assurance

### Comprehensive Test Suite
- Unit Tests
- Integration Tests
- API Tests
- Rate Limit Tests
- Error Handling Tests
- Security Tests

## 📊 Monitoring & Debugging

### Log Files
- `logs/error.log`: Error tracking
- `logs/combined.log`: All application logs
- `logs/access.log`: HTTP request logs



## 🚀 Quick Start

### Installation

- Clone the repository
  - git clone https://github.com/yourusername/document-service.git
- Install dependencies
  - npm install
- Setup environment
  - cp .env.example .env


### Configuration

- Server
  - PORT=3000
  - NODE_ENV=development
- Rate Limiting
  - RATE_LIMIT_WINDOW_MS=60000
  - RATE_LIMIT_MAX_REQUESTS=20
- File Handling
  - MAX_FILE_SIZE_MB=10
  - TEMP_FILES_PATH=./temp
- AWS (Optional)
  - AWS_REGION=us-east-1
  - AWS_BUCKET_NAME=your-bucket
  - AWS_ACCESS_KEY_ID=your-key
  - AWS_SECRET_ACCESS_KEY=your-secret


### Running the Service
Development mode with hot reload
npm run dev
Production mode
npm start
Run tests
npm test

## 📚 API Documentation

### Health Check

### Generate Document
-GET /api/health

Response

```json
{
"status": "ok"
}`
```

### Generate Document

`POST /api/v1/document
Content-Type: application/json
Body:

```json
{
"header": "<div>{{company}} - Confidential</div>",
"content": "<div>Dear {{name}},\n{{content}}</div>",
"footer": "<div>Page {{page}} of {{total}}</div>",
"documentType": "pdf",
"watermark": {
"type": "text",
"content": "CONFIDENTIAL"
},
"placeholders": {
"company": "ACME Corp",
"name": "John Doe",
"content": "Your custom content here"
}
}`
```

Response:

Status: 200 OK
Content-Type: application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="document.pdf"

##### Bad Request
```json
{
  "status": "error",
  "message": "Invalid request parameters",
  "details": {
    "field": "error description"
  }
}
```

This API documentation:
1. Covers all endpoints
2. Shows request/response formats
3. Lists all parameters
4. Includes error responses
5. Shows rate limiting details
6. Provides usage examples
7. Includes important notes

Let me know if you need any clarification or additional details!