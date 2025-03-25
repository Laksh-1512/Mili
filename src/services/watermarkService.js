const docx = require('docx');
const { logger } = require('../config/logger');

class WatermarkService {
  async addWatermarkToPDF(page, watermark) {
    if (watermark.type === 'text') {
      await this.addTextWatermarkToPDF(page, watermark.content);
    } else {
      await this.addImageWatermarkToPDF(page, watermark.content);
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

  async addWatermarkToDOCX(doc, watermark) {
    try {
      if (watermark.type === 'text') {
        await this.addTextWatermarkToDOCX(doc, watermark.content);
      } else if (watermark.type === 'image') {
        await this.addImageWatermarkToDOCX(doc, watermark.content);
      }
    } catch (error) {
      logger.error('Failed to add watermark to DOCX:', error);
      // Don't throw error for watermark failures
    }
  }

  async addTextWatermarkToDOCX(doc, text) {
    const watermarkSection = {
      properties: {
        page: {
          size: {
            orientation: docx.PageOrientation.PORTRAIT,
          },
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
        type: docx.SectionType.CONTINUOUS,
      },
      children: [
        new docx.Paragraph({
          text: text,
          alignment: docx.AlignmentType.CENTER,
          style: {
            color: "808080",
            size: 72,
            opacity: 0.5,
          }
        })
      ],
    };

    doc.addSection(watermarkSection);
    logger.info('Text watermark added to DOCX');
  }

  async addImageWatermarkToDOCX(doc, base64Image) {
    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Image, 'base64');

      // Create drawing object for the image
      const imageDrawing = new docx.ImageRun({
        data: imageBuffer,
        transformation: {
          width: 300, // Width in points
          height: 300, // Height in points
          rotation: -45, // Rotate 45 degrees counter-clockwise
          opacity: 0.3, // 30% opacity
        },
      });

      // Create paragraph with centered image
      const watermarkParagraph = new docx.Paragraph({
        children: [imageDrawing],
        alignment: docx.AlignmentType.CENTER,
      });

      // Create section properties with background image
      const sectionProperties = {
        properties: {
          page: {
            size: {
              orientation: docx.PageOrientation.PORTRAIT,
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
          type: docx.SectionType.CONTINUOUS,
          background: {
            color: "FFFFFF", // White background
          },
        },
        children: [watermarkParagraph],
      };

      // Add the section to the document
      doc.addSection(sectionProperties);

      logger.info('Image watermark added to DOCX');
    } catch (error) {
      logger.error('Failed to add image watermark to DOCX:', error);
      throw error;
    }
  }
}

module.exports = new WatermarkService(); 