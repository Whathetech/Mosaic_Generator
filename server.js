const express = require('express');
const cors = require('cors'); // Importiere das cors-Modul
const axios = require('axios');
const sharp = require('sharp'); // Für Bildverarbeitung
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

// URL des Hintergrundbilds
const BACKGROUND_URL = 'https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/fe1596ca47446087368bdc92c44a4e5fd2f88c3f/Stock_Footage/Cropped_Portrait/Couch.png';

// Route für den Bild-Upload
app.post('/upload', async (req, res) => {
    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        console.log('Bild erfolgreich empfangen!');
        console.log('Base64-Länge:', image.length);

        // Das Bild aus dem Base64-String dekodieren
        const base64Data = image.replace(/^data:image\/\w+;base64,/, ''); // Entfernt den Präfix
        const userImageBuffer = Buffer.from(base64Data, 'base64');

        // Hintergrundbild herunterladen
        const response = await axios.get(BACKGROUND_URL, { responseType: 'arraybuffer' });
        const backgroundBuffer = Buffer.from(response.data);

        // Hintergrundbild und empfangenes Bild kombinieren
        const compositeImageBuffer = await sharp(backgroundBuffer)
            .composite([{ input: userImageBuffer, top: 50, left: 50 }]) // Position kann angepasst werden
            .toBuffer();

        // Base64-kodiertes Bild erstellen
        const outputBase64 = `data:image/png;base64,${compositeImageBuffer.toString('base64')}`;

        // Rückgabe an Shopify
        res.status(200).json({
            success: true,
            message: 'Bild wurde erfolgreich verarbeitet und kombiniert.',
            image: outputBase64, // Kombiniertes Bild als Base64
        });

    } catch (error) {
        console.error('Fehler bei der Bildverarbeitung:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Bildverarbeitung.' });
    }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});