const axios = require('axios');

async function createProduct(title, price) {
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const shopUrl = process.env.SHOPIFY_STORE_URL;

    try {
        const response = await axios.post(
            `${shopUrl}/admin/api/2023-10/products.json`,
            {
                product: {
                    title,
                    variants: [{ price }]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': shopifyAccessToken
                }
            }
        );

        // Logge die gesamte Antwort von Shopify
        console.log('Antwort von Shopify:', response.data);

        // Überprüfe, ob das Produktobjekt existiert
        if (response.data.product) {
            console.log(`Produkt erfolgreich erstellt: ID=${response.data.product.id}`);
            return response.data.product;
        } else {
            console.error('Kein Produkt in der Antwort gefunden.');
            return null; // Rückgabe null, wenn das Produkt nicht gefunden wird
        }
    } catch (error) {
        console.error('Fehler bei der Produkterstellung:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { createProduct };