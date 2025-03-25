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

class DocumentService {
  constructor() {
    this.maxFileSizeMB = process.env.MAX_FILE_SIZE_MB || 10;
  }

  async generateDocument({
    requestId,
    header,
    content,
    footer,
    documentType,
    watermark,
    placeholders
  }) {
    try {
      logger.info(`Starting document generation for request ${requestId}`);

      // Validate and sanitize HTML
      const sanitizedContent = {
        header: await HTMLValidator.validateAndSanitize(header, 'header'),
        content: await HTMLValidator.validateAndSanitize(content, 'content'),
        footer: await HTMLValidator.validateAndSanitize(footer, 'footer')
      };

      // Replace placeholders
      const processedContent = this.replacePlaceholders({
        ...sanitizedContent,
        placeholders
      });

      let generatedFile;
      try {
        if (documentType === 'pdf') {
          logger.info(`Generating PDF for request ${requestId}`);
          generatedFile = await pdfService.generatePDF({
            ...processedContent,
            watermark,
            requestId
          });
        } else {
          logger.info(`Generating DOCX for request ${requestId}`);
          generatedFile = await docxService.generateDOCX({
            ...processedContent,
            watermark,
            requestId
          });
        }
      } catch (error) {
        logger.error(`Document rendering failed for ${requestId}:`, error);
        throw new RenderingError(`Failed to generate ${documentType.toUpperCase()}`, {
          documentType,
          error: error.message,
          details: error.stack
        });
      }

      // Check file size and compress if needed
      await this.handleFileSize(generatedFile);

      return {
        path: generatedFile.path,
        filename: `${requestId}.${documentType}`,
        mimeType: documentType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
    } catch (error) {
      logger.error(`Document generation failed for ${requestId}:`, error);
      throw error;
    }
  }

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

  replacePlaceholders({ header, content, footer, placeholders }) {
    if (!placeholders) {
      return { header, content, footer };
    }

    const replace = (text) => {
      let processed = text;
      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, value);
      });
      return processed;
    };

    return {
      header: replace(header),
      content: replace(content),
      footer: replace(footer)
    };
  }
}

module.exports = new DocumentService(); 