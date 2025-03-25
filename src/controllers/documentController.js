const documentService = require('../services/documentService');
const { logger } = require('../config/logger');
const path = require('path');
const { cleanupTempFiles } = require('../utils/cleanup');

const generateDocument = async (req, res, next) => {
  let generatedFilePath = null;
  
  try {
    const {
      header,
      content,
      footer,
      documentType,
      watermark,
      placeholders
    } = req.body;

    // Generate unique request ID for tracking
    const requestId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    logger.info(`Starting document generation for request ${requestId}`);

    // Process the document
    const result = await documentService.generateDocument({
      requestId,
      header,
      content,
      footer,
      documentType,
      watermark,
      placeholders
    });

    generatedFilePath = result.path;
    logger.info(`Document generation completed for request ${requestId}`);

    // Set headers for file download
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    // Send the file
    res.sendFile(result.path, {
      root: path.resolve(process.env.TEMP_FILES_PATH || './temp')
    }, (err) => {
      if (err) {
        logger.error(`Error sending file: ${err}`);
        next(err);
      } else {
        // Clean up temp file after successful send
        cleanupTempFiles(result.path)
          .catch(err => logger.error(`Error cleaning up temp file: ${err}`));
      }
    });

  } catch (error) {
    logger.error('Document generation failed:', error);
    
    // Clean up temp file if exists
    if (generatedFilePath) {
      cleanupTempFiles(generatedFilePath)
        .catch(err => logger.error(`Error cleaning up temp file: ${err}`));
    }
    
    // Pass to error handler middleware
    next(error);
  }
};

module.exports = { generateDocument }; 