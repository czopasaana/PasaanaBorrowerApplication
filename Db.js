require('dotenv').config();
const sql = require('mssql');
const getToken = require('./getToken');

const baseConfig = {
server: process.env.DB_SERVER,
options: {
database: process.env.DB_DATABASE,
encrypt: true, // For Azure SQL
trustServerCertificate: false,
},
authentication: {
type: 'azure-active-directory-access-token',
options: {},
},
};

async function getConnection(retryCount = 3, retryDelay = 2000) {
const token = await getToken();
const config = {
...baseConfig,
authentication: {
type: 'azure-active-directory-access-token',
options: {
token: token,
},
},
};

for (let attempt = 1; attempt <= retryCount; attempt++) {
try {
const pool = await sql.connect(config);
return pool;
} catch (error) {
console.error(`Database connection attempt ${attempt} failed:`, error.message);

if (attempt < retryCount) {
console.log(`Retrying in ${retryDelay / 1000} seconds...`);
await new Promise(resolve => setTimeout(resolve, retryDelay));
} else {
console.error('All retry attempts failed.');
throw error;
}
}
}
}

async function getData() {
const pool = await sql.connect({
server: process.env.DB_SERVER,
database: process.env.DB_DATABASE,
authentication: {
type: 'azure-active-directory-access-token',
options: {
token: await getToken()
}
}
});

const result = await pool.request()
.query('SELECT message FROM messages');
return result.recordset;
}

module.exports = {
sql,
getConnection,
getData,
};