const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const router = express.Router();

const Colaborador = require('../models/colaborador');
const SalaoColaborador = require('../models/relationship/salaoColaborador');
const ColaboradorServico = require('../models/relationship/colaboradorServico');
const Servico = require('../models/servico');
const aws = require('../services/aws');

const moment = require('moment');

const asaas = require('../services/asaas');
const { optionalAuth, requireAuth, requireRole } = require('../auth/middleware');

const fotoExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
async function uploadFotoColaborador(file) {
    if (!file) return null;
    const extension = fotoExtensions[file.mimetype];
    if (!extension) {
        const error = new Error('A foto precisa ser JPG, PNG, WEBP ou GIF.');
        error.statusCode = 400;
        throw error;
    }
    if (!file.data || file.data.length > 4 * 1024 * 1024) {
        const error = new Error('A foto deve ter no máximo 4 MB.');
        error.statusCode = 400;
        throw error;
    }
    const signatures = {
        'image/jpeg': data => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
        'image/png': data => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        'image/webp': data => data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP',
        'image/gif': data => ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6)),
    };
    if (!signatures[file.mimetype](file.data)) {
        const error = new Error('O arquivo selecionado não corresponde ao formato de imagem informado.');
        error.statusCode = 400;
        throw error;
    }
    const key = `colaboradores/fotos/${crypto.randomUUID()}.${extension}`;
    const result = await aws.uploadToS3(file, key);
    if (result.error) {
        const error = new Error('Não foi possível enviar a foto. Tente novamente.');
        error.statusCode = 502;
        throw error;
    }
    return { key, url: result.message.Location };
}

