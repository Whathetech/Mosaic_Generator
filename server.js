const express = require('express');
const cors = require('cors'); // Importiere das cors-Modul
const app = express();

// CORS-Konfiguration
const corsOptions = {
    origin: 'https://7e3473-cd.myshopify.com', // Erlaubte Domain
    methods: ['GET', 'POST'],                 // Erlaubte HTTP-Methoden
    allowedHeaders: ['Content-Type'],         // Erlaubte Header
};

// CORS-Middleware aktivieren
app.use(cors(corsOptions));

// Middleware für JSON-Parsing
app.use(express.json({ limit: '10mb' })); // Erlaubt große JSON-Bodies, z.B. für Base64-Bilder

// Route für den Bild-Upload
app.post('/upload', (req, res) => {
    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    console.log('Bild erfolgreich empfangen!');
    console.log('Base64-Länge:', image.length); // Optional: Debugging

    // Rückmeldung an den Shopify-Client
    res.json({ success: true, message: 'Bild wurde erfolgreich empfangen.' });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
