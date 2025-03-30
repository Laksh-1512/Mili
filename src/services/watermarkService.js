const docx = require('docx');
const { 
  Watermarker, 
  WordProcessingLoadOptions, 
  WordProcessingWatermarkOptions,
  Font,
  FontStyle,
  Color, 
  TextWatermark, 
  HorizontalAlignment, 
  VerticalAlignment 
} = require('@groupdocs/groupdocs.watermark');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');
const License = require('@groupdocs/groupdocs.watermark').License;

/**
 * Watermark Service
 * Handles watermark application for both PDF and DOCX documents
 */
class WatermarkService {
  constructor() {
    // Initialize GroupDocs license
    try {
      const license = new License();
      // Either use a license file
      if (process.env.GROUPDOCS_LICENSE_PATH) {
        license.setLicense(process.env.GROUPDOCS_LICENSE_PATH);
      }
      // Or use a license string/key
      else if (process.env.GROUPDOCS_LICENSE_KEY) {
        license.setLicense(process.env.GROUPDOCS_LICENSE_KEY);
      }
    } catch (error) {
      logger.warn('GroupDocs license not found or invalid. Running in evaluation mode.');
    }
  }

  async addWatermarkToPDF(page, watermark) {
    if (watermark.type === 'text') {
      console.log(watermark,"watermark");
      await this.addTextWatermarkToPDF(page, watermark.content);
    } else {
      await this.addImageWatermarkToPDF(page, watermark.content);
    }
  }

  async addWatermarkToDOCX(doc, watermarkConfig) {
    try {
      const tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
      const tempInputPath = path.join(tempDir, `temp_input_${Date.now()}.docx`);
      const tempOutputPath = path.join(tempDir, `temp_output_${Date.now()}.docx`);

      await fs.mkdir(tempDir, { recursive: true });

      const buffer = await docx.Packer.toBuffer(new docx.Document(doc));
      await fs.writeFile(tempInputPath, buffer);

      // Create load options for DOCX
      const loadOptions = new WordProcessingLoadOptions();
      const watermarker = new Watermarker(tempInputPath, loadOptions);

      try {
        // Create font with specific style
        const font = new Font("Arial", 72, FontStyle.Bold);
        
        // Create watermark with proper font configuration
        // console.log(watermarkConfig.content,"watermarkConfig.content");
        const watermark = new TextWatermark(watermarkConfig.content, font);
        
        // Set watermark properties
        watermark.setOpacity(0.5);
        watermark.setForegroundColor(Color.fromArgb(128, 128, 128));
        watermark.setRotateAngle(-45);
        watermark.setHorizontalAlignment(HorizontalAlignment.Center);
        watermark.setVerticalAlignment(VerticalAlignment.Center);
        
        console.log(tempInputPath,"tempInputPath");
        console.log(watermark,"watermark");
        console.log(watermarker,"watermarker");
        // Add watermark without options
        watermarker.add(watermark);
        watermarker.save(tempOutputPath);

        const watermarkedContent = await fs.readFile(tempOutputPath);
        return watermarkedContent;

      } finally {
        watermarker.dispose();
        // await Promise.all([
        //   fs.unlink(tempInputPath).catch(() => {}),
        //   fs.unlink(tempOutputPath).catch(() => {})
        // ]).catch(err => logger.error('Error cleaning up temp files:', err));
      }

    } catch (error) {
      logger.error('Failed to add watermark using GroupDocs:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  async _addTextWatermarkToSection(section, text) {
    const watermarkText = new docx.TextRun({
      text: text,
      size: 96,
      color: "D3D3D3",
      bold: true,
      font: "Arial",
    });

    const watermarkParagraph = new docx.Paragraph({
      children: [watermarkText],
      alignment: docx.AlignmentType.CENTER,
      floating: {
        horizontalPosition: {
          relative: docx.HorizontalPositionRelativeFrom.PAGE,
          align: docx.HorizontalPositionAlign.CENTER,
          offset: 0
        },
        verticalPosition: {
          relative: docx.VerticalPositionRelativeFrom.PAGE,
          align: docx.VerticalPositionAlign.CENTER,
          offset: 0
        },
        wrap: {
          type: docx.TextWrappingType.BEHIND
        },
        allowOverflow: true,
        zIndex: -1
      }
    });
    // console.log(watermarkParagraph,"watermarkParagraph");
    section.properties.addChildElement(watermarkParagraph);
  }

  async _addImageWatermarkToSection(section, imageContent) {
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

      const watermarkParagraph = new docx.Paragraph({
        children: [watermarkImage],
        alignment: docx.AlignmentType.CENTER,
        floating: {
          horizontalPosition: {
            relative: docx.HorizontalPositionRelativeFrom.PAGE,
            align: docx.HorizontalPositionAlign.CENTER,
            offset: 0
          },
          verticalPosition: {
            relative: docx.VerticalPositionRelativeFrom.PAGE,
            align: docx.VerticalPositionAlign.CENTER,
            offset: 0
          },
          wrap: {
            type: docx.TextWrappingType.BEHIND
          },
          allowOverflow: true,
          zIndex: -1
        }
      });

      section.properties.addChildElement(watermarkParagraph);
    } catch (error) {
      logger.error('Failed to add image watermark to section:', error);
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