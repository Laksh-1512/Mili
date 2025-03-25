const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const { logger } = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const app = express();

// Ensure temp directory exists
const tempDir = path.resolve(process.env.TEMP_FILES_PATH || './temp');
fs.mkdir(tempDir, { recursive: true })
  .then(() => logger.info(`Temp directory created/verified at: ${tempDir}`))
  .catch(err => logger.error('Failed to create temp directory:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' })); // size limit 50mb
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

module.exports = app; 