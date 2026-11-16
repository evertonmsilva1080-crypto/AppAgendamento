const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env'),
});

const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;
let connectionPromise = null;

function connectDatabase() {
    if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

    if (!URI) {
        return Promise.reject(new Error('A variável MONGODB_URI não foi configurada.'));
    }

    if (mongoose.connection.readyState === 2 && connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(URI, {
        dbName: 'AgendaFacil',
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
    }).then(() => {
        console.log('Conexão com o banco AgendaFacil estabelecida.');
        return mongoose;
    }).catch(error => {
        connectionPromise = null;
        throw error;
    });

    return connectionPromise;
}

module.exports = connectDatabase;
