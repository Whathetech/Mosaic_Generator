const express = require('express');
const cors = require('cors'); // Importiere das cors-Modul
const app = express();
const { run } = require('./processing.js'); // Importiere die `run`-Funktion aus processing.js
const sharp = require('sharp');

// CORS-Konfiguration
const corsOptions = {
    origin: 'https://7e3473-cd.myshopify.com', // Erlaubte Domain
    methods: ['GET', 'POST'],                 // Erlaubte HTTP-Methoden
    allowedHeaders: ['Content-Type'],         // Erlaubte Header
};

// CORS-Middleware aktivieren
app.use(cors(corsOptions));

// Middleware für JSON-Parsing
app.use(express.json({ limit: '300mb' })); // Erlaubt große JSON-Bodies, z.B. für Base64-Bilder

// Route für den Bild-Upload
app.post('/upload', async (req, res) => {
    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        // Übergabe des Bildes an die `run`-Funktion zur Verarbeitung
        const resultBuffers = await run(image); // `run` gibt ein Array von Buffern zurück

        // Buffers skalieren und in Base64 kodieren
        const base64Images = await Promise.all(
            resultBuffers.map(async (buffer, index) => {
                console.log(`Buffer ${index + 1} - Original Länge: ${buffer.length}`);
                
                // Verkleinere die Buffer um 50%
                const resizedBuffer = await sharp(buffer)
                    .resize({ width: Math.round(metadata.width / 2), height: Math.round(metadata.height / 2) }) // Reduziere um 50%
                    .toBuffer();

                console.log(`Buffer ${index + 1} - Verkleinerte Länge: ${resizedBuffer.length}`);
                return `data:image/png;base64,${resizedBuffer.toString('base64')}`;
            })
        );

        // Rückgabe der Bilder an Shopify
        res.status(200).json({
            success: true,
            images: base64Images, // Array mit Base64-Bildern
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