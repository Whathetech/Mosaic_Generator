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
app.use(express.json({ limit: '300mb' })); // Erlaubt große JSON-Bodies, z.B. für Base64-Bilder

// Route für den Bild-Upload
app.post('/upload', async (req, res) => {
    console.log('Upload-Route wurde aufgerufen:', new Date());

    const { image } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        console.log('Bild empfangen. Start der Verarbeitung:', new Date());

        // Übergabe des Bildes an die `run`-Funktion zur Verarbeitung
        const resultBuffers = await run(image); // `run` gibt ein Array von Buffern zurück
        console.log('Verarbeitung abgeschlossen. Anzahl der Buffers:', resultBuffers.length);

        // Buffers in Base64 kodieren
        const base64Images = resultBuffers.map((buffer, index) => {
            console.log(`Buffer ${index + 1} - Länge: ${buffer.length}`);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        });

        console.log('Alle Bilder in Base64 umgewandelt. Anzahl:', base64Images.length);

        // Aufteilen in Pakete
        const batchSize = 5; // Anzahl der Bilder pro Paket
        const batches = [];
        for (let i = 0; i < base64Images.length; i += batchSize) {
            batches.push(base64Images.slice(i, i + batchSize));
        }

        console.log('Bilder in Pakete aufgeteilt. Anzahl der Pakete:', batches.length);

        // Rückgabe der Pakete an Shopify
        res.status(200).json({
            success: true,
            batches: batches // Array mit Paketen, jedes Paket ist ein Array von Base64-Bildern
        });

        console.log('Antwort erfolgreich an den Client gesendet:', new Date());
    } catch (error) {
        console.error('Fehler bei der Bildverarbeitung:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Bildverarbeitung.' });
    }
});

// Server starten
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

// Timeout auf 5 Minuten setzen
server.timeout = 5 * 60 * 1000; // 5 Minuten in Millisekunden
console.log('Server-Timeout auf 5 Minuten gesetzt.');