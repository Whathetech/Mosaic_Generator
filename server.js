const express = require('express');
const cors = require('cors'); // Importiere das cors-Modul
const emitter = require('./emitter'); // Importiere den separaten EventEmitter
const app = express();
const { run } = require('./processing.js'); // Importiere die `run`-Funktion aus processing.js

console.log('Server.js: Emitter definiert:', emitter instanceof EventEmitter);

// Gemeinsames Objekt für die Datenfreigabe
const sharedData = {
    height: null,
    width: null,
};

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

app.post('/upload', async (req, res) => {
    const { image, height, width } = req.body;

    if (!image) {
        console.error('Kein Bild empfangen.');
        return res.status(400).json({ success: false, message: 'Kein Bild empfangen.' });
    }

    if (!height || !width) {
        console.error('Höhe oder Breite nicht angegeben.');
        return res.status(400).json({ success: false, message: 'Höhe oder Breite fehlen.' });
    }

    // Höhe und Breite speichern
    sharedData.height = height;
    sharedData.width = width;

    console.log(`Empfangene Höhe: ${sharedData.height}, Empfangene Breite: ${sharedData.width}`);

    // Emitte das 'updated'-Ereignis mit den neuen Werten
    emitter.emit('updated', { height, width });

    try {
        // Übergabe des Bildes an die `run`-Funktion zur Verarbeitung
        const resultBuffers = await run(image);

        // Buffers in Base64 kodieren
        const base64Images = resultBuffers.map((buffer, index) => {
            console.log(`Buffer ${index + 1} - Länge: ${buffer.length}`);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        });

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

// Exportiere sowohl `sharedData` als auch `emitter`
module.exports = { sharedData, emitter };

// Server starten
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

// Timeout auf 5 Minuten setzen
server.timeout = 5 * 60 * 1000; // 5 Minuten in Millisekunden