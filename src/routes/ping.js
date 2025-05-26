const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
    const start = Date.now();
    // Simulate async operation (optional)
    await Promise.resolve();
    const latency = Date.now() - start;
    res.json({ ping: `${latency}ms` });
});

module.exports = router;
