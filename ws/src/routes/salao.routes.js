const express = require('express');
const router = express.Router();
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const turf = require('@turf/turf');
const { requireAuth, requireRole, requireSalonOwner } = require('../auth/middleware');

router.post('/', (req, res) => res.status(410).json({ error: true, message: 'Use /auth/register/salao para criar uma conta.' }));
// Lista dados públicos dos salões para a vitrine da página inicial.
router.get('/', async (req, res) => {
    try {
        const saloes = await Salao.find({})
            .select('_id nome foto capa endereco.cidade endereco.uf')
            .sort({ nome: 1 })
            .lean();
        return res.json({ error: false, saloes });
    } catch (err) {
        console.error('Erro ao listar salões públicos:', err);
        return res.status(500).json({ error: true, message: 'Não foi possível carregar os estabelecimentos.' });
    }
});

router.put('/:id', requireAuth, requireRole('salao'), requireSalonOwner, async (req, res) => {
    try {
        const { id } = req.params;
        if (!require('mongoose').isValidObjectId(id)) {
            return res.status(400).json({ error: true, message: 'ID do salão inválido.' });
        }
        const { nome, foto, telefone, diasFuncionamento } = req.body;
        const atualizacao = {};
        if (nome !== undefined) {
            if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: true, message: 'Informe um nome válido.' });
            atualizacao.nome = nome.trim();
        }
        if (foto !== undefined) {
            if (typeof foto !== 'string') return res.status(400).json({ error: true, message: 'Informe uma URL de logo válida.' });
            atualizacao.foto = foto.trim();
        }
        if (telefone !== undefined) atualizacao.telefone = telefone;
        if (diasFuncionamento !== undefined) {
            if (!Array.isArray(diasFuncionamento) || diasFuncionamento.some(dia => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
                return res.status(400).json({ error: true, message: 'diasFuncionamento deve conter números de 0 (domingo) a 6 (sábado).' });
            }
            atualizacao.diasFuncionamento = [...new Set(diasFuncionamento)];
        }
        const salao = await Salao.findByIdAndUpdate(id, { $set: atualizacao }, { new: true, runValidators: true })
            .select('capa nome foto telefone endereco.cidade geo.coordinates diasFuncionamento');
        if (!salao) return res.status(404).json({ error: true, message: 'Salão não encontrado.' });
        return res.json({ error: false, salao });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.get('/servicos/:salaoId', async (req, res) => {
    try {
        const { salaoId } = req.params;
        const servicos = await Servico.find({
            salaoId,
            status: 'A'
        }).select('_id titulo');

        res.json({ 
            servicos: servicos.map(s => ({ label: s.titulo, value: s._id}))
        })
    } catch (error) {
        res.json({ erro: true, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {

        const salao = await Salao.findById(req.params.id)
            .select('capa nome foto telefone endereco.rua endereco.cidade endereco.uf geo.coordinates diasFuncionamento');
        if (!salao) return res.status(404).json({ error: true, message: 'Salão não encontrado.' });
        const coordinates = salao.geo?.coordinates;
        const distance = Array.isArray(coordinates) && coordinates.length === 2
            ? turf.distance(
                turf.point(coordinates),
                turf.point([-35.381116, -7.951709]),
                { units: 'kilometers' }
            )
            : null;

        res.json({
            error: false,
            salao,
            distancia: distance
        });

    } catch (err) {
        res.json({
            erro: true,
            message: err.message
        });
    }
});

module.exports = router;
