const axios = require('axios');
require('dotenv').config();

async function createProduct(title, price) {
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const shopUrl = process.env.SHOPIFY_STORE_URL;

    try {
        const response = await axios.post(
            `${shopUrl}/admin/api/2025-01/products.json`,
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

async function checkTokenValidity() {
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Dein Access Token
    const shopUrl = process.env.SHOPIFY_STORE_URL; // Dein Shop-URL (z. B. https://deinshop.myshopify.com)

    try {
        const response = await axios.get(`${shopUrl}/admin/api/2023-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': shopifyAccessToken
            }
        });

        // Erfolgreiche Antwort
        console.log('Zugriff auf Shop-Daten erfolgreich:', response.data);
    } catch (error) {
        // Fehler beim Zugriff
        console.error('Fehler bei der Token-Überprüfung:', error.response?.data || error.message);
    }
}

module.exports = { 
    createProduct,
    checkTokenValidity
};