const express = require('express');
const cors = require('cors');
const app = express();
const { run } = require('./processing.js'); // Importiere die `run`-Funktion aus processing.js

// CORS-Konfiguration
const corsOptions = {
    origin: 'https://7e3473-cd.myshopify.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

// CORS-Middleware aktivieren
app.use(cors(corsOptions));
app.use(express.json({ limit: '300mb' })); // Erlaubt große JSON-Bodies

app.post('/upload', async (req, res) => {
    console.log('[Server] Upload-Route wurde aufgerufen:', new Date());

    const { image } = req.body;

    if (!image) {
        console.error('[Server] Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    try {
        console.log('[Server] Bild empfangen. Start der Verarbeitung:', new Date());
        const resultBuffers = await run(image);

        console.log('[Server] Verarbeitung abgeschlossen. Anzahl der Buffers:', resultBuffers.length);

        const base64Images = resultBuffers.map((buffer, index) => {
            console.log(`[Server] Buffer ${index + 1} - Länge: ${buffer.length}`);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        });

        console.log('[Server] Alle Bilder in Base64 umgewandelt. Anzahl:', base64Images.length);

        const batchSize = 5; // Anzahl der Bilder pro Paket
        const batches = [];
        for (let i = 0; i < base64Images.length; i += batchSize) {
            const batch = base64Images.slice(i, i + batchSize);
            console.log(`[Server] Paket erstellt. Bilder in diesem Paket: ${batch.length}`);
            batches.push(batch);
        }

        console.log('[Server] Bilder in Pakete aufgeteilt. Anzahl der Pakete:', batches.length);

        res.status(200).json({
            success: true,
            batches: batches,
        });

        console.log('[Server] Pakete erfolgreich an Client gesendet:', new Date());
    } catch (error) {
        console.error('[Server] Fehler bei der Bildverarbeitung:', error);
        res.status(500).json({ success: false, message: 'Fehler bei der Bildverarbeitung.' });
    }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`[Server] Server läuft auf Port ${PORT}`);
});

server.timeout = 5 * 60 * 1000; // 5 Minuten Timeout
console.log('[Server] Server-Timeout auf 5 Minuten gesetzt.');