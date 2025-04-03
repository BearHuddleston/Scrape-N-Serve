const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = process.env.PORT || 80;

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({ 
  target: 'http://backend:8080', 
  pathRewrite: {'^/api': '/api/v1'},
  changeOrigin: true 
}));

// Serve static files from the React app build directory
app.use(express.static('dist'));

// Serve the React app for any route not handled by static files
// Using explicit routes instead of the wildcard to avoid path-to-regexp issues
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.get('/data', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// Catch-all route as fallback
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});