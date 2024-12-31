// Module importieren
const axios = require('axios');
const path = require('path');
const sharp = require('sharp');
const colorDiff = require('color-diff');
const { colors, grayscales } = require('./colors.js');
const fs = require('fs');


// Funktion zur Umwandlung von Hex-Codes in RGB
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

// Funktion zur Berechnung der euklidischen Distanz
function euclideanDistance(color1, color2) {
    return Math.sqrt(
        Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
    );
}

// Funktion zur Bestimmung der nächsten Farbe aus dem Pool (mit euklidischer Distanz)
function findClosestColorEuclidean(pixel, colorPool) {
    let closestColor = null;
    let minDistance = Infinity;

    Object.keys(colorPool).forEach(hexCode => {
        const poolColor = hexToRgb(hexCode);
        const distance = euclideanDistance(pixel, poolColor);

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = poolColor;
        }
    });

    return closestColor;
}

// Funktion zur Berechnung der CIEDE2000-Distanz
function ciede2000Distance(color1, color2) {
    return colorDiff.diff(color1, color2); // Berechnung der CIEDE2000-Distanz
}

// Funktion zur Bestimmung der nächsten Farbe aus dem Pool (mit CIEDE2000-Distanz)
function findClosestColorCIEDE(pixel, colorPool) {
    let closestColor = null;
    let minDistance = Infinity;

    Object.keys(colorPool).forEach(hexCode => {
        const poolColor = hexToRgb(hexCode);
        const distance = ciede2000Distance(pixel, poolColor);

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = poolColor;
        }
    });

    return closestColor;
}

// Funktion zur Anwendung des Floyd-Steinberg-Dithering
function floydSteinbergDither(x, y, pixel, newPixel, mosaicWidth, mosaicHeight, imageData, scaleX, scaleY) {
    const error = {
        r: pixel.r - newPixel.r,
        g: pixel.g - newPixel.g,
        b: pixel.b - newPixel.b
    };

    const distributeError = (dx, dy, factor) => {
        const nx = x + dx;
        const ny = y + dy;

        // Sicherstellen, dass die benachbarten Pixel innerhalb des Bildes liegen
        if (nx >= 0 && nx < mosaicWidth && ny >= 0 && ny < mosaicHeight) {
            // Berechnung der korrekten Pixelkoordinaten unter Verwendung der Skalierung
            const centerX = Math.floor(nx * scaleX + scaleX / 2);
            const centerY = Math.floor(ny * scaleY + scaleY / 2);

            const index = (centerY * mosaicWidth * scaleX + centerX) * 3;

            // Berechnung der neuen Farbwerte mit Fehlerverteilung und Rundung
            imageData[index] = Math.min(Math.max(imageData[index] + error.r * factor, 0), 255);
            imageData[index + 1] = Math.min(Math.max(imageData[index + 1] + error.g * factor, 0), 255);
            imageData[index + 2] = Math.min(Math.max(imageData[index + 2] + error.b * factor, 0), 255);
        }
    };

    // Fehlerverteilung an benachbarten Pixeln (Rechts, Unten links, Unten, Unten rechts)
    distributeError(1, 0, 7 / 16);  // Rechts
    distributeError(-1, 1, 3 / 16); // Unten links
    distributeError(0, 1, 5 / 16);  // Unten
    distributeError(1, 1, 1 / 16);  // Unten rechts
}

// Mosaikbilder
const EUKLID = "EUKLID.png";
const CIEDE = "CIEDE.png";
const EUKLIDFLOYD = "EUKLID_FLOYD.png";
const CIEDEFLOYD = "CIEDE_FLOYD.png";
const EUKLIDGRAYSCALES = "EUKLID_GRAYSCALES.png";
const CIEDEGRAYSCALES = "CIEDE_GRAYSCALES.png";
const EUKLIDFLOYDGRAYSCALES = "EUKLID_FLOYD_GRAYSCALES.png";
const CIEDEFLOYDGRAYSCALES = "CIEDE_FLOYD_GRAYSCALES.png";

// Verzeichnis zum Speichern der Mosaikbilder
const directory = path.dirname(__filename); // Aktuellen Verzeichnis-Pfad verwenden

