const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // Bibliothek zur Bildbearbeitung
const app = express();

// Multer-Setup für das Speichern von Bildern im Speicher (im Speicher als Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST-Endpunkt zum Empfangen und Bearbeiten des Bildes
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    // Bild im Buffer-Format
    const imageBuffer = req.file.buffer;

    // Bildbearbeitung mit sharp:
    // 1. Skalierung des Bildes
    // 2. Hinzufügen von Text auf das Bild
    const processedImage = await sharp(imageBuffer)
      .resize(500) // Das Bild auf eine Breite von 500px skalieren
      .composite([{
        input: Buffer.from('<svg><text x="10" y="50" font-size="48" fill="red">Mosaik</text></svg>'),
        top: 10,
        left: 10
      }]) // Text "Mosaik" hinzufügen
      .toBuffer();  // Das bearbeitete Bild als Buffer zurückgeben

    // Speicherort für das bearbeitete Bild
    const filePath = path.join(__dirname, 'processed-mosaic.png');

    // Das bearbeitete Bild speichern
    fs.writeFileSync(filePath, processedImage);

    // Antwort an den Client zurücksenden (z.B. die URL des gespeicherten Bildes)
    res.json({
      message: 'Bild erfolgreich verarbeitet',
      imageUrl: 'http://209.38.245.49/processed-mosaic.png'
    });
  } catch (error) {
    console.error('Fehler bei der Bildverarbeitung:', error);
    res.status(500).json({ message: 'Fehler bei der Bildverarbeitung' });
  }
});

// Static files (um das bearbeitete Bild zugänglich zu machen)
app.use(express.static(__dirname));

// Server starten
app.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});