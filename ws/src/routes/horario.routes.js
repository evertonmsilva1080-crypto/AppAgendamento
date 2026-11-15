const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const _ = require('lodash');
const router = express.Router();

const Horario = require('../models/horario');
const Servico = require('../models/servico');
const Colaborador = require('../models/colaborador');
const SalaoColaborador = require('../models/relationship/salaoColaborador');
const ColaboradorServico = require('../models/relationship/colaboradorServico');

async function validarHorario(dados) {
    const { salaoId, especialidades, colaboradores, dias, inicio, fim } = dados;
    if (!mongoose.isValidObjectId(salaoId)) return { erro: 'Informe um salaoId válido.' };
    if (!Array.isArray(especialidades) || !Array.isArray(colaboradores)) {
        return { erro: 'especialidades e colaboradores devem ser arrays de IDs.' };
    }
    if (!Array.isArray(dias) || !dias.length || dias.some(dia => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
        return { erro: 'dias deve conter um ou mais números de 0 (domingo) a 6 (sábado).' };
    }

    const idsServicos = [...new Set(especialidades.map(String))];
    const idsColaboradores = [...new Set(colaboradores.map(String))];
    if (idsServicos.some(id => !mongoose.isValidObjectId(id)) || idsColaboradores.some(id => !mongoose.isValidObjectId(id))) {
        return { erro: 'Um ou mais IDs de serviços ou colaboradores são inválidos.' };
    }

    const inicioMoment = moment(inicio);
    const fimMoment = moment(fim);
    if (!inicioMoment.isValid() || !fimMoment.isValid()) return { erro: 'Informe horários de início e fim válidos.' };
    const minutosInicio = inicioMoment.hours() * 60 + inicioMoment.minutes();
    const minutosFim = fimMoment.hours() * 60 + fimMoment.minutes();
    if (minutosFim <= minutosInicio) return { erro: 'O fechamento precisa ser depois da abertura no mesmo dia.' };

    if (idsServicos.length) {
        const servicosDoSalao = await Servico.find({
            _id: { $in: idsServicos },
            salaoId,
            status: { $ne: 'E' },
        }).select('_id');
        if (servicosDoSalao.length !== idsServicos.length) {
            return { erro: 'Todas as especialidades precisam ser serviços deste salão.' };
        }
    }

    if (idsColaboradores.length) {
        const [vinculos, colaboradoresAtivos] = await Promise.all([
            SalaoColaborador.find({
                salaoId,
                colaboradorId: { $in: idsColaboradores },
                status: 'A',
            }).select('colaboradorId'),
            Colaborador.find({
                _id: { $in: idsColaboradores },
                status: 'A',
            }).select('_id'),
        ]);
        if (vinculos.length !== idsColaboradores.length || colaboradoresAtivos.length !== idsColaboradores.length) {
            return { erro: 'Todos os colaboradores precisam estar ativos e vinculados a este salão.' };
        }
    }

    return {
        valor: {
            salaoId,
            especialidades: idsServicos,
            colaboradores: idsColaboradores,
            dias: [...new Set(dias)],
            inicio: inicioMoment.toDate(),
            fim: fimMoment.toDate(),
        },
    };
}

router.post('/', async (req, res) => {
    try {
        const validacao = await validarHorario(req.body);
        if (validacao.erro) return res.status(400).json({ error: true, message: validacao.erro });
        const horario = await new Horario(validacao.valor).save();
        return res.status(201).json({ error: false, horario });
    } catch (err) {
        console.error('Erro ao criar horário:', err);
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.get('/salao/:salaoId', async (req, res) => {
    try {
        const { salaoId } = req.params;
        const horario = await Horario.find({ salaoId });
        return res.json({ error: false, horario });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.put('/:horarioId', async (req, res) => {
    try {
        const { horarioId } = req.params;
        if (!mongoose.isValidObjectId(horarioId)) {
            return res.status(400).json({ error: true, message: 'Informe um horarioId válido.' });
        }
        const validacao = await validarHorario(req.body);
        if (validacao.erro) return res.status(400).json({ error: true, message: validacao.erro });

        const horario = await Horario.findOneAndUpdate(
            { _id: horarioId, salaoId: validacao.valor.salaoId },
            {
                $set: {
                    especialidades: validacao.valor.especialidades,
                    colaboradores: validacao.valor.colaboradores,
                    dias: validacao.valor.dias,
                    inicio: validacao.valor.inicio,
                    fim: validacao.valor.fim,
                },
            },
            { new: true, runValidators: true }
        );
        if (!horario) return res.status(404).json({ error: true, message: 'Horário não encontrado neste salão.' });
        return res.json({ error: false, horario });
    } catch (err) {
        console.error('Erro ao atualizar horário:', err);
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.post('/colaboradores', async (req, res) => {
    try {
        const colaboradorServico = await ColaboradorServico.find({
            servicoId: { $in: req.body.especialidades },
            status: 'A',
        })
            .populate('colaboradorId', 'nome')
            .select('colaboradorId -_id');

        const listaColaboradores = _.uniqBy(
            colaboradorServico,
            vinculo => vinculo.colaboradorId._id.toString()
        ).map(vinculo => ({
            label: vinculo.colaboradorId.nome,
            value: vinculo.colaboradorId._id,
        }));

        return res.json({ error: false, listaColaboradores });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.delete('/:horarioId', async (req, res) => {
    try {
        const { horarioId } = req.params;
        const { salaoId } = req.body || {};
        if (!mongoose.isValidObjectId(horarioId) || !mongoose.isValidObjectId(salaoId)) {
            return res.status(400).json({ error: true, message: 'Informe horarioId e salaoId válidos.' });
        }
        const horario = await Horario.findOneAndDelete({ _id: horarioId, salaoId });
        if (!horario) return res.status(404).json({ error: true, message: 'Horário não encontrado neste salão.' });
        return res.json({ error: false });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

module.exports = router;