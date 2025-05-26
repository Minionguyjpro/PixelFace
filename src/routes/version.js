const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../../package.json');
let version = 'unknown';

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    version = packageJson.version || 'unknown';
} catch (err) {
    console.error('Failed to read package.json:', err);
}

// GET /version
router.get('/', async (req, res) => {
    res.json({ version });
});

module.exports = router;
