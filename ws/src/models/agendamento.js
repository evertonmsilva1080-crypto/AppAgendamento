const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const agendamento = new Schema({
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
    transctionId: {
        type: String,
        required: true,
    },
    dataCadastro: {
        type: Date,
        required: true,
    },
});

salao.index({ geo: '2dsphere' });

module.exports = mongoose.model('Agendamento', agendamento);