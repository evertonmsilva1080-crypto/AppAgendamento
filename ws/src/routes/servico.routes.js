const express = require('express');
const router = express.Router();

const aws = require('../services/aws');
const Arquivo = require('../models/arquivo');
const Servico = require('../models/servico');

router.post('/', async (req, res) => {
    try {

        const { salaoId, servico } = req.body;

        if (!servico) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não foi enviado.'
            });
        }

        let jsonServico;

        try {
            jsonServico = JSON.parse(servico);
        } catch (err) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não contém um JSON válido.'
            });
        }

        let arquivos = [];

        if (req.files && Object.keys(req.files).length > 0) {

            for (const key of Object.keys(req.files)) {

                const file = req.files[key];

                const nameParts = file.name.split('.');
                const extension = nameParts[nameParts.length - 1];

                const fileName = `${Date.now()}.${extension}`;

                const path = `servicos/${salaoId}/${fileName}`;

                const response = await aws.uploadToS3(
                    file,
                    path
                );

                if (response.error) {
                    return res.status(500).json({
                        erro: true,
                        message: response.message
                    });
                }

                arquivos.push(path);
            }
        }

        const servicoCadastrado = await new Servico(
            jsonServico
        ).save();

        const arquivosBanco = arquivos.map((arquivo) => ({
            referenciaId: servicoCadastrado._id,
            model: 'Servico',
            caminho: arquivo
        }));

        if (arquivosBanco.length > 0) {
            await Arquivo.insertMany(arquivosBanco);
        }

        return res.status(201).json({
            erro: false,
            servico: servicoCadastrado,
            arquivos: arquivosBanco
        });

    } catch (err) {

        console.error('Erro ao cadastrar serviço:', err);

        return res.status(500).json({
            erro: true,
            message: err.message
        });
    }
});

router.put('/:id', async (req, res) => {
    try {

        const { id } = req.params;

        console.log('================================');
        console.log('ID recebido no PUT:', id);

        const servicoExistente = await Servico.findById(id);

        console.log('Serviço encontrado:', servicoExistente);

        if (!servicoExistente) {
            return res.status(404).json({
                erro: true,
                message: 'Serviço não encontrado.',
                idRecebido: id
            });
        }

        const { salaoId, servico } = req.body;

        if (!servico) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não foi enviado.'
            });
        }

        let jsonServico;

        try {
            jsonServico = JSON.parse(servico);
        } catch (err) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não contém um JSON válido.'
            });
        }

        const servicoAtualizado = await Servico.findByIdAndUpdate(
            id,
            jsonServico,
            {
                new: true,
                runValidators: true
            }
        );

        return res.json({
            erro: false,
            servico: servicoAtualizado
        });

    } catch (err) {

        console.error('Erro ao atualizar serviço:', err);

        return res.status(500).json({
            erro: true,
            message: err.message
        });
    }
});

router.get('/salao/:salaoId', async (req, res) => {
    try {
        let servicosSalao = [];
        const servicos = await Servico.find({
            salaoId: req.params.salaoId,
            status: { $ne: 'E'},
        });

        for (let servico of servicos) {
            const arquivos = await Arquivo.find({
                model: 'Servico',
                referenciaId: servico._id
            });

            servicosSalao.push({ ...servico._doc,arquivos});
        }

        res.json({
            servicos: servicosSalao,
        });
        
    } catch (err) {
        res.json({ error: true, message: err.message})
    }
});

router.post('/delete-arquivo', async (req, res) => {
    try {

        const { id } = req.body;

        console.log('ID recebido:', id);

        if (!id) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "id" é obrigatório.'
            });
        }

        const arquivo = await Arquivo.findOne({
            caminho: id
        });

        if (!arquivo) {
            return res.status(404).json({
                erro: true,
                message: 'Arquivo não encontrado no banco de dados.',
                caminhoRecebido: id
            });
        }

        console.log('Arquivo encontrado:', arquivo);

        const response = await aws.deleteFileS3(
            arquivo.caminho
        );

        if (response.error) {
            return res.status(500).json({
                erro: true,
                message: response.message
            });
        }

        await Arquivo.findByIdAndDelete(arquivo._id);

        return res.json({
            erro: false,
            message: 'Arquivo excluído com sucesso.'
        });

    } catch (err) {

        console.error('Erro ao excluir arquivo:', err);

        return res.status(500).json({
            erro: true,
            message: err.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Servico.findByIdAndUpdate(id, {status: 'E' });
        res.json({error:false});
    } catch (err) {
        res.json({ error: true, message: error.message});
    }
});

module.exports = router;
