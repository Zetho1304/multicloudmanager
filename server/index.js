// Load tools and secrets
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Add login routes
const googleRoutes = require('./routes/google');
const onedriveRoutes = require('./routes/onedrive');

app.use('/auth', googleRoutes);
app.use(onedriveRoutes);

app.use('/files/google', googleRoutes);
app.use('/files/onedrive', onedriveRoutes);


// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});