// Module importieren
const axios = require('axios');
const sharp = require('sharp');
const colorDiff = require('color-diff');
const { colors, grayscales } = require('./colors.js');
const fs = require('fs');
const sharedData = require('./server.js'); // Importiere das gemeinsame Datenobjekt

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

// Globale Variablen für die Mosaikdimensionen
let mosaicWidth = 0;
let mosaicHeight = 0;

// Funktion zur Berechnung der Mosaikdimensionen
async function mosaicdimensions() {
    if (sharedData.height) {
        mosaicHeight = sharedData.height * 16; // Höhe berechnen
    }
    if (sharedData.width) {
        mosaicWidth = sharedData.width * 16; // Breite berechnen
    }
    console.log(`Aktualisierte Werte - Breite: ${mosaicWidth}, Höhe: ${mosaicHeight}`);
}

console.log(`Mosaikbreite: ${sharedData.height}, Mosaikhöhe: ${sharedData.width}`);
console.log(`Mosaikbreite: ${mosaicWidth}, Mosaikhöhe: ${mosaicHeight}`);

const blockSize = 32; // Größe des Blocks
const borderWidth = blockSize; // Breite des Rahmens (entspricht dem Radius eines Kreises)

async function processMosaic(base64Image) {
    try {
        // Base64-Bild dekodieren und in einen Buffer umwandeln
        const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        // Abrufen der Metadaten des empfangenen Bildes
        const metadata = await sharp(imageBuffer).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;

        console.log('Auflösung des Bildes:', `${originalWidth} x ${originalHeight}`);
        
        // Berechnen des Skalierungsfaktors für das Raster
        const scaleX = originalWidth / mosaicWidth;
        const scaleY = originalHeight / mosaicHeight;

        // Extrahieren der Rohbilddaten in einem Buffer (nur RGB)
        const imageData = await sharp(imageBuffer)
        .removeAlpha() // Entfernt den Alpha-Kanal
        .raw()
        .toBuffer();

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

        return {
            mosaicPixelsEuclidean,
            mosaicPixelsCIEDE,
            mosaicPixelsEuclideanFloyd,
            mosaicPixelsCIEDEFloyd,
            mosaicPixelsEuclideanGrayscales,
            mosaicPixelsCIEDEGrayscales,
            mosaicPixelsEuclideanFloydGrayscales,
            mosaicPixelsCIEDEFloydGrayscales
        };

    } catch (err) {
        console.error("Fehler beim Laden des Bildes:", err);
    }
}

// Funktion zum Erstellen des Mosaikbildes
function createMosaicImage(mosaicPixels) {
    
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

    let finalImageBuffer = Buffer.alloc(mosaicWidthWithBorder * mosaicHeightWithBorder * 4);

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
    return sharp(finalImageBuffer, { raw: { width: mosaicWidthWithBorder, height: mosaicHeightWithBorder, channels: 4 } })
    .png() // Konvertiere die Rohdaten in PNG
    .toBuffer()
    .then((buffer) => {
        return buffer;
    })
    .catch((err) => {
        console.error("Fehler beim Erstellen des Mosaik-Bildes:", err);
        throw err;
    });
}

async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

async function run(base64Image) {
    try {
        await mosaicdimensions();
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
        } = await processMosaic(base64Image);

        // Mosaik-Bilder für alle Varianten erstellen
        const mosaicBufferEuclidean = await createMosaicImage(mosaicPixelsEuclidean);
        const mosaicBufferCIEDE = await createMosaicImage(mosaicPixelsCIEDE);
        const mosaicBufferEuclideanFloyd = await createMosaicImage(mosaicPixelsEuclideanFloyd);
        const mosaicBufferCIEDEFloyd = await createMosaicImage(mosaicPixelsCIEDEFloyd);
        const mosaicBufferEuclideanGrayscales = await createMosaicImage(mosaicPixelsEuclideanGrayscales);
        const mosaicBufferCIEDEGrayscales = await createMosaicImage(mosaicPixelsCIEDEGrayscales);
        const mosaicBufferEuclideanFloydGrayscales = await createMosaicImage(mosaicPixelsEuclideanFloydGrayscales);
        const mosaicBufferCIEDEFloydGrayscales = await createMosaicImage(mosaicPixelsCIEDEFloydGrayscales);

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
module.exports = { mosaicdimensions };