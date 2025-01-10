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

        // Logge die gesamte Antwort von Shopify zur Fehlerbehebung
        console.log('Antwort von Shopify:', response.data);

        // Stelle sicher, dass nur das Produktobjekt zurückgegeben wird
        return response.data.product;
    } catch (error) {
        console.error('Fehler bei der Produkterstellung:', error.response ? error.response.data : error.message);
        throw error; // Wirft den Fehler erneut, sodass er im aufrufenden Code verarbeitet werden kann
    }
}

module.exports = { createProduct };