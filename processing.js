// Module importieren
const axios = require('axios');
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

const blockSize = 32; // Größe des Blocks
const borderWidth = blockSize; // Breite des Rahmens (entspricht dem Radius eines Kreises)

async function processMosaic(base64Image, mosaicHeight, mosaicWidth) {
    try {
        console.log("Starte Verarbeitung des Mosaiks...");
        console.log(`Eingehende Parameter - MosaicHeight: ${mosaicHeight}, MosaicWidth: ${mosaicWidth}`);

        // Base64-Bild dekodieren und in einen Buffer umwandeln
        const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        // Abrufen der Metadaten des empfangenen Bildes
        const metadata = await sharp(imageBuffer).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;

        console.log('Auflösung des empfangenen Bildes:', `${originalWidth} x ${originalHeight}`);

        // Berechnen des Skalierungsfaktors für das Raster
        const scaleX = originalWidth / mosaicWidth;
        const scaleY = originalHeight / mosaicHeight;
        console.log(`Berechnete Skalierungsfaktoren - ScaleX: ${scaleX}, ScaleY: ${scaleY}`);

        // Extrahieren der Rohbilddaten in einem Buffer (nur RGB)
        const imageData = await sharp(imageBuffer)
            .removeAlpha() // Entfernt den Alpha-Kanal
            .raw()
            .toBuffer();

        console.log("Rohbilddaten erfolgreich extrahiert. Länge des Buffers:", imageData.length);

        // Debugging für Schleifen
        console.log("Starte Verarbeitung der Mosaik-Pixel...");

        // Verarbeitung der Mosaik-Pixel für EUKLID und CIEDE
        for (let y = 0; y < mosaicHeight; y++) {
            for (let x = 0; x < mosaicWidth; x++) {
                const centerX = Math.floor(x * scaleX + scaleX / 2);
                const centerY = Math.floor(y * scaleY + scaleY / 2);

                if (centerX >= originalWidth || centerY >= originalHeight) {
                    console.warn(
                        `Warnung: Pixel außerhalb der Bildgrenzen! X: ${centerX}, Y: ${centerY}, OriginalWidth: ${originalWidth}, OriginalHeight: ${originalHeight}`
                    );
                }

                const index = (centerY * originalWidth + centerX) * 3;

                // Debugging der Pixel-Koordinaten
                console.log(`Verarbeite Pixel an Mosaik-Koordinaten (X: ${x}, Y: ${y}) => Bildkoordinaten (X: ${centerX}, Y: ${centerY}), Index: ${index}`);
            }
        }

        console.log("Verarbeitung der Mosaik-Pixel abgeschlossen.");

        return {
            // Rückgabe der erstellten Mosaik-Arrays
        };

    } catch (err) {
        console.error("Fehler beim Verarbeiten des Mosaiks:", err);
        throw err;
    }
}

// Funktion zum Erstellen des Mosaikbildes
function createMosaicImage(mosaicPixels) {
    try {
        console.log("Starte Erstellung des Mosaik-Bildes...");
        console.log(`Anzahl der Mosaik-Pixel: ${mosaicPixels.length}`);

        // Debugging für Dimensionsberechnungen
        console.log(`Mosaikbreite: ${mosaicWidth}, Mosaikhöhe: ${mosaicHeight}, Blockgröße: ${blockSize}, Rahmenbreite: ${borderWidth}`);

        const mosaicWidthWithBorder = mosaicWidth * blockSize + 2 * borderWidth;
        const mosaicHeightWithBorder = mosaicHeight * blockSize + 2 * borderWidth;

        console.log(`Breite mit Rahmen: ${mosaicWidthWithBorder}, Höhe mit Rahmen: ${mosaicHeightWithBorder}`);

        // Debugging der Schleifen
        mosaicPixels.forEach((pixel, index) => {
            const blockX = (index % mosaicWidth) * blockSize;
            const blockY = Math.floor(index / mosaicWidth) * blockSize;

            if (index % 100 === 0) {
                console.log(`Verarbeite Block bei Index ${index} - BlockX: ${blockX}, BlockY: ${blockY}`);
            }
        });

        console.log("Mosaik-Bild erfolgreich erstellt.");
        return finalImageBuffer;
    } catch (err) {
        console.error("Fehler beim Erstellen des Mosaik-Bildes:", err);
        throw err;
    }
}

