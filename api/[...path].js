// Vercel catch-all function: route all /api/* requests through the existing
// Express application exported by ws/index.js.
module.exports = require('../ws');