// Pfade für Mosaike
const EUKLID_PATH = path.join(directory, EUKLID);
const CIEDE_PATH = path.join(directory, CIEDE);
const EUKLIDFLOYD_PATH = path.join(directory, EUKLIDFLOYD);
const CIEDEFLOYD_PATH = path.join(directory, CIEDEFLOYD);
const EUKLIDGRAYSCALES_PATH = path.join(directory, EUKLIDGRAYSCALES);
const CIEDEGRAYSCALES_PATH = path.join(directory, CIEDEGRAYSCALES);
const EUKLIDFLOYDGRAYSCALES_PATH = path.join(directory, EUKLIDFLOYDGRAYSCALES);
const CIEDEFLOYDGRAYSCALES_PATH = path.join(directory, CIEDEFLOYDGRAYSCALES);

console.log(EUKLID_PATH)

// Bildgröße des Mosaiks
const mosaicWidth = 64;
const mosaicHeight = 96;
const blockSize = 32; // Größe des Blocks
const borderWidth = blockSize; // Breite des Rahmens (entspricht dem Radius eines Kreises)

// POST-Route, um das Bild zu empfangen
app.post('/', (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: 'No image data provided' });
    }

    try {
        // Das Bild aus dem Base64-String dekodieren
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, ''); // Entfernt den Präfix
        const buffer = Buffer.from(base64Data, 'base64');

        // Pfad zur Speicherung des bearbeiteten Bildes
        const outputPath = path.join(__dirname, 'output', 'processed_image.png');

        // Das Bild auf der Festplatte speichern
        fs.writeFileSync(outputPath, buffer);
    }

