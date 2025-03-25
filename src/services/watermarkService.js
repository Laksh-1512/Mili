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
      // Get all sections from the document
      const sections = doc.sections;
      
      // Add watermark to each section
      sections.forEach(section => {
        if (watermark.type === 'text') {
          this.addTextWatermarkToSection(section, watermark.content);
        } else if (watermark.type === 'image') {
          this.addImageWatermarkToSection(section, watermark.content);
        }
      });

      logger.info('Watermark added to all pages');
    } catch (error) {
      logger.error('Failed to add watermark to DOCX:', error);
      throw error;
    }
  }

  addTextWatermarkToSection(section, text) {
    // Create watermark paragraph
    const watermarkParagraph = new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: text,
          size: 72, // Large size for watermark
          color: "CCCCCC", // Light gray color
          bold: true
        })
      ],
      alignment: docx.AlignmentType.CENTER,
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
        },
        rotation: -45 // Rotate 45 degrees counter-clockwise
      }
    });

    // Add watermark to section
    section.properties.addChildElement(
      new docx.Paragraph({
        children: [watermarkParagraph],
        frame: {
          position: {
            x: 0,
            y: 0
          },
          width: 100,
          height: 100,
          anchor: {
            horizontal: docx.FrameAnchorType.PAGE,
            vertical: docx.FrameAnchorType.PAGE
          },
          alignment: {
            x: docx.HorizontalPositionAlign.CENTER,
            y: docx.VerticalPositionAlign.CENTER
          }
        }
      })
    );
  }

  addImageWatermarkToSection(section, base64Image) {
    try {
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Create image watermark
      const watermarkImage = new docx.ImageRun({
        data: imageBuffer,
        transformation: {
          width: 300,
          height: 300,
          rotation: -45,
          opacity: 0.3
        }
      });

      // Add watermark to section
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
    } catch (error) {
      logger.error('Failed to add image watermark:', error);
      throw error;
    }
  }
}

module.exports = new WatermarkService(); 