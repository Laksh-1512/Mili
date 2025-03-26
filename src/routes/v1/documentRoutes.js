const express = require('express');
const router = express.Router();
const { generateDocument } = require('../../controllers/documentController');
const { validateDocumentRequest } = require('../../middleware/validator');
const rateLimiter = require('../../middleware/rateLimiter');

router.post(
  '/document',rateLimiter,validateDocumentRequest,generateDocument
); // rate limiter is applied to the route

module.exports = router; 