async function processMosaic() {
    try {
        
        // Empfangen des Base64-Bildes im Request
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'Kein Bilddaten empfangen' });
        }

        try {
            // Das Bild aus dem Base64-String dekodieren
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, ''); // Entfernt den Präfix
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Metadaten des Bildes abrufen
            const metadata = await sharp(imageBuffer).metadata();
            const originalWidth = metadata.width;
            const originalHeight = metadata.height;

            // Berechnen des Skalierungsfaktors für das Raster
            const scaleX = originalWidth / mosaicWidth;
            const scaleY = originalHeight / mosaicHeight;

            // Extrahieren der Bilddaten in einem Buffer
            const imageData = await sharp(imageBuffer).raw().toBuffer();

            // Weitere Bildverarbeitung hier (falls gewünscht)
            // Zum Beispiel: Skalieren, Zuschneiden, etc.

            // Rückgabe der Metadaten oder der bearbeiteten Bilddaten
            res.json({
                width: originalWidth,
                height: originalHeight,
                scaleX: scaleX,
                scaleY: scaleY,
                imageData: imageData.toString('base64') // Optional: Base64 kodierte Bilddaten zurückgeben
            });

        } catch (error) {
            console.error('Fehler bei der Bildverarbeitung:', error);
            res.status(500).json({ error: 'Serverfehler bei der Bildverarbeitung' });
        }

        // Arrays für die acht Varianten
        let mosaicPixelsEuclidean = [];
        let mosaicPixelsCIEDE = [];
        let mosaicPixelsEuclideanFloyd = [];
        let mosaicPixelsCIEDEFloyd = [];
        let mosaicPixelsEuclideanGrayscales = [];
        let mosaicPixelsCIEDEGrayscales = [];
        let mosaicPixelsEuclideanFloydGrayscales = [];
        let mosaicPixelsCIEDEFloydGrayscales = [];

        // Grautöne
        const imageDataEuclideanFloyd = Buffer.from(imageData); // Für EUKLID_FLOYD
        const imageDataCIEDEFloyd = Buffer.from(imageData);    // Für CIEDE_FLOYD

        // Grautöne für Floyd-Steinberg
        const imageDataEuclideanFloydGrayscales = Buffer.from(imageData); // Für EUKLID_FLOYD
        const imageDataCIEDEFloydGrayscales = Buffer.from(imageData);    // Für CIEDE_FLOYD

        // Verarbeitung der Mosaik-Pixel für EUKLID und CIEDE
        for (let y = 0; y < mosaicHeight; y++) {
            for (let x = 0; x < mosaicWidth; x++) {
                const centerX = Math.floor(x * scaleX + scaleX / 2);
                const centerY = Math.floor(y * scaleY + scaleY / 2);

                const index = (centerY * originalWidth + centerX) * 3;
                const pixel = {
                    r: imageData[index],
                    g: imageData[index + 1],
                    b: imageData[index + 2]
                };

                // Farben
                // EUKLID
                const closestColorEUKLID = findClosestColorEuclidean(pixel, colors);
                mosaicPixelsEuclidean.push(closestColorEUKLID);

                // CIEDE
                const closestColorCIEDE = findClosestColorCIEDE(pixel, colors);
                mosaicPixelsCIEDE.push(closestColorCIEDE);

                // Grautöne
                // EUKLID
                const closestColorEUKLIDGRAYSCALES = findClosestColorEuclidean(pixel, grayscales);
                mosaicPixelsEuclideanGrayscales.push(closestColorEUKLIDGRAYSCALES);

                // CIEDE
                const closestColorCIEDEGRAYSCALES = findClosestColorCIEDE(pixel, grayscales);
                mosaicPixelsCIEDEGrayscales.push(closestColorCIEDEGRAYSCALES);
            }
        }

        // Separate Schleifen für Floyd-Steinberg
        for (let y = 0; y < mosaicHeight; y++) {
            for (let x = 0; x < mosaicWidth; x++) {
                const centerX = Math.floor(x * scaleX + scaleX / 2);
                const centerY = Math.floor(y * scaleY + scaleY / 2);

                const index = (centerY * originalWidth + centerX) * 3;
                const pixelEuclideanFloyd = {
                    r: imageDataEuclideanFloyd[index],
                    g: imageDataEuclideanFloyd[index + 1],
                    b: imageDataEuclideanFloyd[index + 2]
                };
                const pixelCIEDEFloyd = {
                    r: imageDataCIEDEFloyd[index],
                    g: imageDataCIEDEFloyd[index + 1],
                    b: imageDataCIEDEFloyd[index + 2]
                };
                const pixelCIEDEFloydGrayscales = {
                    r: imageDataEuclideanFloydGrayscales[index],
                    g: imageDataEuclideanFloydGrayscales[index + 1],
                    b: imageDataEuclideanFloydGrayscales[index + 2]
                };
                const pixelEuclideanFloydGrayscales = {
                    r: imageDataCIEDEFloydGrayscales[index],
                    g: imageDataCIEDEFloydGrayscales[index + 1],
                    b: imageDataCIEDEFloydGrayscales[index + 2]
                };

                // Farben
                // EUKLID + Floyd-Steinberg
                const closestColorEUKLIDFloyd = findClosestColorEuclidean(pixelEuclideanFloyd, colors);
                floydSteinbergDither(x, y, pixelEuclideanFloyd, closestColorEUKLIDFloyd, mosaicWidth, mosaicHeight, imageDataEuclideanFloyd, scaleX, scaleY);
                mosaicPixelsEuclideanFloyd.push(closestColorEUKLIDFloyd);

                // CIEDE + Floyd-Steinberg
                const closestColorCIEDEFloyd = findClosestColorCIEDE(pixelCIEDEFloyd, colors);
                floydSteinbergDither(x, y, pixelCIEDEFloyd, closestColorCIEDEFloyd, mosaicWidth, mosaicHeight, imageDataCIEDEFloyd, scaleX, scaleY);
                mosaicPixelsCIEDEFloyd.push(closestColorCIEDEFloyd);

                // Grautöne
                // EUKLID + Floyd-Steinberg
                const closestColorEUKLIDFloydGrayscales = findClosestColorEuclidean(pixelCIEDEFloydGrayscales, grayscales);
                floydSteinbergDither(x, y, pixelCIEDEFloydGrayscales, closestColorEUKLIDFloydGrayscales, mosaicWidth, mosaicHeight, imageDataEuclideanFloydGrayscales, scaleX, scaleY);
                mosaicPixelsEuclideanFloydGrayscales.push(closestColorEUKLIDFloydGrayscales);

                // CIEDE + Floyd-Steinberg
                const closestColorCIEDEFloydGrayscales = findClosestColorCIEDE(pixelEuclideanFloydGrayscales, grayscales);
                floydSteinbergDither(x, y, pixelEuclideanFloydGrayscales, closestColorCIEDEFloydGrayscales, mosaicWidth, mosaicHeight, imageDataCIEDEFloydGrayscales, scaleX, scaleY);
                mosaicPixelsCIEDEFloydGrayscales.push(closestColorCIEDEFloydGrayscales);
            }
        }

        
        const directory = path.dirname(__filename); // Aktuellen Verzeichnis-Pfad verwenden
        const schwarzesbild = "schwarzesbild.png";
        const schwarzesbild_path = path.join(directory, schwarzesbild);

        // Bildgröße (Breite und Höhe in Pixel)
        const width = 500;  // z. B. 500 Pixel
        const height = 500; // z. B. 500 Pixel

        // Schwarzes Bild erstellen (alle Pixel auf 0 setzen)
        const blackImageBuffer = Buffer.alloc(width * height * 3, 0); // 3 Kanäle (RGB), alle Werte auf 0

        // Bild speichern
        sharp(blackImageBuffer, {
            raw: {
                width: width,
                height: height,
                channels: 3 // RGB
            }
        })
            .toFile(schwarzesbild_path, (err) => {
                if (err) {
                    console.error('Fehler beim Speichern des schwarzen Bildes:', err);
                } else {
                    console.log(`Das schwarze Bild wurde erfolgreich unter '${schwarzesbild_path}' gespeichert.`);
                }
            });

        createMosaicImage(mosaicPixelsEuclidean, EUKLID_PATH);
        //createMosaicImage(mosaicPixelsCIEDE, CIEDE_PATH);
        //createMosaicImage(mosaicPixelsEuclideanFloyd, EUKLIDFLOYD_PATH);
        //createMosaicImage(mosaicPixelsCIEDEFloyd, CIEDEFLOYD_PATH);
        //createMosaicImage(mosaicPixelsEuclideanGrayscales, EUKLIDGRAYSCALES_PATH);
        //createMosaicImage(mosaicPixelsCIEDEGrayscales, CIEDEGRAYSCALES_PATH);
        //createMosaicImage(mosaicPixelsEuclideanFloydGrayscales, EUKLIDFLOYDGRAYSCALES_PATH);
        //createMosaicImage(mosaicPixelsCIEDEFloydGrayscales, CIEDEFLOYDGRAYSCALES_PATH);

    } catch (err) {
        console.error("Fehler beim Laden des Bildes:", err);
    }
}


