/**
 * DOCX Generation Service
 * @module DOCXService
 * @description Handles DOCX document generation with support for headers, footers, and watermarks
 */

const HTMLtoDOCX = require('html-to-docx');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../config/logger');
const watermarkService = require('./watermarkService');

/**
 * DOCX Service Class
 * @class DOCXService
 * @description Manages DOCX document generation and formatting
 */
class DOCXService {
  /**
   * Creates an instance of DOCXService
   * @constructor
   * @throws {Error} If temp directory creation fails
   */
  constructor() {
    this.tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
    fs.mkdir(this.tempDir, { recursive: true })
      .catch(err => logger.error('Failed to create temp directory:', err));
  }

  /**
   * Generates a DOCX document with the provided content
   * @async
   * @param {Object} params - Parameters for DOCX generation
   * @param {string} params.header - HTML content for header
   * @param {string} params.content - Main HTML content
   * @param {string} params.footer - HTML content for footer
   * @param {string} params.requestId - Unique request identifier
   * @param {Object} [params.watermark] - Optional watermark configuration
   * @returns {Promise<Object>} Generated DOCX file information
   * @throws {Error} If DOCX generation fails
   */
  async generateDOCX({ header, content, footer, requestId, watermark }) {
    try {
      logger.info(`Starting DOCX generation for request ${requestId}`);

      // Clean and process the content
      const cleanContent = this.sanitizeContent(content);
      const pages = this.splitContentIntoPages(cleanContent);
      const processedContent = this.processContent(pages.join('<div style="page-break-after: always;"></div>'));

      // Process header and footer
      const headerHtml = header ? this.wrapHeaderFooter(this.sanitizeContent(header), 'header') : '';
      const footerHtml = footer ? this.wrapHeaderFooter(this.sanitizeContent(footer), 'footer') : '';

      const options = {
        orientation: 'portrait',
        pageSize: {
          width: 12240, // Letter width in TWIP
          height: 15840, // Letter height in TWIP
        },
        margins: {
          top: 1440,    // 1 inch in TWIP
          right: 1440,
          bottom: 1440,
          left: 1440,
          header: 720,  // 0.5 inch in TWIP
          footer: 720,
          gutter: 0
        },
        title: `Document-${requestId}`,
        subject: 'Generated Document',
        creator: 'DOCXService',
        keywords: ['generated', 'document'],
        description: 'Automatically generated document',
        lastModifiedBy: 'DOCXService',
        revision: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        headerType: 'default',
        header: !!headerHtml, // Enable header if headerHtml exists
        footer: !!footerHtml, // Enable footer if footerHtml exists
        styles: this.getEnhancedStyles(),
        cssStyleSheet: this.getCustomCSS(),
        table: {
          row: {
            cantSplit: true
          }
        },
        preserveStyleTags: true
      };

      // Generate DOCX with proper header and footer
      const buffer = await HTMLtoDOCX(
        processedContent,    // Main content
        headerHtml,         // Header content
        options,            // Options
        footerHtml         // Footer content
      );

      const outputPath = path.join(this.tempDir, `${requestId}.docx`);
      await fs.writeFile(outputPath, buffer);
      console.log('Adding watermark to DOCX:', watermark);
      if (watermark) {
        
        const docWithWatermark = await watermarkService.addWatermarkToDOCX(
          outputPath,
          watermark
        );
        await fs.writeFile(outputPath, docWithWatermark);
      }

      logger.info(`DOCX file generated successfully at ${outputPath}`);
      return { path: outputPath };

    } catch (error) {
      logger.error(`DOCX generation failed for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize HTML content to prevent formatting issues
   * @private
   */
  sanitizeContent(content) {
    if (!content) return '';
    
    return content
      // Remove potentially problematic characters
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
      // Normalize quotation marks
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Ensure proper closing of tags
      .replace(/<(br|hr)>/gi, '<$1 />')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Process content to enhance style handling
   * @private
   */
  processContent(content) {
    // Add style preservation wrapper
    return `
      <div class="document-content">
        ${this.enhanceListStyles(content)}
      </div>
    `;
  }

  /**
   * Enhance list styles to ensure proper nesting and styling
   * @private
   */
  enhanceListStyles(content) {
    return content.replace(
      /(<[uo]l[^>]*>)([\s\S]*?)(<\/[uo]l>)/g,
      (match, openTag, listContent, closeTag) => {
        const styleMatch = openTag.match(/style=["'](.*?)["']/);
        const existingStyles = styleMatch ? styleMatch[1] : '';
        
        const enhancedOpenTag = openTag.replace(
          '>',
          ` style="${existingStyles}; margin-left: 40px; padding-left: 0; list-style-position: outside;">`
        );

        const enhancedContent = listContent.replace(
          /(<li[^>]*)(>)([\s\S]*?)(<\/li>)/g,
          (liMatch, liOpen, liClose, liContent, liEnd) => {
            const liStyleMatch = liOpen.match(/style=["'](.*?)["']/);
            const liStyles = liStyleMatch ? liStyleMatch[1] : '';
            return `${liOpen} style="${liStyles}; display: list-item; margin-bottom: 8px;"${liClose}${liContent}${liEnd}`;
          }
        );

        return `${enhancedOpenTag}${enhancedContent}${closeTag}`;
      }
    );
  }

  /**
   * Get enhanced styles configuration
   * @private
   */
  getEnhancedStyles() {
    return {
      paragraphStyles: {
        normal: {
          spacing: { before: 120, after: 120, line: 240 },
          run: { size: 22 }
        },
        heading1: {
          run: { size: 48, bold: true },
          spacing: { before: 240, after: 120 },
        },
        heading2: {
          run: { size: 36, bold: true },
          spacing: { before: 240, after: 120 },
        }
      },
      characterStyles: {
        default: {
          size: 22,
          font: 'Arial'
        }
      },
      styleMap: {
        'h1': 'heading1',
        'h2': 'heading2',
        'p': 'normal',
        'ul': { indentation: { left: 720 } },
        'ol': { indentation: { left: 720 } },
        'li': { indentation: { hanging: 360 } },
        'strong': { bold: true },
        'b': { bold: true },
        'em': { italic: true },
        'i': { italic: true },
        'u': { underline: true },
        'a': { color: '0563C1', underline: true },
        'table': {
          preferredWidth: 100,
          preferredWidthType: 'pct',
        }
      }
    };
  }

  /**
   * Get custom CSS for enhanced styling
   * @private
   */
  getCustomCSS() {
    return `
      .document-content { 
        font-family: Arial; 
        font-size: 11pt; 
        line-height: 1.15;
      }
      ul, ol { 
        margin-left: 40px; 
        padding-left: 0;
        list-style-position: outside;
      }
      li { 
        display: list-item;
        margin-bottom: 8px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse;
        margin: 10px 0;
      }
      td, th { 
        border: 1px solid #000; 
        padding: 8px;
        vertical-align: top;
      }
      strong, b { font-weight: bold; }
      em, i { font-style: italic; }
      u { text-decoration: underline; }
      p { margin: 0; padding: 0; }
    `;
  }

  /**
   * Wraps header/footer content with proper styling
   * @private
   */
  wrapHeaderFooter(content, type) {
    if (!content) return '';

    let processedContent = content;
    if (type === 'footer') {
      processedContent = content
        .replace('{{page}}', '{{pageNumber}}')
        .replace('{{total}}', '{{totalPages}}');
    }

    return `
      <div style="
        width: 100%;
        text-align: center;
        font-size: 10pt;
        font-family: Arial;
        margin: 0;
        padding: ${type === 'header' ? '12pt' : '12pt'} 0;
        line-height: 1.2;
      ">
        ${processedContent}
      </div>
    `;
  }

  /**
   * Splits content into multiple pages
   * @private
   * @param {string} content - HTML content to split
   * @returns {Array<string>} Array of page contents
   */
  splitContentIntoPages(content) {
    return content
      .split(/<div[^>]*class=["']page-break["'][^>]*>/g)
      .map(page => page.trim())
      .filter(page => page.length > 0);
  }
}

module.exports = new DOCXService();