const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const agendamento = new Schema({
    clienteId: {
        type: mongoose.Types.ObjectId,
        ref: 'Cliente',
        required: true,
    },
    salaoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Salao',
        required: true,
    },
    servicoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Servico',
        required: true,
    },
    colaboradorId: {
        type: mongoose.Types.ObjectId,
        ref: 'Colaborador',
        required: true,
    },
    data: {
        type: Date,
        required: true,
    },
    comissao: {
        type: Number,
        required: true,
    },
    valor: {
        type: Number,
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
    },
    paymentStatus: {
        type: String,
        required: true,
    },
    invoiceUrl: String,
    taxaSalaoPercentual: {
        type: Number,
        required: true,
    },
    taxaColaboradorPercentual: {
        type: Number,
        required: true,
    },
    taxaAppPercentual: {
        type: Number,
        required: true,
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
});

agendamento.index({ salaoId: 1, data: 1 });

module.exports = mongoose.model('Agendamento', agendamento);
