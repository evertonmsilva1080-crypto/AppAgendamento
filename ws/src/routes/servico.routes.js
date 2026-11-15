const express = require('express');
const router = express.Router();

const aws = require('../services/aws');
const Arquivo = require('../models/arquivo');
const Servico = require('../models/servico');
const { requireAuth, requireRole, requireSalonOwner } = require('../auth/middleware');

router.post('/', requireAuth, requireRole('salao'), requireSalonOwner, async (req, res) => {
    try {

        const { salaoId, servico } = req.body;

        if (!salaoId) {
            return res.status(400).json({
                erro: true,
                message: 'O campo salaoId é obrigatório.'
            });
        }

        if (!servico) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não foi enviado.'
            });
        }

        let jsonServico;

        try {
            jsonServico = typeof servico === 'string' ? JSON.parse(servico) : servico;
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

        const servicoCadastrado = await new Servico({
            ...jsonServico,
            salaoId,
        }).save();

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

router.put('/:id', requireAuth, requireRole('salao'), async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Verifica se o serviço existe
        const servicoExistente = await Servico.findById(id);

        if (!servicoExistente) {
            return res.status(404).json({
                erro: true,
                message: 'Serviço não encontrado.'
            });
        }

        const { salaoId, servico } = req.body;
        if (String(servicoExistente.salaoId) !== String(req.auth.sub) || (salaoId && String(salaoId) !== String(req.auth.sub))) return res.status(403).json({ error: true, message: 'Você só pode editar serviços do seu salão.' });

        // 2. Verifica se o campo servico foi enviado
        if (!servico) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não foi enviado.'
            });
        }

        // 3. Converte o JSON recebido pelo multipart
        let jsonServico;

        try {
            jsonServico = typeof servico === 'string' ? JSON.parse(servico) : servico;
        } catch (err) {
            return res.status(400).json({
                erro: true,
                message: 'O campo "servico" não contém um JSON válido.'
            });
        }

        // 4. Atualiza o serviço
        const servicoAtualizado = await Servico.findByIdAndUpdate(
            id,
            {
                ...jsonServico,
                salaoId: salaoId || servicoExistente.salaoId || jsonServico.salaoId,
            },
            {
                returnDocument: 'after',
                runValidators: true
            }
        );

        // 5. Array para guardar os arquivos enviados
        let arquivosBanco = [];

        // 6. Verifica se existem arquivos
        if (req.files && Object.keys(req.files).length > 0) {

            console.log('Arquivos encontrados:', Object.keys(req.files));

            for (const key of Object.keys(req.files)) {

                const file = req.files[key];

                // Extensão do arquivo
                const nameParts = file.name.split('.');
                const extension = nameParts[nameParts.length - 1];

                // Nome único
                const fileName = `${Date.now()}-${Math.round(Math.random() * 100000)}.${extension}`;

                // Caminho dentro do bucket
                const path = `servicos/${salaoId || servicoExistente.salaoId}/${fileName}`;

                console.log('Caminho S3:', path);

                // 7. Upload para o S3
                const response = await aws.uploadToS3(file, path);

                console.log('Resposta S3:', response);

                // Se deu erro no upload
                if (response.error) {
                    return res.status(500).json({
                        erro: true,
                        message: response.message
                    });
                }

                // 8. Salva o arquivo no MongoDB
                const arquivoBanco = {
                    referenciaId: servicoAtualizado._id,
                    model: 'Servico',
                    caminho: path
                };

                arquivosBanco.push(arquivoBanco);
            }

            // 9. Insere os arquivos no MongoDB
            if (arquivosBanco.length > 0) {
                await Arquivo.insertMany(arquivosBanco);
            }
        }

        // 10. Retorna tudo
        return res.status(200).json({
            erro: false,
            message: 'Serviço atualizado com sucesso.',
            servico: servicoAtualizado,
            arquivos: arquivosBanco
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

router.post('/delete-arquivo', requireAuth, requireRole('salao'), async (req, res) => {
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

        const serviceFileOwner = await Servico.findById(arquivo.referenciaId).select('salaoId');
        if (!serviceFileOwner || String(serviceFileOwner.salaoId) !== String(req.auth.sub)) return res.status(403).json({ error: true, message: 'Você só pode remover arquivos do seu salão.' });

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

router.delete('/:id', requireAuth, requireRole('salao'), async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Servico.findOneAndUpdate({ _id: id, salaoId: req.auth.sub }, { status: 'E' });
        if (!service) return res.status(404).json({ error: true, message: 'Serviço não encontrado neste salão.' });
        return res.json({error:false});
    } catch (err) {
        res.json({ error: true, message: error.message});
    }
});

module.exports = router;
