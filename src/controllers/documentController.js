const documentService = require('../services/documentService');
const { logger } = require('../config/logger');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

    // Generate unique request ID using UUID v4
    const requestId = `${uuidv4()}.${documentType}`;
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
    });

  } catch (error) {
    logger.error('Document generation failed:', error);
    next(error);
  }
};

module.exports = { generateDocument }; 