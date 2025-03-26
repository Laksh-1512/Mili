/**
 * Document Generation Service Test Suite
 * @module DocumentServiceTests
 * @description Integration and unit tests for document generation service
 */

const request = require('supertest');
const app = require('../src/server');
const documentService = require('../src/services/documentService');

/**
 * @constant {Object} sampleRequest - Test data for document generation
 */
const sampleRequest = {
  header: '<div>Test Header</div>',
  content: '<div>Test Content</div>',
  footer: '<div>Test Footer</div>',
  documentType: 'pdf'
};

describe('Document Generation Service Tests', () => {
  let server;

  /**
   * Setup test server before running tests
   * @function beforeAll
   */
  beforeAll((done) => {
    const PORT = process.env.TEST_PORT || 3001;
    server = app.listen(PORT, () => done());
  });

  /**
   * Cleanup after tests complete
   * @function afterAll
   */
  afterAll((done) => {
    if (server) server.close(done);
  });

  /**
   * API Integration Tests
   * Testing the HTTP endpoints
   */
  describe('API Endpoints', () => {
    // Test PDF generation endpoint
    it('should generate PDF document via API', async () => {
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          ...sampleRequest,
          documentType: 'pdf'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    // Test DOCX generation endpoint
    it('should generate DOCX document via API', async () => {
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          ...sampleRequest,
          documentType: 'docx'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    // Test input validation
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          content: '<div>Missing header and footer</div>'
        });

      expect(response.status).toBe(400);
    });

    // Test HTML sanitization
    it('should sanitize dangerous HTML', async () => {
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          ...sampleRequest,
          content: '<script>alert("xss")</script><div>Content</div>'
        });

      expect(response.status).toBe(400);
    });

    // Rate Limiting Tests
    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        // Make multiple requests quickly
        const requests = Array(6).fill(sampleRequest); // 6 requests (over our limit of 5)
        
        const responses = await Promise.all(
          requests.map(req => 
            request(app)
              .post('/api/v1/document')
              .send(req)
          )
        );

        // Check that some requests were rate limited
        const rateLimited = responses.filter(res => res.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);

        // Check rate limit response
        const limitedResponse = rateLimited[0];
        expect(limitedResponse.body).toHaveProperty('message');
        expect(limitedResponse.body.message).toMatch(/too many requests/i);
      });

      it('should include rate limit headers', async () => {
        const response = await request(app)
          .post('/api/v1/document')
          .send(sampleRequest);

        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      });
    });
  });

  /**
   * Service Unit Tests
   * Testing the document service directly
   */
  describe('Document Service', () => {
    // Test PDF generation service
    it('should generate PDF document', async () => {
      const result = await documentService.generateDocument({
        ...sampleRequest,
        documentType: 'pdf',
        requestId: 'test-123'
      });

      expect(result).toHaveProperty('path');
      expect(result.type).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('test-123.pdf');
    });

    // Test DOCX generation service
    it('should generate DOCX document', async () => {
      const result = await documentService.generateDocument({
        ...sampleRequest,
        documentType: 'docx',
        requestId: 'test-456'
      });

      expect(result).toHaveProperty('path');
      expect(result.type).toBe('docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.filename).toBe('test-456.docx');
    });

    // Test watermark functionality
    it('should add watermark to document', async () => {
      const result = await documentService.generateDocument({
        ...sampleRequest,
        watermark: {
          type: 'text',
          content: 'CONFIDENTIAL'
        },
        requestId: 'test-789'
      });

      expect(result).toHaveProperty('path');
    });
  });
});