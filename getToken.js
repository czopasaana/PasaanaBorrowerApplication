require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');

const tenantId = process.env.DB_TENANT_ID;
const clientId = process.env.DB_CLIENT_ID;
const clientSecret = process.env.DB_CLIENT_SECRET;

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

async function getToken() {
try {
const tokenResponse = await credential.getToken('https://database.windows.net/.default');
console.log('Token acquired successfully.');
return tokenResponse.token;
} catch (error) {
console.error('Token acquisition error:', error);
throw error;
}
}

module.exports = getToken;