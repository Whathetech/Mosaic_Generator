const express = require('express');
const cors = require('cors'); // Importiere das cors-Modul
const app = express();
const { run } = require('./processing.js'); // Importiere die `run`-Funktion aus processing.js

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
app.post('/upload', async (req, res) => {
    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        console.log('Bild erfolgreich empfangen!');
        console.log('Länge der empfangenen Base64-Daten:', image.length);

        // Übergabe des Bildes an die `run`-Funktion zur Verarbeitung
        console.log('Starte Verarbeitung in der `run`-Funktion...');
        const resultBuffers = await run(image); // `run` gibt ein Array von Buffern zurück
        console.log('Verarbeitung in der `run`-Funktion abgeschlossen.');

        // Buffers in Base64 kodieren
        console.log('Konvertiere Result-Buffers in Base64...');
        const base64Images = resultBuffers.map((buffer, index) => {
            console.log(`Buffer ${index + 1} - Länge: ${buffer.length}`);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        });

        // Debugging der erzeugten Base64-Daten
        base64Images.forEach((base64Image, index) => {
            console.log(`Base64-Bild ${index + 1} - Länge: ${base64Image.length}`);
        });

        // Rückgabe der Bilder an Shopify
        console.log('Sende verarbeitete Bilder an Shopify...');
        res.status(200).json({
            success: true,
            message: 'Bilder wurden erfolgreich verarbeitet.',
            images: base64Images, // Array mit Base64-Bildern
        });
        console.log('Erfolgreiche Antwort an Shopify gesendet.');
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
