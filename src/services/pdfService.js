/**
 * PDF Generation Service
 * @module PDFService
 * @description Handles PDF document generation with support for headers, footers, and watermarks
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../config/logger');
const watermarkService = require('./watermarkService');

/**
 * PDF Service Class
 * @class PDFService
 * @description Manages PDF document generation and formatting
 */
class PDFService {
  /**
   * Creates an instance of PDFService
   * @constructor
   * @throws {Error} If temp directory creation fails
   */
  constructor() {
    // Ensure temp directory exists
    this.tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
    fs.mkdir(this.tempDir, { recursive: true })
      .catch(err => logger.error('Failed to create temp directory:', err));
  }

  /**
   * Generates a PDF document with the provided content
   * @async
   * @param {Object} params - Parameters for PDF generation
   * @param {string} params.header - HTML content for header
   * @param {string} params.content - Main HTML content
   * @param {string} params.footer - HTML content for footer
   * @param {Object} [params.watermark] - Optional watermark configuration
   * @param {string} params.requestId - Unique request identifier
   * @param {Object} [params.options={}] - Additional PDF options
   * @returns {Promise<Object>} Generated PDF file information
   * @throws {Error} If PDF generation fails
   */
  async generatePDF({ header, content, footer, watermark, requestId, options = {} }) {
    let browser = null;
    try {
      logger.info(`Starting PDF generation for request ${requestId}`);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 794,  // A4 width at 96 DPI
        height: 1123, // A4 height at 96 DPI
        deviceScaleFactor: 2
      });

      // Generate HTML with proper page breaks
      const html = this.generateHTML({
        header,
        content,
        footer,
        options
      });

      logger.info(`Setting page content for request ${requestId}`);
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Add watermark if provided
      if (watermark) {
        logger.info(`Adding watermark for request ${requestId}`);
        await watermarkService.addWatermarkToPDF(page, watermark);
      }

      // Generate PDF
      const outputPath = path.join(this.tempDir, `${requestId}.pdf`);
      logger.info(`Generating PDF at ${outputPath}`);
      
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        margin: {
          top: '80px',
          bottom: '80px',
          left: '40px',
          right: '40px'
        },
        headerTemplate: this.getHeaderTemplate(header),
        footerTemplate: this.getFooterTemplate(footer)
      });

      logger.info(`PDF generated successfully at ${outputPath}`);

      return {
        path: outputPath,
        type: 'pdf'
      };

    } catch (error) {
      logger.error(`PDF generation failed for ${requestId}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generates HTML template for PDF content
   * @private
   * @param {Object} params - HTML generation parameters
   * @param {string} params.header - Header HTML
   * @param {string} params.content - Main content HTML
   * @param {string} params.footer - Footer HTML
   * @param {Object} params.options - Additional styling options
   * @returns {string} Complete HTML template
   */
  generateHTML({ header, content, footer, options }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 80px 40px;
              font-family: Arial, sans-serif;
              line-height: 1.5;
            }
            /* Page break controls */
            .page-break {
              page-break-before: always;
              display: block;
              height: 0;
              margin-top: 80px; /* Add space for header */
              margin-bottom: 80px; /* Add space for footer */
            }
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            /* Content wrapper */
            .content {
              position: relative;
              padding-top: 20px; /* Space after header */
              padding-bottom: 20px; /* Space before footer */
            }
            /* Table styles */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
            }
            /* Header/Footer styles */
            .header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 60px;
              padding: 10px 40px;
              background: white;
              border-bottom: 1px solid #eee;
              z-index: 1000;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 60px;
              padding: 10px 40px;
              background: white;
              border-top: 1px solid #eee;
              text-align: center;
              z-index: 1000;
            }
            /* Content sections */
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              color: #333;
              border-bottom: 2px solid #333;
              margin-bottom: 15px;
            }
            /* Page specific styles */
            .page {
              position: relative;
              margin-top: 20px;
              margin-bottom: 20px;
              padding-top: 20px;
            }
            /* First page specific */
            .page:first-child {
              margin-top: 0;
            }
            /* Ensure proper spacing after page breaks */
            .page-break + * {
              margin-top: 20px;
            }
            ${options.customStyles || ''}
          </style>
        </head>
        <body>
          <div class="content">${content}</div>
        </body>
      </html>
    `;
  }

  /**
   * Generates header template for PDF
   * @private
   * @param {string} header - Header HTML content
   * @returns {string} Formatted header template
   */
  getHeaderTemplate(header) {
    return `
      <div style="font-size: 10px; padding: 10px 40px; border-bottom: 1px solid #ddd; text-align: center;">
        ${header}
      </div>
    `;
  }

  /**
   * Generates footer template for PDF
   * @private
   * @param {string} footer - Footer HTML content
   * @returns {string} Formatted footer template
   */
  getFooterTemplate(footer) {
    return `
      <div style="font-size: 10px; padding: 10px 40px; border-top: 1px solid #ddd; text-align: center;">
        ${footer}
      </div>
    `;
  }
}

module.exports = new PDFService(); 