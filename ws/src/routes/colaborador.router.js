const express = require('express');
const router = express.Router();
const mogoose = require('mongoose');
const Colaborador = require('../models/colaborador');
const { default: mongoose } = require('mongoose');

router.post('/', async (req, res) => {

    const db = mongoose.connection;
    const session = await db.startSession();

    try {

        const { colaborador, salaoId} = req.body;

        const existentColaborador = await Colaborador.findOne({
            $or: [
                { email: colaborador.email },
                { telefone: colaborador.telefone },
                { cpf: colaborador.cpf },
            ]
        });

        if (!existentColaborador) {

            const { contaBancaria } = colaborador;

        }

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;