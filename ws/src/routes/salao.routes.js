const express = require('express');
const router = express.Router();
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const turf = require('@turf/turf');

router.post('/', async (req, res) => {
    try {
        const salao = await new Salao (req.body). save();
        res.json({salao});
    } catch (err) {
        res.json({ erro: true, message: err.message });
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
            .select('capa nome endereco.cidade geo.coordinates telefone');

        const distance = turf.distance(
            turf.point(salao.geo.coordinates),
            turf.point([-35.381116, -7.951709]),
            { units: 'kilometers' }
        );

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