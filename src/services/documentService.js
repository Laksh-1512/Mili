const pdfService = require('./pdfService');
const docxService = require('./docxService');
const watermarkService = require('./watermarkService');
const { logger } = require('../config/logger');
const HTMLValidator = require('../utils/htmlValidator');
const { RenderingError } = require('../utils/errors');
const zlib = require('zlib');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const gzip = promisify(zlib.gzip);

/**
 * Document Service
 * Handles the generation of PDF and DOCX documents with support for watermarks and placeholders.
 * @class DocumentService
 */
class DocumentService {
  /**
   * Creates an instance of DocumentService.
   * @constructor
   * @memberof DocumentService
   */
  constructor() {
    this.maxFileSizeMB = process.env.MAX_FILE_SIZE_MB || 10;
  }

  /**
   * Generates a document based on the provided parameters
   * @async
   * @param {Object} params - The parameters for document generation
   * @param {string} params.requestId - Unique identifier for the request
   * @param {string} params.header - HTML content for the header
   * @param {string} params.content - Main HTML content
   * @param {string} params.footer - HTML content for the footer
   * @param {('pdf'|'docx')} params.documentType - Type of document to generate
   * @param {Object} [params.watermark] - Optional watermark configuration
   * @param {Object} [params.placeholders] - Optional placeholder replacements
   * @returns {Promise<Object>} Generated document information
   * @throws {RenderingError} When document generation fails
   */
  async generateDocument({ requestId, header, content, footer, documentType, watermark, placeholders }) {
    try {
      // Validate HTML content
      const validatedHeader = HTMLValidator.validateAndSanitize(header, 'header');
      const validatedContent = HTMLValidator.validateAndSanitize(content, 'content');
      const validatedFooter = HTMLValidator.validateAndSanitize(footer, 'footer');

      // Replace placeholders if provided
      const processedContent = placeholders ? 
        this.replacePlaceholders({ header: validatedHeader, content: validatedContent, footer: validatedFooter }, placeholders) :
        { header: validatedHeader, content: validatedContent, footer: validatedFooter };

      // Generate document based on type
      let result;
      if (documentType === 'pdf') {
        result = await pdfService.generatePDF({
          ...processedContent,
          watermark,
          requestId
        });
      } else {
        result = await docxService.generateDOCX({
          ...processedContent,
          watermark,
          requestId
        });
      }

      // Add type and mime type to result
      return {
        ...result,
        type: documentType,
        mimeType: documentType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: `${requestId}.${documentType}`
      };

    } catch (error) {
      logger.error(`Document rendering failed for ${requestId}:`, error);
      throw new RenderingError(`Failed to generate ${documentType.toUpperCase()}`, {
        documentType,
        error: error.message,
        details: error.stack
      });
    }
  }

  /**
   * Handles file size checks and compression if needed
   * @async
   * @param {Object} file - File object to process
   * @throws {Error} When file processing fails
   */
  async handleFileSize(file) {
    const stats = await fs.stat(file.path);
    const fileSizeMB = stats.size / (1024 * 1024); // convert bytes to MB

    if (fileSizeMB > this.maxFileSizeMB) {
      logger.warn(`File size ${fileSizeMB}MB exceeds limit, compressing...`);
      const content = await fs.readFile(file.path);
      const compressed = await gzip(content);
      await fs.writeFile(file.path, compressed);
      
      const newStats = await fs.stat(file.path);
      logger.info(`Compressed file size: ${newStats.size / (1024 * 1024)}MB`);
    }
  }

  /**
   * Replaces placeholders in content with provided values
   * @param {Object} content - Content containing placeholders
   * @param {Object} placeholders - Key-value pairs for replacement
   * @returns {Object} Content with replaced placeholders
   */
  replacePlaceholders(content, placeholders) {
    const replace = (text) => {
      return Object.entries(placeholders).reduce((acc, [key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        return acc.replace(regex, value);
      }, text);
    };

    return {
      header: replace(content.header),
      content: replace(content.content),
      footer: replace(content.footer)
    };
  }
}

module.exports = new DocumentService(); 