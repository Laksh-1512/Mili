const docx = require('docx');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../config/logger');
const watermarkService = require('./watermarkService');

class DOCXService {
  constructor() {
    this.tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
    fs.mkdir(this.tempDir, { recursive: true })
      .catch(err => logger.error('Failed to create temp directory:', err));
  }

  async generateDOCX({ header, content, footer, watermark, requestId }) {
    try {
      logger.info(`Starting DOCX generation for request ${requestId}`);
      
      const sections = [{
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        headers: {
          default: new docx.Header({
            children: [this.convertHtmlToParagraphs(header)]
          })
        },
        footers: {
          default: new docx.Footer({
            children: [this.convertHtmlToParagraphs(footer)]
          })
        },
        children: [
          this.convertHtmlToParagraphs(content)
        ]
      }];

      const doc = new docx.Document({
        sections: sections
      });

      // Add watermark if provided
      if (watermark) {
        await watermarkService.addWatermarkToDOCX(doc, watermark);
      }

      const outputPath = path.join(this.tempDir, `${requestId}.docx`);
      const buffer = await docx.Packer.toBuffer(doc);
      await fs.writeFile(outputPath, buffer);

      logger.info(`DOCX file generated successfully at ${outputPath}`);

      return {
        path: outputPath,
        type: 'docx'
      };

    } catch (error) {
      logger.error(`DOCX generation failed for request ${requestId}:`, error);
      throw error;
    }
  }

  convertHtmlToParagraphs(html) {
    // Basic HTML to DOCX conversion
    const cleanText = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: cleanText
        })
      ]
    });
  }
}

module.exports = new DOCXService();