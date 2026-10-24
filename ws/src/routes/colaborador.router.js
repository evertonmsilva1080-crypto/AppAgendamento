const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Colaborador = require('../models/colaborador');
const SalaoColaborador = require('../models/relationship/salaoColaborador');
const ColaboradorServico = require('../models/relationship/colaboradorServico');

const moment = require('moment');

const asaas = require('../services/asaas');

router.post('/', async (req, res) => {

    const db = mongoose.connection;
    const session = await db.startSession();

    session.startTransaction();

    try {

        const { colaborador, salaoId } = req.body;

        let newColaborador = null;

        /*
        ==================================================
        VALIDANDO DADOS
        ==================================================
        */

        if (!colaborador) {
            throw new Error('O campo colaborador é obrigatório.');
        }

        if (!salaoId) {
            throw new Error('O campo salaoId é obrigatório.');
        }

        /*
        ==================================================
        PROCURANDO COLABORADOR
        ==================================================
        */

        const existentColaborador = await Colaborador.findOne({
            $or: [
                { email: colaborador.email },
                { telefone: colaborador.telefone },
            ],
        });

        /*
        ==================================================
        CRIANDO SUBCONTA ASAAS
        ==================================================
        */

        if (
            !existentColaborador &&
            colaborador.contaBancaria?.cpfCnpj
        ) {

            const asaasSubconta = await asaas('POST', '/accounts', {
                name: colaborador.nome,
                email: colaborador.email,
                cpfCnpj: colaborador.contaBancaria.cpfCnpj,
                phone: colaborador.telefone,
                birthDate: colaborador.dataNascimento,
                postalCode: colaborador.cep
            });

            /*
            ==============================================
            VERIFICANDO ERRO
            ==============================================
            */

            if (asaasSubconta.error) {

                throw new Error(
                    typeof asaasSubconta.message === 'string'
                        ? asaasSubconta.message
                        : JSON.stringify(asaasSubconta.message)
                );
            }

            console.log(
                'Subconta criada no Asaas:',
                asaasSubconta.data
            );

            /*
            ==============================================
            DADOS DA SUBCONTA
            ==============================================
            */

            const asaasAccountId =
                asaasSubconta.data.id;

            const asaasWalletId =
                asaasSubconta.data.walletId;

            const asaasApiKey =
                asaasSubconta.data.apiKey;

            /*
            ==============================================
            SALVANDO COLABORADOR
            ==============================================
            */

            newColaborador = await new Colaborador({

                ...colaborador,

                asaasAccountId,

                asaasWalletId,

                asaasApiKey,

            }).save({ session });
        }

        // Permite cadastrar o colaborador e vinculá-lo ao salão antes de
        // ter os dados bancários. Nesse fluxo, a subconta Asaas fica pendente.
        if (!existentColaborador && !newColaborador) {
            newColaborador = await new Colaborador(colaborador).save({ session });
        }

        /*
        ==================================================
        ID DO COLABORADOR
        ==================================================
        */

        const colaboradorId = existentColaborador
            ? existentColaborador._id
            : newColaborador._id;

        /*
        ==================================================
        RELAÇÃO COM O SALÃO
        ==================================================
        */

        const existentRelationship =
            await SalaoColaborador.findOne({
                salaoId,
                colaboradorId,
            });

        if (!existentRelationship) {

            await new SalaoColaborador({

                salaoId,

                colaboradorId,

                status: colaborador.vinculo,

            }).save({ session });
        }

        /*
        ==================================================
        REATIVANDO VÍNCULO
        ==================================================
        */

        if (
            existentRelationship &&
            existentRelationship.status === 'I'
        ) {

            await SalaoColaborador.findOneAndUpdate(

                {
                    salaoId,
                    colaboradorId,
                },

                {
                    status: 'A',
                },

                {
                    session,
                }
            );
        }

        /*
        ==================================================
        RELAÇÃO COM SERVIÇOS
        ==================================================
        */

        if (colaborador.especialidades?.length) {

            await ColaboradorServico.insertMany(

                colaborador.especialidades.map(
                    (servicoId) => ({
                        servicoId,
                        colaboradorId,
                    })
                ),

                { session }
            );
        }

        /*
        ==================================================
        COMMIT
        ==================================================
        */

        await session.commitTransaction();

        session.endSession();

        /*
        ==================================================
        COLABORADOR FINAL
        ==================================================
        */

        const colaboradorFinal =
            existentColaborador || newColaborador;

        /*
        ==================================================
        RESPOSTA
        ==================================================
        */

        if (
            existentRelationship &&
            existentColaborador
        ) {

            return res.json({

                error: true,

                message:
                    'Colaborador já cadastrado!',

            });
        }

        return res.json({

            error: false,

            colaborador: {

                _id: colaboradorFinal._id,

                nome: colaboradorFinal.nome,

                email: colaboradorFinal.email,

                asaasAccountId:
                    colaboradorFinal.asaasAccountId,

                asaasWalletId:
                    colaboradorFinal.asaasWalletId,

            },

        });

    } catch (err) {

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        session.endSession();

        console.error(
            'Erro ao cadastrar colaborador:',
            err
        );

        return res.status(500).json({

            error: true,

            message: err.message,

        });
    }
});


