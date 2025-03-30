const docx = require('docx');
const { logger } = require('../config/logger');

/**
 * Watermark Service
 * Handles watermark application for both PDF and DOCX documents
 */
class WatermarkService {
  async addWatermarkToPDF(page, watermark) {
    console.log('Adding watermark to PDF:', watermark);
    if (watermark.type === 'text') {
      await this.addTextWatermarkToPDF(page, watermark.content);
    } else {
      await this.addImageWatermarkToPDF(page, watermark.content);
    }
  }

  async addWatermarkToDOCX(doc, watermark) {
    try {
      if (!doc || !doc.sections || !doc.sections.length) {
        throw new Error('Invalid document structure');
      }

      if (watermark.type === 'text') {
        await this.addTextWatermarkToDOCX(doc, watermark.content);
      } else {
        await this.addImageWatermarkToDOCX(doc, watermark.content);
      }
    } catch (error) {
      logger.error('Failed to add watermark to DOCX:', error);
      throw error;
    }
  }

  async addTextWatermarkToDOCX(doc, text) {
    try {
      logger.info('Adding text watermark to DOCX:', text);
      
      const watermark = new docx.TextRun({
        text: text,
        size: 96,
        color: "CCCCCC",
        bold: true,
        font: "Arial"
      });

      this.addWatermarkToSections(doc, watermark);
    } catch (error) {
      logger.error('Failed to add text watermark to DOCX:', error);
      throw error;
    }
  }

  async addImageWatermarkToDOCX(doc, imageContent) {
    try {
      const watermark = new docx.ImageRun({
        data: Buffer.from(imageContent, 'base64'),
        transformation: {
          width: 800,
          height: 1125,
        },
        floating: {
          horizontalPosition: {
            align: "center",
          },
          verticalPosition: {
            align: "center",
          },
          behindDocument: true,
        },
      });

      this.addWatermarkToSections(doc, watermark);
    } catch (error) {
      logger.error('Failed to add image watermark to DOCX:', error);
      throw error;
    }
  }

  addWatermarkToSections(doc, watermark) {
    doc.sections.forEach(section => {
      const watermarkParagraph = new docx.Paragraph({
        children: [watermark],
        alignment: docx.AlignmentType.CENTER,
        floating: {
          horizontalPosition: {
            align: docx.HorizontalPositionAlign.CENTER,
          },
          verticalPosition: {
            align: docx.VerticalPositionAlign.CENTER,
          },
          behindDocument: true,
          zIndex: -1000
        }
      });

      // Add to header
      if (!section.headers.default) {
        section.headers.default = new docx.Header({
          children: [watermarkParagraph]
        });
      } else {
        section.headers.default.addChildElement(watermarkParagraph);
      }

      // Add to body as well for better visibility
      section.addChildElement(watermarkParagraph);
    });
  }

  async addTextWatermarkToPDF(page, text) {
    await page.evaluate((watermarkText) => {
      const watermark = document.createElement('div');
      watermark.innerHTML = watermarkText;

      watermark.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 60px;
        opacity: 0.2;
        pointer-events: none;
        z-index: 1000;
        color: #888;
      `;
      document.body.appendChild(watermark);
    }, text);
  }

  async addImageWatermarkToPDF(page, base64Image) {
    await page.evaluate((imageData) => {
      const watermark = document.createElement('div');
      watermark.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.2;
        pointer-events: none;
        z-index: 1000;
      `;
      const img = document.createElement('img');
      img.src = `data:image/png;base64,${imageData}`;
      img.style.width = '300px';
      watermark.appendChild(img);
      document.body.appendChild(watermark);
    }, base64Image);
  }
}

module.exports = new WatermarkService(); 