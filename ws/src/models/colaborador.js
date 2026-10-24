const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const contaBancariaSchema = new Schema({
    titular: { type: String, required: true },
    cpfCnpj: { type: String, required: true },
    banco: { type: String, required: true },
    tipo: { type: String, required: true },
    agencia: { type: String, required: true },
    numero: { type: String, required: true },
    dv: { type: String, required: true },
}, { _id: false });

const colaborador = new Schema({

    nome: {
        type: String,
        required: true,
    },

    telefone: {
        type: String,
        required: true,
    },

    email: {
        type: String,
        required: true,
    },

    senha: {
        type: String,
        default: null,
    },

    foto: {
        type: String,
        required: true,
    },

    dataNascimento: {
        type: String,
        required: true,
    },

    sexo: {
        type: String,
        enum: ['M', 'F'],
        required: true,
    },

    status: {
        type: String,
        required: true,
        enum: ['A', 'I'],
        default: 'A'
    },

    // Opcional durante o cadastro inicial. Quando informado, os campos
    // continuam obrigatórios; pode ser preenchido posteriormente.
    contaBancaria: {
        type: contaBancariaSchema,
        required: false,
        default: undefined,
    },

    // ==========================================
    // DADOS DA SUBCONTA ASAAS
    // ==========================================

    asaasAccountId: {
        type: String,
        default: null
    },

    asaasWalletId: {
        type: String,
        default: null
    },

    asaasApiKey: {
        type: String,
        default: null
    },

    dataCadastro: {
        type: Date,
        default: Date.now,
    },

});

module.exports = mongoose.model('Colaborador', colaborador);
