const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../config/logger');

const cleanupTempFiles = async (filePath) => {
  try {
    await fs.access(filePath); // Check if file exists
    await fs.unlink(filePath);
    logger.info(`Cleaned up temporary file: ${filePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`File already deleted: ${filePath}`);
    } else {
      logger.error(`Failed to cleanup temporary file ${filePath}:`, error);
    }
  }
};

module.exports = { cleanupTempFiles }; 