async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

async function run(base64Image, width, height) {
    try {
        mosaicHeight = width * 16;   
        mosaicWidth = height * 16;

        // Alle Varianten von Mosaik-Daten abrufen
        const {
            mosaicPixelsEuclidean,
            mosaicPixelsCIEDE,
            mosaicPixelsEuclideanFloyd,
            mosaicPixelsCIEDEFloyd,
            mosaicPixelsEuclideanGrayscales,
            mosaicPixelsCIEDEGrayscales,
            mosaicPixelsEuclideanFloydGrayscales,
            mosaicPixelsCIEDEFloydGrayscales
        } = await processMosaic(base64Image, mosaicHeight, mosaicWidth);

        // Mosaik-Bilder für alle Varianten erstellen
        const mosaicBufferEuclidean = await createMosaicImage(mosaicPixelsEuclidean, mosaicHeight, mosaicWidth);
        const mosaicBufferCIEDE = await createMosaicImage(mosaicPixelsCIEDE, mosaicHeight, mosaicWidth);
        const mosaicBufferEuclideanFloyd = await createMosaicImage(mosaicPixelsEuclideanFloyd, mosaicHeight, mosaicWidth);
        const mosaicBufferCIEDEFloyd = await createMosaicImage(mosaicPixelsCIEDEFloyd, mosaicHeight, mosaicWidth);
        const mosaicBufferEuclideanGrayscales = await createMosaicImage(mosaicPixelsEuclideanGrayscales, mosaicHeight, mosaicWidth);
        const mosaicBufferCIEDEGrayscales = await createMosaicImage(mosaicPixelsCIEDEGrayscales, mosaicHeight, mosaicWidth);
        const mosaicBufferEuclideanFloydGrayscales = await createMosaicImage(mosaicPixelsEuclideanFloydGrayscales, mosaicHeight, mosaicWidth);
        const mosaicBufferCIEDEFloydGrayscales = await createMosaicImage(mosaicPixelsCIEDEFloydGrayscales, mosaicHeight, mosaicWidth);

        // Ergebnisse an `resultBuffers` anhängen
        const resultBuffers = [
            mosaicBufferEuclidean,
            mosaicBufferCIEDE,
            mosaicBufferEuclideanFloyd,
            mosaicBufferCIEDEFloyd,
            mosaicBufferEuclideanGrayscales,
            mosaicBufferCIEDEGrayscales,
            mosaicBufferEuclideanFloydGrayscales,
            mosaicBufferCIEDEFloydGrayscales
        ];

        // Weitere Verarbeitung mit Hintergrundbildern
        const baseImages = [
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Couch.png",
                overlayPosition: { left: 1474, top: 280 },
                scaleFactor: 0.26
            },
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Desk_1.png",
                overlayPosition: { left: 1325, top: 181 },
                scaleFactor: 0.285
            },
            {
                baseImagePath: "https://raw.githubusercontent.com/Whathetech/Mosaic_Generator/36acef7c66d34ef4ede11130e70328eae7d4cfcd/background_images/Cropped_Portrait/Desk_2.png",
                overlayPosition: { left: 1420, top: 200 },
                scaleFactor: 0.285
            }
        ];

        const targetResolution = { width: 2084, height: 3095 };

        for (const { baseImagePath, overlayPosition, scaleFactor } of baseImages) {
            const baseImageBuffer = await downloadImage(baseImagePath);
            const resizedBuffer = await sharp(mosaicBufferEuclidean)
                .resize(targetResolution.width, targetResolution.height)
                .toBuffer();

            const metadata = await sharp(resizedBuffer).metadata();
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);

            const overlayBuffer = await sharp(resizedBuffer)
                .resize(newWidth, newHeight)
                .toBuffer();

            const combinedBuffer = await sharp(baseImageBuffer)
                .composite([{ input: overlayBuffer, top: overlayPosition.top, left: overlayPosition.left }])
                .toBuffer();

            //resultBuffers.push(combinedBuffer);
        }

        return resultBuffers;
    } catch (error) {
        console.error("Fehler bei der Mosaik-Erstellung:", error);
        throw error;
    }
}

module.exports = { run };