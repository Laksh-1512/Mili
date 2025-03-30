const docx = require('docx');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Watermark Service
 * Handles watermark application for both PDF and DOCX documents
 */
class WatermarkService {
  async addWatermarkToDOCX(doc, watermarkConfig) {
    try {
      if (watermarkConfig.type === 'text') {
        // Add text watermark to each section
        doc.sections.forEach(section => {
          const watermarkParagraph = this._createTextWatermark(watermarkConfig.content);
          // Add watermark paragraph to the beginning of section's children
          section.children.unshift(watermarkParagraph);
        });
      } else if (watermarkConfig.type === 'image') {
        // Add image watermark to each section
        doc.sections.forEach(section => {
          const watermarkParagraph = this._createImageWatermark(watermarkConfig.content);
          section.children.unshift(watermarkParagraph);
        });
      }

      return doc;
    } catch (error) {
      logger.error('Failed to add watermark:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  _createTextWatermark(text) {
    const watermarkText = new docx.TextRun({
      text: text,
      size: 96, // Large size for watermark
      color: "D3D3D3", // Light gray color
      bold: true,
      font: "Arial",
    });

    return new docx.Paragraph({
      children: [watermarkText],
      alignment: docx.AlignmentType.CENTER,
      floating: {
        horizontalPosition: {
          relative: docx.HorizontalPositionRelativeFrom.PAGE,
          align: docx.HorizontalPositionAlign.CENTER,
        },
        verticalPosition: {
          relative: docx.VerticalPositionRelativeFrom.PAGE,
          align: docx.VerticalPositionAlign.CENTER,
        },
        wrap: {
          type: docx.TextWrappingType.BEHIND
        },
        allowOverflow: true,
        zIndex: -1
      }
    });
  }

  _createImageWatermark(imageContent) {
    try {
      const watermarkImage = new docx.ImageRun({
        data: Buffer.from(imageContent, 'base64'),
        transformation: {
          width: 600,
          height: 600,
          opacity: 0.2,
          rotation: -45
        }
      });

      return new docx.Paragraph({
        children: [watermarkImage],
        alignment: docx.AlignmentType.CENTER,
        floating: {
          horizontalPosition: {
            relative: docx.HorizontalPositionRelativeFrom.PAGE,
            align: docx.HorizontalPositionAlign.CENTER,
          },
          verticalPosition: {
            relative: docx.VerticalPositionRelativeFrom.PAGE,
            align: docx.VerticalPositionAlign.CENTER,
          },
          wrap: {
            type: docx.TextWrappingType.BEHIND
          },
          allowOverflow: true,
          zIndex: -1
        }
      });
    } catch (error) {
      logger.error('Failed to create image watermark:', error);
      throw error;
    }
  }

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
}

module.exports = new WatermarkService(); 