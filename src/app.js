const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
