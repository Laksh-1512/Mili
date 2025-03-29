/**
 * DOCX Generation Service
 * @module DOCXService
 * @description Handles DOCX document generation with support for headers, footers, and watermarks
 */

const docx = require('docx');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
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
   * @param {string} params.watermark.type - Type of watermark ('text' or 'image')
   * @param {string} params.watermark.content - Watermark content (text or base64 image)
   * @returns {Promise<Object>} Generated DOCX file information
   * @throws {Error} If DOCX generation fails
   */
  async generateDOCX({ header, content, footer, requestId, watermark }) {
    try {
      logger.info(`Starting DOCX generation for request ${requestId}`);
      
      const pages = this.splitContentIntoPages(content);
      
      const sections = await Promise.all(pages.map(async (pageContent, index) => ({
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
            children: await this.convertContent(header, true)
          })
        },
        footers: {
          default: new docx.Footer({
            children: await this.convertContent(
              footer.replace('{{page}}', (index + 1).toString())
                   .replace('{{total}}', pages.length.toString()),
              true
            )
          })
        },
        children: await this.convertContent(pageContent)
      })));

      const doc = new docx.Document({
        sections: sections
      });

      // Apply watermark if provided
      if (watermark) {
        await watermarkService.addWatermarkToDOCX(doc, watermark);
      }

      const outputPath = path.join(this.tempDir, `${requestId}.docx`);
      const buffer = await docx.Packer.toBuffer(doc);
      await fs.writeFile(outputPath, buffer);

      logger.info(`DOCX file generated successfully at ${outputPath}`);

      return { path: outputPath };

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
   * Converts HTML content to DOCX elements, including images
   * @private
   * @param {string} html - HTML content to convert
   * @param {boolean} [isHeaderFooter=false] - Whether this content is for header/footer
   * @returns {Promise<Array<docx.Paragraph|docx.Table|docx.ImageRun>>}
   */
  async convertContent(html, isHeaderFooter = false) {
    if (!html) return [];
    
    const elements = [];
    const blocks = html.split(/(?=<(?:p|table|ul|ol|h[1-6]|img)[^>]*>)/);
    
    for (const block of blocks) {
      if (!block.trim()) continue;

      try {
        if (block.startsWith('<img')) {
          const imgElement = await this.convertImage(block, isHeaderFooter);
          if (imgElement) elements.push(imgElement);
        } else if (block.startsWith('<table')) {
          elements.push(await this.convertTable(block));
        } else if (block.includes('<img')) {
          // Handle inline images within text
          elements.push(await this.convertMixedContent(block, isHeaderFooter));
        } else {
          elements.push(this.convertParagraph(block, isHeaderFooter));
        }
      } catch (error) {
        logger.error(`Error converting block: ${block}`, error);
        // Fallback to text conversion if image processing fails
        elements.push(this.convertParagraph(block, isHeaderFooter));
      }
    }
    
    return elements;
  }

  /**
   * Converts an image tag to DOCX image
   * @private
   * @param {string} html - HTML image tag
   * @param {boolean} isHeaderFooter - Whether this image is for header/footer
   */
  async convertImage(html, isHeaderFooter = false) {
    const srcMatch = html.match(/src=["'](.*?)["']/);
    if (!srcMatch) return null;

    const src = srcMatch[1];
    const imageBuffer = await this.getImageBuffer(src);

    // Get dimensions from HTML or use defaults
    const widthMatch = html.match(/width=["'](\d+)["']/);
    const heightMatch = html.match(/height=["'](\d+)["']/);

    // Use wider dimensions for footer images
    const defaultWidth = isHeaderFooter ? 550 : 400;  // Increased from 100 to 550
    const defaultHeight = isHeaderFooter ? 80 : 300;  // Adjusted height for proportion

    return new docx.Paragraph({
      children: [
        new docx.ImageRun({
          data: imageBuffer,
          transformation: {
            width: widthMatch ? parseInt(widthMatch[1]) : defaultWidth,
            height: heightMatch ? parseInt(heightMatch[1]) : defaultHeight
          }
        })
      ],
      alignment: docx.AlignmentType.CENTER
    });
  }

  /**
   * Converts mixed content (text with inline images) to DOCX elements
   * @private
   */
  async convertMixedContent(html, isHeaderFooter = false) {
    const children = [];
    const parts = html.split(/(<img[^>]*>)/);

    for (const part of parts) {
      if (part.startsWith('<img')) {
        try {
          const srcMatch = part.match(/src=["'](.*?)["']/);
          if (srcMatch) {
            const imageBuffer = await this.getImageBuffer(srcMatch[1]);
            children.push(
              new docx.ImageRun({
                data: imageBuffer,
                transformation: {
                  width: isHeaderFooter ? 550 : 400,  // Increased from 400 to 550
                  height: isHeaderFooter ? 80 : 300   // Adjusted height for proportion
                }
              })
            );
          }
        } catch (error) {
          logger.error('Error processing inline image:', error);
        }
      } else if (part.trim()) {
        children.push(
          new docx.TextRun({
            text: this.cleanHtml(part),
            size: isHeaderFooter ? 20 : 24
          })
        );
      }
    }

    return new docx.Paragraph({
      children,
      alignment: isHeaderFooter ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT
    });
  }

  /**
   * Gets image buffer from URL or base64
   * @private
   */
  async getImageBuffer(src) {
    try {
      if (src.startsWith('data:image')) {
        const base64Data = src.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        const response = await axios.get(src, {
          responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
      }
    } catch (error) {
      logger.error('Error downloading image:', error);
      throw error;
    }
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

  convertParagraph(html, isHeaderFooter = false) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: this.cleanHtml(html),
          size: isHeaderFooter ? 20 : 24
        })
      ],
      spacing: {
        before: 120,
        after: 120
      },
      alignment: isHeaderFooter ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT
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