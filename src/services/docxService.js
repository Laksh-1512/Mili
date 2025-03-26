/**
 * DOCX Generation Service
 * @module DOCXService
 * @description Handles DOCX document generation with support for headers, footers, and watermarks
 */

const docx = require('docx');
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
   * @param {Object} [params.watermark] - Optional watermark configuration
   * @param {string} params.requestId - Unique request identifier
   * @returns {Promise<Object>} Generated DOCX file information
   * @throws {Error} If DOCX generation fails
   */
  async generateDOCX({ header, content, footer, watermark, requestId }) {
    try {
      logger.info(`Starting DOCX generation for request ${requestId}`);
      
      // Split content into pages
      const pages = this.splitContentIntoPages(content);
      
      // Create sections for each page
      const sections = pages.map((pageContent, index) => ({
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          },
          type: index > 0 ? docx.SectionType.NEXT_PAGE : docx.SectionType.CONTINUOUS
        },
        headers: {
          default: new docx.Header({
            children: [this.convertParagraph(header)]
          })
        },
        footers: {
          default: new docx.Footer({
            children: [
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: this.cleanHtml(footer)
                      .replace('{{page}}', (index + 1).toString())
                      .replace('{{total}}', pages.length.toString())
                  })
                ],
                alignment: docx.AlignmentType.CENTER
              })
            ]
          })
        },
        children: this.convertPageContent(pageContent)
      }));

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
        path: outputPath
      };

    } catch (error) {
      logger.error(`DOCX generation failed for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Splits content into multiple pages
   * @private
   * @param {string} content - HTML content to split
   * @returns {Array<string>} Array of page contents
   */
  splitContentIntoPages(content) {
    // Split content at page-break divs
    return content
      .split(/<div[^>]*class=["']page-break["'][^>]*>/g)
      .map(page => page.trim())
      .filter(page => page.length > 0);
  }

  /**
   * Converts HTML content to DOCX elements
   * @private
   * @param {string} html - HTML content to convert
   * @returns {Array<docx.Paragraph|docx.Table>} Array of DOCX elements
   */
  convertPageContent(html) {
    const elements = [];
    
    // Split content into blocks (paragraphs, tables, lists)
    const blocks = html.split(/(?=<(?:p|table|ul|ol|h[1-6])[^>]*>)/);
    
    for (const block of blocks) {
      if (block.trim().length === 0) continue;

      if (block.startsWith('<table')) {
        elements.push(this.convertTable(block));
      } else if (block.startsWith('<ul') || block.startsWith('<ol')) {
        elements.push(...this.convertList(block));
      } else if (block.startsWith('<h')) {
        elements.push(this.convertHeading(block));
      } else {
        elements.push(this.convertParagraph(block));
      }
    }

    return elements;
  }

  /**
   * Converts HTML table to DOCX table
   * @private
   * @param {string} html - HTML table content
   * @returns {docx.Table} DOCX table object
   */
  convertTable(html) {
    try {
      const rows = html.match(/<tr[^>]*>(.*?)<\/tr>/gs) || [];
      
      return new docx.Table({
        rows: rows.map(row => {
          const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs) || [];
          return new docx.TableRow({
            children: cells.map(cell => {
              return new docx.TableCell({
                children: [this.convertParagraph(cell)]
              });
            })
          });
        })
      });
    } catch (error) {
      logger.error('Error converting table:', error);
      return this.convertParagraph(html);
    }
  }

  /**
   * Converts HTML list to DOCX paragraphs
   * @private
   * @param {string} html - HTML list content
   * @returns {Array<docx.Paragraph>} Array of DOCX paragraphs
   */
  convertList(html) {
    try {
      const items = html.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
      return items.map((item, index) => {
        return new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: this.cleanHtml(item)
            })
          ],
          bullet: {
            level: 0
          }
        });
      });
    } catch (error) {
      logger.error('Error converting list:', error);
      return [this.convertParagraph(html)];
    }
  }

  convertHeading(html) {
    const level = parseInt(html.match(/<h([1-6])/)?.[1] || '1');
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: this.cleanHtml(html),
          bold: true,
          size: 32 - (level * 2)
        })
      ],
      spacing: {
        before: 240,
        after: 120
      }
    });
  }

  convertParagraph(html) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: this.cleanHtml(html)
        })
      ],
      spacing: {
        before: 120,
        after: 120
      }
    });
  }

  cleanHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}

module.exports = new DOCXService();