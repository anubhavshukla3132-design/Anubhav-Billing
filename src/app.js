const express = require('express');
const path = require('path');
const session = require('express-session');
const pdfRoutes = require('./routes/pdf.routes');
const authRoutes = require('./routes/auth.routes');
const { requireAuth } = require('./middleware/auth.middleware');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: 'adarsh-billing-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  name: 'adarsh.sid',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.use('/auth', authRoutes);

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

 app.use('/api', requireAuth, pdfRoutes);
 
module.exports = app;
