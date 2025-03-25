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

  splitContentIntoPages(content) {
    // Split content at page-break divs
    return content
      .split(/<div[^>]*class=["']page-break["'][^>]*>/g)
      .map(page => page.trim())
      .filter(page => page.length > 0);
  }

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