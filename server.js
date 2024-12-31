const express = require('express');
const cors = require('cors');
const sharp = require('sharp'); // Bildbearbeitung
const app = express();

// CORS-Konfiguration
const corsOptions = {
    origin: 'https://7e3473-cd.myshopify.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

// CORS-Middleware aktivieren
app.use(cors(corsOptions));

// Middleware für JSON-Parsing
app.use(express.json({ limit: '10mb' })); // Erlaubt große JSON-Bodies, z.B. für Base64-Bilder

// Route für den Bild-Upload
app.post('/upload', async (req, res) => {
    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        console.log('Bild erfolgreich empfangen!');
        
        // Entferne den Base64-Prefix und konvertiere das Bild
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Bildbearbeitung (z. B. Skalieren und Graufilter anwenden)
        const processedImageBuffer = await sharp(buffer)
            .grayscale() // Beispiel: Graustufen anwenden
            .toBuffer();

        // Base64-kodiertes Bild erstellen
        const processedImageBase64 = `data:image/png;base64,${processedImageBuffer.toString('base64')}`;

        // Rückmeldung an Shopify
        res.json({
            success: true,
            message: 'Bild erfolgreich verarbeitet.',
            image: processedImageBase64, // Bearbeitetes Bild zurückgeben
        });
    } catch (error) {
        console.error('Fehler bei der Bildbearbeitung:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Bildbearbeitung.' });
    }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});