// Funktion zum Erstellen des Mosaikbildes
function createMosaicImage(mosaicPixels, outputPath) {
    let mosaicImageBuffer = Buffer.alloc(mosaicWidth * mosaicHeight * blockSize * blockSize * 4); // 4 Werte pro Pixel (RGB + Alpha)

    // Mosaik-Pixel als Kreise ins Buffer einfügen
    mosaicPixels.forEach((pixel, index) => {
        const blockX = (index % mosaicWidth) * blockSize;
        const blockY = Math.floor(index / mosaicWidth) * blockSize;

        // Zeichne einen Kreis innerhalb des Blocks
        for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
                // Berechne den Abstand vom Mittelpunkt des Blocks
                const distance = Math.sqrt(Math.pow(bx - blockSize / 2, 2) + Math.pow(by - blockSize / 2, 2));

                // Wenn der Abstand vom Mittelpunkt kleiner als der Radius, zeichne den Pixel
                if (distance < blockSize / 2) {
                    const offset = ((blockY + by) * mosaicWidth * blockSize + (blockX + bx)) * 4;
                    mosaicImageBuffer[offset] = pixel.r;
                    mosaicImageBuffer[offset + 1] = pixel.g;
                    mosaicImageBuffer[offset + 2] = pixel.b;
                    mosaicImageBuffer[offset + 3] = 255; // Volle Deckkraft für den Kreis
                } else {
                    // Hintergrund schwarz setzen
                    const offset = ((blockY + by) * mosaicWidth * blockSize + (blockX + bx)) * 4;
                    mosaicImageBuffer[offset] = 0; // Schwarz
                    mosaicImageBuffer[offset + 1] = 0; // Schwarz
                    mosaicImageBuffer[offset + 2] = 0; // Schwarz
                    mosaicImageBuffer[offset + 3] = 255; // Volle Deckkraft
                }
            }
        }
    });

    // Schwarzen Rahmen um Mosaik hinzufügen
    const mosaicWidthWithBorder = mosaicWidth * blockSize + 2 * borderWidth;
    const mosaicHeightWithBorder = mosaicHeight * blockSize + 2 * borderWidth;

    let finalImageBuffer = Buffer.alloc(mosaicWidthWithBorder * mosaicHeightWithBorder * 4); // 4 Werte pro Pixel (RGBA)

    // Setze den schwarzen Rand
    for (let y = 0; y < mosaicHeightWithBorder; y++) {
        for (let x = 0; x < mosaicWidthWithBorder; x++) {
            const offset = (y * mosaicWidthWithBorder + x) * 4;
            if (x < borderWidth || x >= mosaicWidthWithBorder - borderWidth || y < borderWidth || y >= mosaicHeightWithBorder - borderWidth) {
                finalImageBuffer[offset] = 0; // Schwarz
                finalImageBuffer[offset + 1] = 0; // Schwarz
                finalImageBuffer[offset + 2] = 0; // Schwarz
                finalImageBuffer[offset + 3] = 255; // Volle Deckkraft für den Rand
            } else {
                // Kopiere das Mosaik in das finale Bild
                const mosaicX = (x - borderWidth) % (mosaicWidth * blockSize);
                const mosaicY = (y - borderWidth) % (mosaicHeight * blockSize);
                const mosaicOffset = (mosaicY * mosaicWidth * blockSize + mosaicX) * 4;
                finalImageBuffer[offset] = mosaicImageBuffer[mosaicOffset];
                finalImageBuffer[offset + 1] = mosaicImageBuffer[mosaicOffset + 1];
                finalImageBuffer[offset + 2] = mosaicImageBuffer[mosaicOffset + 2];
                finalImageBuffer[offset + 3] = mosaicImageBuffer[mosaicOffset + 3];
            }
        }
    }

    // Finales Bild mit schwarzem Rand erstellen
    sharp(finalImageBuffer, { raw: { width: mosaicWidthWithBorder, height: mosaicHeightWithBorder, channels: 4 } })
        .toFile(outputPath, (err) => {
            if (err) {
                console.error("Fehler beim Speichern des Mosaiks mit Rand:", err);
            } else {
                console.log(`Das Mosaik mit Rand wurde erfolgreich unter '${outputPath}' gespeichert.`);
            }
        });
}

