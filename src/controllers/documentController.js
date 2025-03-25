const documentService = require('../services/documentService');
const { logger } = require('../config/logger');
const path = require('path');
// const { cleanupTempFiles } = require('../utils/cleanup');  // Commented out cleanup import

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

    // Send the file using absolute path
    const absolutePath = path.resolve(result.path);
    logger.debug(`Sending file from path: ${absolutePath}`);

    res.sendFile(absolutePath, (err) => {
      if (err) {
        logger.error(`Error sending file: ${err}`);
        next(err);
      } 
      // Cleanup commented out
      // else {
      //   cleanupTempFiles(absolutePath)
      //     .catch(err => logger.error(`Error cleaning up temp file: ${err}`));
      // }
    });

  } catch (error) {
    logger.error('Document generation failed:', error);
    
    // Cleanup commented out
    // if (generatedFilePath) {
    //   cleanupTempFiles(generatedFilePath)
    //     .catch(err => logger.error(`Error cleaning up temp file: ${err}`));
    // }
    
    next(error);
  }
};

module.exports = { generateDocument }; 