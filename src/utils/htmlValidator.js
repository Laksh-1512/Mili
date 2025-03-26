const { JSDOM } = require('jsdom');
const { ValidationError } = require('./errors');
const { logger } = require('../config/logger');

/**
 * HTML Validator and Sanitizer
 * Validates and sanitizes HTML content to prevent XSS and ensure safe rendering
 * @class HTMLValidator
 */
class HTMLValidator {
  /**
   * Validates and sanitizes HTML content
   * @static
   * @param {string} html - HTML content to validate
   * @param {string} [context='content'] - Context of the HTML (header/content/footer)
   * @returns {string} Sanitized HTML
   * @throws {ValidationError} When HTML contains dangerous elements
   */
  static validateAndSanitize(html, context = 'content') {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Check for potentially dangerous elements
      const scripts = document.getElementsByTagName('script');
      if (scripts.length > 0) {
        throw new ValidationError(`Script tags not allowed in ${context}`);
      }

      // Remove potentially dangerous attributes
      const elements = document.getElementsByTagName('*');
      for (const element of elements) {
        element.removeAttribute('onerror');
        element.removeAttribute('onclick');
        // Remove other dangerous attributes
      }

      // Log warnings for potentially problematic elements
      const iframes = document.getElementsByTagName('iframe');
      if (iframes.length > 0) {
        logger.warn(`Found ${iframes.length} iframe(s) in ${context}`);
      }

      return document.body.innerHTML;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error(`HTML validation failed for ${context}:`, error);
      throw new ValidationError(`Invalid HTML in ${context}`);
    }
  }
}

module.exports = HTMLValidator; 