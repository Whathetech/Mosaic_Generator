const express = require('express');
const app = express();

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