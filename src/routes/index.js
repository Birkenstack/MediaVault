const express = require('express');
const mediaRoutes = require('./mediaRoutes');
const genreRoutes = require('./genreRoutes');
const contributorRoutes = require('./contributorRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ message: 'MediaVault API is running.' });
});

router.use('/media', mediaRoutes);
router.use('/genres', genreRoutes);
router.use('/contributors', contributorRoutes);

module.exports = router;
