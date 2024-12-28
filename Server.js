const express = require('express');
const cors = require('cors'); // CORS importieren
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

// Middleware zum Parsen von JSON-Daten
app.use(bodyParser.json());

// CORS Middleware aktivieren
app.use(cors({
  origin: '*', // Erlaubt alle Ursprünge. Du kannst es auch einschränken, wenn du nur Shopify zulassen möchtest
  methods: ['GET', 'POST'], // Erlaubte Methoden
  allowedHeaders: ['Content-Type'] // Erlaubte Header
}));

// Variable, um das übertragene Wort zu speichern
let transferredWord = '';

// Route für das Empfangen des Worts von Shopify
app.post('/transfer-word', (req, res) => {
  const { word } = req.body;
  if (!word) {
    console.error('Kein Wort empfangen');
    return res.status(400).json({ message: 'Kein Wort gesendet!' });
  }

  // Das Wort speichern
  transferredWord = word;

  console.log('Erhaltenes Wort:', word);

  // Erfolgsantwort senden
  res.json({ message: 'Wort erfolgreich empfangen!' });
});

// Route zum Anzeigen des Worts
app.get('/', (req, res) => {
  res.send(`<h1>Übertragenes Wort: ${transferredWord}</h1>`);
});

// Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});