/*
==================================================
FILTER
==================================================
*/

router.post('/filter', async (req, res) => {

    try {

        const colaboradores = await Colaborador.find(req.body.filters);
        res.json({ error: false, colaboradores,});

    } catch (err) {
        res.json({error: true, message: err.message,});
    }
});

/*
==================================================
COLABORADORES DO SALÃO
==================================================
*/

router.get('/salao/:salaoId', async (req, res) => {

    try {

        const { salaoId } = req.params;
        let listaColaboradores = [];

        const colaboradores = await SalaoColaborador.find({ salaoId, status: { $ne: 'E' }, })
            .populate({ path: 'colaboradorId', select: '-senha -recepientId'})
            .select('colaboradorId dataCadastro status');

        for (let colaborador of colaboradores) {

            const especialidades = await ColaboradorServico.find({
                colaboradorId:colaborador.colaboradorId._id,});

            listaColaboradores.push({

                ...colaborador._doc,

                especialidades:
                    especialidades.map(
                        (e) => e.servicoId
                    ),

            });
        }

        res.json({

            error: false,

            colaboradores:
                listaColaboradores.map((vinculo) => ({

                    ...vinculo.colaboradorId._doc,
                    vinculoId: vinculo._id,
                    vinculo: vinculo.status,
                    especialidades:
                        vinculo.especialidades,
                    dataCadastro:
                        moment(vinculo.dataCadastro)
                            .format('DD/MM/YYYY'),

                })),

        });

    } catch (err) {

        res.json({

            error: true,

            message: err.message,

        });
    }
});


/*
==================================================
ATUALIZAR COLABORADOR
==================================================
*/

router.put('/:colaboradorId', async (req, res) => {

    try {

        const { vinculo, vinculoId, especialidades } = req.body;
        const { colaboradorId } = req.params;

        await Colaborador.findByIdAndUpdate( colaboradorId,req.body );

        /*
        ==============================================
        ATUALIZANDO VÍNCULO
        ==============================================
        */

        if (vinculo) {
            await SalaoColaborador.findByIdAndUpdate(vinculoId,{status: vinculo});
        }

        /*
        ==============================================
        ATUALIZANDO ESPECIALIDADES
        ==============================================
        */

        if (especialidades) {
            await ColaboradorServico.deleteMany({colaboradorId,});
            await ColaboradorServico.insertMany(especialidades.map((servicoId) => ({servicoId,colaboradorId,})));
        }
        res.json({error: false});

    } catch (err) {
        res.json({error: true, message: err.message,});
    }
});
/*
==================================================
EXCLUIR VÍNCULO
==================================================
*/
router.delete('/vinculo/:id', async (req, res) => {

    try {
        await SalaoColaborador.findByIdAndUpdate( req.params.id, {status: 'E'} );
        res.json({error: false});

    } catch (err) {
        res.json({error: true, message: err.message,});
    }
});

module.exports = router;