router.post('/', requireAuth, requireRole('salao'), async (req, res) => {
    if (String(req.body?.salaoId) !== String(req.auth.sub)) return res.status(403).json({ error: true, message: 'Você só pode gerenciar a equipe do seu salão.' });

    const db = mongoose.connection;
    const session = await db.startSession();

    session.startTransaction();
    let uploadedPhotoKey = null;

    try {

        let { colaborador, salaoId } = req.body || {};
        if (typeof colaborador === 'string') {
            try {
                colaborador = JSON.parse(colaborador);
            } catch (error) {
                error.statusCode = 400;
                error.message = 'Os dados do colaborador são inválidos.';
                throw error;
            }
        }

        let newColaborador = null;

        /*
        ==================================================
        VALIDANDO DADOS
        ==================================================
        */

        if (!colaborador || typeof colaborador !== 'object' || Array.isArray(colaborador)) {
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

        if (!existentColaborador && req.files?.foto) {
            const uploadedPhoto = await uploadFotoColaborador(req.files.foto);
            uploadedPhotoKey = uploadedPhoto.key;
            colaborador.foto = uploadedPhoto.url;
        }

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

        if (uploadedPhotoKey) await aws.deleteFileS3(uploadedPhotoKey);

        session.endSession();

        console.error(
            'Erro ao cadastrar colaborador:',
            err
        );

        return res.status(err.statusCode || 500).json({

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

router.post('/filter', requireAuth, requireRole('salao'), async (req, res) => {

    try {

        const ids = await SalaoColaborador.find({ salaoId: req.auth.sub, status: { $ne: 'E' } }).distinct('colaboradorId');
        const colaboradores = await Colaborador.find({ _id: { $in: ids } }).select('-senha -asaasApiKey -asaasWalletId -asaasAccountId -contaBancaria');
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

router.get('/salao/:salaoId', optionalAuth, async (req, res) => {

    try {

        const { salaoId } = req.params;
        let listaColaboradores = [];

        const colaboradores = await SalaoColaborador.find({ salaoId, status: { $ne: 'E' }, })
            .populate({ path: 'colaboradorId', select: 'nome telefone email foto dataNascimento sexo status' })
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
                listaColaboradores.map((vinculo) => {
                    if (req.auth?.role === 'salao' && String(req.auth.sub) === String(salaoId)) return {
                        ...vinculo.colaboradorId._doc,
                        vinculoId: vinculo._id,
                        vinculo: vinculo.status,
                        especialidades: vinculo.especialidades,
                        dataCadastro: moment(vinculo.dataCadastro).format('DD/MM/YYYY'),
                    };
                    return { _id: vinculo.colaboradorId._id, nome: vinculo.colaboradorId.nome, foto: vinculo.colaboradorId.foto };
                }),

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

router.put('/:colaboradorId', requireAuth, requireRole('salao'), async (req, res) => {
    const { colaboradorId } = req.params;
    const { salaoId, vinculoId, vinculo } = req.body || {};
    let { especialidades } = req.body || {};

    if (typeof especialidades === 'string') {
        try {
            especialidades = JSON.parse(especialidades);
        } catch {
            return res.status(400).json({ error: true, message: 'especialidades deve ser uma lista válida de serviços.' });
        }
    }

    if (String(salaoId) !== String(req.auth.sub)) return res.status(403).json({ error: true, message: 'Você só pode editar a equipe do seu salão.' });
    if (!mongoose.isValidObjectId(colaboradorId) || !mongoose.isValidObjectId(salaoId) || !mongoose.isValidObjectId(vinculoId)) {
        return res.status(400).json({ error: true, message: 'Informe colaboradorId, salaoId e vinculoId válidos.' });
    }
    if (vinculo !== undefined && !['A', 'I'].includes(vinculo)) {
        return res.status(400).json({ error: true, message: 'vinculo deve ser A ou I.' });
    }
    if (especialidades !== undefined && !Array.isArray(especialidades)) {
        return res.status(400).json({ error: true, message: 'especialidades deve ser um array de IDs de serviços.' });
    }

    const session = await mongoose.connection.startSession();
    session.startTransaction();
    let uploadedPhotoKey = null;

    try {
        const relacao = await SalaoColaborador.findOne({
            _id: vinculoId,
            salaoId,
            colaboradorId,
            status: { $ne: 'E' },
        }).session(session);

        if (!relacao) {
            await session.abortTransaction();
            return res.status(404).json({ error: true, message: 'Vínculo ativo ou inativo deste colaborador não encontrado no salão.' });
        }

        const camposPermitidos = ['nome', 'telefone', 'email', 'foto', 'dataNascimento', 'sexo'];
        const dadosColaborador = {};
        for (const campo of camposPermitidos) {
            if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
                dadosColaborador[campo] = req.body[campo];
            }
        }

        if (req.files?.foto) {
            const uploadedPhoto = await uploadFotoColaborador(req.files.foto);
            uploadedPhotoKey = uploadedPhoto.key;
            dadosColaborador.foto = uploadedPhoto.url;
        }

        let colaborador = await Colaborador.findByIdAndUpdate(
            colaboradorId,
            dadosColaborador,
            { new: true, runValidators: true, session }
        );

        if (!colaborador) {
            await session.abortTransaction();
            if (uploadedPhotoKey) await aws.deleteFileS3(uploadedPhotoKey);
            return res.status(404).json({ error: true, message: 'Colaborador não encontrado.' });
        }

        if (vinculo !== undefined) {
            relacao.status = vinculo;
            await relacao.save({ session });
        }

        if (especialidades !== undefined) {
            const idsSolicitados = [...new Set(especialidades.map(String))];
            const idsInvalidos = idsSolicitados.filter(id => !mongoose.isValidObjectId(id));
            if (idsInvalidos.length) {
                await session.abortTransaction();
                if (uploadedPhotoKey) await aws.deleteFileS3(uploadedPhotoKey);
                return res.status(400).json({ error: true, message: 'Uma ou mais especialidades contêm IDs inválidos.' });
            }

            const servicosDoSalao = await Servico.find({ salaoId }).select('_id status').session(session);
            const idsDoSalao = servicosDoSalao.map(servico => String(servico._id));
            const idsDisponiveis = new Set(
                servicosDoSalao.filter(servico => servico.status !== 'E').map(servico => String(servico._id))
            );
            const servicosDeOutroSalao = idsSolicitados.filter(id => !idsDisponiveis.has(id));
            if (servicosDeOutroSalao.length) {
                await session.abortTransaction();
                if (uploadedPhotoKey) await aws.deleteFileS3(uploadedPhotoKey);
                return res.status(400).json({ error: true, message: 'Todas as especialidades precisam ser serviços disponíveis deste salão.' });
            }

            await ColaboradorServico.deleteMany({
                colaboradorId,
                servicoId: { $in: idsDoSalao },
            }).session(session);

            if (idsSolicitados.length) {
                await ColaboradorServico.insertMany(
                    idsSolicitados.map(servicoId => ({ colaboradorId, servicoId, status: 'A' })),
                    { session }
                );
            }
        }

        await session.commitTransaction();
        return res.json({ error: false, colaborador });
    } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (uploadedPhotoKey) await aws.deleteFileS3(uploadedPhotoKey);
        console.error('Erro ao atualizar colaborador:', err);
        return res.status(err.statusCode || 500).json({ error: true, message: err.message });
    } finally {
        await session.endSession();
    }
});
/*
==================================================
EXCLUIR VÍNCULO
==================================================
*/
router.delete('/vinculo/:id', requireAuth, requireRole('salao'), async (req, res) => {

    try {
        const vinculo = await SalaoColaborador.findOneAndUpdate({ _id: req.params.id, salaoId: req.auth.sub }, { status: 'E' });
        if (!vinculo) return res.status(404).json({ error: true, message: 'Vínculo não encontrado neste salão.' });
        return res.json({error: false});

    } catch (err) {
        res.json({error: true, message: err.message,});
    }
});

module.exports = router;
