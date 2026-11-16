const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const salao = new Schema({
    nome: {
        type: String,
        required: [true, 'Nome é obrigatório.'],

    },
    foto: String,
    capa: String,
    email: {
        type: String,
        required: [true, 'E-mail é obrigatório.'],
    },
    senha: {
        type: String,
        default: null,
    },
    telefone: String,
    asaasWalletId: {
        type: String,
        default: null,
    },
    endereco: {
        rua: String,
        cidade: String,
        uf: String,
        cep: String,
        numero: String,
        pais: String,
    },
    diasFuncionamento: {
        type: [Number],
        default: undefined,
        validate: { validator: dias => dias.every(dia => Number.isInteger(dia) && dia >= 0 && dia <= 6), message: 'Dias de funcionamento inválidos.' },
    },
    geo: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
    },
});

salao.index({ geo: '2dsphere' });

module.exports = mongoose.model('Salao', salao);
