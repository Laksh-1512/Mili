const request = require('supertest');
const app = require('../../src/server');
const fs = require('fs').promises;
const path = require('path');

describe('Document Generation API', () => {
  const validRequest = {
    header: '<div>Header</div>',
    content: '<div>Content</div>',
    footer: '<div>Footer</div>',
    documentType: 'pdf',
    placeholders: {
      username: 'John Doe'
    }
  };

  describe('Input Validation', () => {
    it('should reject requests with script tags', async () => {
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          ...validRequest,
          content: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Script tags not allowed');
    });

    it('should handle large content gracefully', async () => {
      const largeContent = '<div>'.repeat(100000) + '</div>'.repeat(100000);
      const response = await request(app)
        .post('/api/v1/document')
        .send({
          ...validRequest,
          content: largeContent
        });

      expect(response.status).toBe(200);
      expect(response.body.downloadUrl).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should limit requests per IP', async () => {
      const requests = Array(25).fill(validRequest);
      const responses = await Promise.all(
        requests.map(() => 
          request(app)
            .post('/api/v1/document')
            .send(validRequest)
        )
      );

      const tooManyRequests = responses.filter(r => r.status === 429);
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering failures gracefully', async () => {
      // Mock PDF service to fail
      jest.spyOn(pdfService, 'generatePDF').mockRejectedValue(
        new Error('Rendering failed')
      );

      const response = await request(app)
        .post('/api/v1/document')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Failed to generate document');
    });

    it('should handle storage failures gracefully', async () => {
      // Mock storage service to fail
      jest.spyOn(storageService, 'uploadFile').mockRejectedValue(
        new Error('Upload failed')
      );

      const response = await request(app)
        .post('/api/v1/document')
        .send(validRequest);

      expect(response.status).toBe(503);
      expect(response.body.message).toContain('Storage service unavailable');
    });
  });
}); 