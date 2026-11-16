const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cliente = new Schema ({
    nome: {
        type: String,
        required:true,
    },
    telefone: {
        type: String,
        required:true,
    },
    email: {
        type: String,
        required:true,
    },
    senha: {
        type: String,
        default: null,
    },
    foto: {
        type: String,
        default: null,
    },
    dataNascimento: {
        type: String,
        required:true,
    },
    sexo: {
        type: String,
        enum: ['M','F'],
        required:true,
    },
    status: {
        type: String,
        required:true,
        enum: ['A','I'],
        default: 'A'
    },
    documento: {
        tipo: {
            type: String,
            enum: ['individual','corporation'],
        },
        numero: {
            type: String,
        },
    },
    endereco: {
        cidade: String,
        uf: String,
        cep: String,
        numero: String,
        pais: String,
    },
    asaasCustomerId: {
        type: String,
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Cliente', cliente);
