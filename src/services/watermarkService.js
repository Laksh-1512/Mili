const { 
  Watermarker, 
  WordProcessingLoadOptions,
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

/**
 * Watermark Service
 * Handles watermark application for both PDF and DOCX documents
 */
class WatermarkService {
  async addWatermarkToDOCX(docPath, watermarkConfig) {
    try {
      // Create watermarker instance
      const watermarker = new Watermarker(docPath);

      try {
        // Create font with specific style
        const font = new Font("Arial", 72, FontStyle.Bold);
        
        // Create text watermark
        const watermark = new TextWatermark(watermarkConfig.content || "CONFIDENTIAL", font);
        
        // Configure watermark appearance
        watermark.setOpacity(0.3);                                    // Make it semi-transparent
        watermark.setForegroundColor(Color.fromArgb(128, 128, 128)); // Gray color
        watermark.setRotateAngle(-45);                               // Diagonal orientation
        watermark.setHorizontalAlignment(HorizontalAlignment.Center);
        watermark.setVerticalAlignment(VerticalAlignment.Center);
        
        // Add watermark to the document
        watermarker.add(watermark);

        // Create temporary output path
        const tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
        const tempOutputPath = path.join(tempDir, `temp_output_${Date.now()}.docx`);
        
        // Save the watermarked document
        watermarker.save(tempOutputPath);

        // Read the watermarked content
        const watermarkedContent = await fs.readFile(tempOutputPath);
        
        // Clean up temp file
        // await fs.unlink(tempOutputPath).catch(() => {});

        return watermarkedContent;

      } finally {
        // Always dispose the watermarker
        watermarker.dispose();
      }

    } catch (error) {
      logger.error('Failed to add watermark using GroupDocs:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
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