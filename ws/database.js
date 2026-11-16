const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env'),
});

const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

if (!URI) {
    throw new Error('A variável MONGODB_URI não foi configurada em ws/.env.');
}

mongoose
    .connect(URI, { dbName: 'AgendaFacil' })
    .then(() => {
        console.log('DB is Up!');
    })
    .catch((err) => {
        console.error('Erro ao conectar ao MongoDB:', err);
    });