async function run() {
    console.log("Mosaik wird generiert...");
    try {
        // Warten bis die Mosaik-Erstellung abgeschlossen ist
        await processMosaic();

        // Start der Mosaik-Erstellung
        const baseImages = [
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Couch.png",
                outputPath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/results/couch.png",
                overlayPosition: { left: 1474, top: 280 },
                scaleFactor: 0.26
            },
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Desk_1.png",
                outputPath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/results/desk1.png",
                overlayPosition: { left: 1325, top: 181 },
                scaleFactor: 0.285
            },
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Desk_2.png",
                outputPath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/results/desk2.png",
                overlayPosition: { left: 1420, top: 200 },
                scaleFactor: 0.285
            }
        ];        

        const overlayImagePaths = [
            EUKLID_PATH, //CIEDE_PATH, EUKLIDFLOYD_PATH, CIEDEFLOYD_PATH, EUKLIDGRAYSCALES_PATH, CIEDEGRAYSCALES_PATH, EUKLIDFLOYDGRAYSCALES_PATH, CIEDEFLOYDGRAYSCALES_PATH
        ];

        const targetResolution = { width: 2084, height: 3095 };

        for (const { baseImagePath, outputPath, overlayPosition, scaleFactor } of baseImages) {
            for (const [index, overlayImagePath] of overlayImagePaths.entries()) {
                await sharp(overlayImagePath)
                    .resize(targetResolution.width, targetResolution.height)
                    .toBuffer()
                    .then(resizedBuffer => {
                        return sharp(resizedBuffer)
                            .metadata()
                            .then(metadata => {
                                const newWidth = Math.round(metadata.width * scaleFactor);
                                const newHeight = Math.round(metadata.height * scaleFactor);

                                return sharp(resizedBuffer)
                                    .resize(newWidth, newHeight)
                                    .toBuffer()
                                    .then(overlayBuffer => {
                                        const newOutputPath = outputPath.replace(".png", `_${overlayImagePath.split("/").pop().replace(".png", "")}.png`);

                                        return sharp(baseImagePath)
                                            .composite([{ input: overlayBuffer, top: overlayPosition.top, left: overlayPosition.left }])
                                            .toFile(newOutputPath)
                                            .then(() => {
                                                console.log(`Das Bild wurde erfolgreich kombiniert und gespeichert: ${newOutputPath}`);
                                            });
                                    });
                            });
                    })
                    .catch(err => {
                        console.error('Fehler beim Zusammenfügen der Bilder:', err);
                    });
            }
        }

    } catch (error) {
        console.error("Fehler beim Warten auf Mosaik-Prozess:", error);
    }
}

// Starten der Funktion
//run();