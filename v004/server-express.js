const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// API endpoints for future file operations
app.get('/api/files', (req, res) => {
    // Placeholder for file listing API
    res.json({ message: 'File API coming soon' });
});

// Catch-all route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════╗
║         FileUI Express Server             ║
╠═══════════════════════════════════════════╣
║  Server running at:                       ║
║  http://localhost:${PORT}                     ║
║                                           ║
║  Available versions:                      ║
║  • http://localhost:${PORT}/v001/panels.html  ║
║  • http://localhost:${PORT}/v003/panels3.html ║
║  • http://localhost:${PORT}/v004/panels4.html ║
║                                           ║
║  Press Ctrl+C to stop                     ║
╚═══════════════════════════════════════════╝
    `);
});