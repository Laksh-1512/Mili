const { documentRequestSchema } = require('../models/documentRequest');
const { isBase64 } = require('../utils/helpers');
const { ValidationError } = require('../utils/errors');
const { logger } = require('../config/logger');
const HTMLValidator = require('../utils/htmlValidator');

const validateDocumentRequest = (req, res, next) => {
  try {
    // 1. Schema Validation
    const { error } = documentRequestSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { header, content, footer, watermark } = req.body;
    
    // 2. HTML Validation using HTMLValidator
    ['header', 'content', 'footer'].forEach(field => {
      const html = req.body[field];
      if (html) {
        HTMLValidator.validateAndSanitize(html, field);
      }
    });

    // 3. Watermark Validation
    if (watermark) {
      if (watermark.type === 'image' && !isBase64(watermark.content)) {
        throw new ValidationError('Watermark image must be a valid base64 string');
      }
      if (watermark.type === 'text' && watermark.content.length > 100) {
        throw new ValidationError('Watermark text must not exceed 100 characters');
      }
    }

    next();
  } catch (err) {
    logger.error('Validation error:', err);
    if (err instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    next(err);
  }
};

module.exports = {
  validateDocumentRequest
}; 