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
        return response.data;
    } catch (error) {
        console.error('Fehler bei der Produkterstellung:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { createProduct };