const express = require('express');
const router = express.Router();
const v1Routes = require('./v1/documentRoutes');

router.use('/v1', v1Routes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router; 