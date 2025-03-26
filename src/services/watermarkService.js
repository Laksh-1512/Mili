const docx = require('docx');
const { logger } = require('../config/logger');

/**
 * Watermark Service
 * Handles watermark application for both PDF and DOCX documents
 */
class WatermarkService {
  async addWatermarkToPDF(page, watermark) {
    if (watermark.type === 'text') {
      await this.addTextWatermarkToPDF(page, watermark.content);
    } else {
      await this.addImageWatermarkToPDF(page, watermark.content);
    }
  }

  async addWatermarkToDOCX(doc, watermark) {
    // Check if doc and sections exist
    if (!doc || !doc.sections || !doc.sections.length) {
      throw new Error('Invalid document structure');
    }

    if (watermark.type === 'text') {
      await this.addTextWatermarkToDOCX(doc, watermark.content);
    } else {
      await this.addImageWatermarkToDOCX(doc, watermark.content);
    }
  }

  async addTextWatermarkToDOCX(doc, text) {
    try {
      // Add watermark to each section
      doc.sections.forEach(section => {
        const watermarkText = new docx.TextRun({
          text: text,
          size: 72,
          color: "CCCCCC",
          bold: true,
        });

        const paragraph = new docx.Paragraph({
          children: [watermarkText],
          alignment: docx.AlignmentType.CENTER,
        });

        // Add watermark paragraph to section
        section.properties.addChildElement(
          new docx.Paragraph({
            children: [watermarkText],
            alignment: docx.AlignmentType.CENTER,
            floating: {
              horizontalPosition: {
                relative: docx.HorizontalPositionRelativeFrom.PAGE,
                align: docx.HorizontalPositionAlign.CENTER
              },
              verticalPosition: {
                relative: docx.VerticalPositionRelativeFrom.PAGE,
                align: docx.VerticalPositionAlign.CENTER
              }
            }
          })
        );
      });
    } catch (error) {
      logger.error('Failed to add text watermark to DOCX:', error);
      throw error;
    }
  }

  async addImageWatermarkToDOCX(doc, imageContent) {
    try {
      // Ensure doc has sections
      if (!doc.sections || !doc.sections.length) {
        throw new Error('Document has no sections');
      }

      // Add watermark to each section
      doc.sections.forEach(section => {
        const watermarkImage = new docx.ImageRun({
          data: Buffer.from(imageContent, 'base64'),
          transformation: {
            width: 300,
            height: 300,
            opacity: 0.3
          }
        });

        section.properties.addChildElement(
          new docx.Paragraph({
            children: [watermarkImage],
            floating: {
              horizontalPosition: {
                relative: docx.HorizontalPositionRelativeFrom.PAGE,
                align: docx.HorizontalPositionAlign.CENTER
              },
              verticalPosition: {
                relative: docx.VerticalPositionRelativeFrom.PAGE,
                align: docx.VerticalPositionAlign.CENTER
              },
              wrap: {
                type: docx.TextWrappingType.BEHIND
              }
            }
          })
        );
      });
    } catch (error) {
      logger.error('Failed to add image watermark to DOCX:', error);
      throw error;
    }
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