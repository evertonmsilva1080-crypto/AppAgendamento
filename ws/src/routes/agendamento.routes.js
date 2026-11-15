const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();
const asaas = require('../services/asaas');

const Agendamento = require('../models/agendamento');
const Cliente = require('../models/cliente');
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const Colaborador = require('../models/colaborador');
const SalaoColaborador = require('../models/relationship/salaoColaborador');
const SalaoCliente = require('../models/relationship/salaoCliente');
const ColaboradorServico = require('../models/relationship/colaboradorServico');
const Horario = require('../models/horario');
const util = require('../util');
const { requireAuth, requireRole, requireSalonOwner } = require('../auth/middleware');

const TAXA_APP_PERCENTUAL = 2.5;
const TAXA_COLABORADOR_PERCENTUAL = 40;
const TAXA_SALAO_PERCENTUAL = 100 - TAXA_APP_PERCENTUAL - TAXA_COLABORADOR_PERCENTUAL;

router.post('/', requireAuth, requireRole('cliente'), async (req, res) => {
    if (String(req.body?.clienteId) !== String(req.auth.sub)) return res.status(403).json({ error: true, message: 'Só é possível agendar usando a sua própria conta de cliente.' });
    const { clienteId, salaoId, servicoId, colaboradorId, data } = req.body;

    const ids = { clienteId, salaoId, servicoId, colaboradorId };
    const idInvalido = Object.entries(ids).find(([, id]) => !mongoose.isValidObjectId(id));
    if (idInvalido) {
        return res.status(400).json({
            error: true,
            message: `O campo ${idInvalido[0]} está ausente ou inválido.`,
        });
    }

    const dataAgendamento = moment(data);
    if (!data || !dataAgendamento.isValid()) {
        return res.status(400).json({
            error: true,
            message: 'Informe uma data válida para o agendamento.',
        });
    }

    if (!dataAgendamento.isAfter(moment().startOf('day'), 'day')) {
        return res.status(400).json({
            error: true,
            message: 'O agendamento precisa ser feito com pelo menos um dia de antecedência.',
        });
    }

    const inicioProximaSemana = moment().startOf('isoWeek').add(1, 'week');
    const fimProximaSemana = inicioProximaSemana.clone().endOf('isoWeek');
    if (dataAgendamento.isBefore(inicioProximaSemana, 'day') || dataAgendamento.isAfter(fimProximaSemana, 'day')) {
        return res.status(400).json({
            error: true,
            message: 'Só é possível agendar para a próxima semana (segunda a domingo).',
        });
    }

    if (TAXA_SALAO_PERCENTUAL < 0) {
        return res.status(500).json({
            error: true,
            message: 'As taxas configuradas ultrapassam 100%.',
        });
    }


    try {
        const [cliente, salao, servico, colaborador] = await Promise.all([
            Cliente.findById(clienteId).select('asaasCustomerId status'),
            Salao.findById(salaoId).select('asaasWalletId diasFuncionamento'),
            Servico.findOne({ _id: servicoId, salaoId, status: 'A' })
                .select('preco titulo')
                ,
            Colaborador.findById(colaboradorId)
                .select('asaasWalletId status')
                ,
        ]);

        if (!cliente || cliente.status !== 'A') {
            return res.status(404).json({ error: true, message: 'Cliente não encontrado ou inativo.' });
        }
        if (!salao) {
            return res.status(404).json({ error: true, message: 'Salão não encontrado.' });
        }
        if (Array.isArray(salao.diasFuncionamento) && !salao.diasFuncionamento.includes(dataAgendamento.day())) {
            return res.status(400).json({ error: true, message: 'O salão não funciona no dia escolhido.' });
        }
        if (!servico) {
            return res.status(404).json({ error: true, message: 'Serviço não encontrado ou inativo neste salão.' });
        }
        if (!colaborador || colaborador.status !== 'A') {
            return res.status(404).json({ error: true, message: 'Colaborador não encontrado ou inativo.' });
        }

        const [vinculoSalao, colaboradorAtendeServico] = await Promise.all([
            SalaoColaborador.findOne({ salaoId, colaboradorId, status: 'A' }),
            ColaboradorServico.findOne({ colaboradorId, servicoId, status: 'A' }),
        ]);
        if (!vinculoSalao || !colaboradorAtendeServico) {
            return res.status(400).json({
                error: true,
                message: 'O colaborador não está ativo neste salão ou não atende este serviço.',
            });
        }

        // TESTE LOCAL: validações do pagador e das carteiras Asaas temporariamente desativadas.
        // Reative este bloco antes de habilitar cobranças reais.

        const valor = Number(Number(servico.preco).toFixed(2));
        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ error: true, message: 'O preço do serviço precisa ser maior que zero.' });
        }

        await SalaoCliente.findOneAndUpdate(
            { salaoId, clienteId },
            { $set: { status: 'A' }, $setOnInsert: { salaoId, clienteId } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const agendamentoId = new mongoose.Types.ObjectId();
        const dueDate = dataAgendamento.format('YYYY-MM-DD');

        // TESTE LOCAL: não chama o Asaas nem cria cobrança PIX.
        // Para voltar a cobrar, restaure a chamada abaixo e as validações acima.
        /*
        const pagamentoAsaas = await asaas('POST', '/payments', {
            customer: cliente.asaasCustomerId,
            billingType: 'PIX',
            value: valor,
            dueDate,
            description: servico.titulo,
            externalReference: String(agendamentoId),
            split: [
                { walletId: salao.asaasWalletId, percentualValue: TAXA_SALAO_PERCENTUAL },
                { walletId: colaborador.asaasWalletId, percentualValue: TAXA_COLABORADOR_PERCENTUAL },
            ],
        });
        if (pagamentoAsaas.error) {
            const message = typeof pagamentoAsaas.message === 'string'
                ? pagamentoAsaas.message
                : JSON.stringify(pagamentoAsaas.message);
            return res.status(502).json({ error: true, message });
        }
        const pagamento = pagamentoAsaas.data;
        */
        const pagamento = { id: `TESTE-${agendamentoId}`, status: 'TESTE_SEM_PAGAMENTO', invoiceUrl: null };

        const agendamento = await new Agendamento({
            _id: agendamentoId,
            clienteId,
            salaoId,
            servicoId,
            colaboradorId,
            data: dataAgendamento.toDate(),
            valor: servico.preco,
            comissao: TAXA_COLABORADOR_PERCENTUAL,
            transactionId: pagamento.id,
            paymentStatus: pagamento.status,
            invoiceUrl: pagamento.invoiceUrl,
            taxaSalaoPercentual: TAXA_SALAO_PERCENTUAL,
            taxaColaboradorPercentual: TAXA_COLABORADOR_PERCENTUAL,
            taxaAppPercentual: TAXA_APP_PERCENTUAL,
        }).save();

        return res.status(201).json({
            error: false,
            agendamento: {
                _id: agendamento._id,
                data: agendamento.data,
                valor: agendamento.valor,
                paymentId: pagamento.id,
                paymentStatus: pagamento.status,
                invoiceUrl: pagamento.invoiceUrl,
                taxas: {
                    salao: TAXA_SALAO_PERCENTUAL,
                    colaborador: TAXA_COLABORADOR_PERCENTUAL,
                    app: TAXA_APP_PERCENTUAL,
                },
            },
        });
    } catch (err) {
        console.error('Erro ao criar agendamento/pagamento:', err);
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.get('/minhas', requireAuth, requireRole('cliente'), async (req, res) => {
    try {
        const agendamentos = await Agendamento.find({ clienteId: req.auth.sub }).sort({ data: -1 }).populate([
            { path: 'salaoId', select: 'nome foto' },
            { path: 'servicoId', select: 'titulo duracao' },
            { path: 'colaboradorId', select: 'nome foto' },
        ]);
        return res.json({ error: false, agendamentos });
    } catch (err) { return res.status(500).json({ error: true, message: err.message }); }
});

router.post('/filter', requireAuth, requireRole('salao'), requireSalonOwner, async (req,res) => {
    try {
        const { periodo, salaoId } = req.body;
        const { inicio, final } = periodo || {};
        const dataInicio = moment(inicio, 'YYYY-MM-DD', true);
        const dataFinal = moment(final, 'YYYY-MM-DD', true);

        if (!dataInicio.isValid() || !dataFinal.isValid() || dataFinal.isBefore(dataInicio, 'day')) {
            return res.status(400).json({ error: true, message: 'Informe um período válido com inicio e final.' });
        }

        const agendamentos = await Agendamento.find({
            salaoId,
            data: {
                $gte: moment(dataInicio).startOf('day').toDate(),
                $lte: moment(dataFinal).endOf('day').toDate(),
            },
        }).populate([
            { path: 'servicoId', select: 'titulo duracao' },
            { path: 'colaboradorId', select: 'nome' },
            { path: 'clienteId', select: 'nome' },
        ]);

        res.json({ error: false, agendamentos });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.post('/dias-disponiveis', async (req, res) => {
    try {
        const { data, salaoId, servicoId } = req.body;
        let dataInicial = moment(data, 'YYYY-MM-DD', true);
        if (!dataInicial.isValid()) {
            return res.status(400).json({ error: true, message: 'Informe uma data válida no formato YYYY-MM-DD.' });
        }

        const primeiroDiaAgendavel = moment().startOf('isoWeek').add(1, 'week');
        if (dataInicial.isBefore(primeiroDiaAgendavel, 'day')) dataInicial = primeiroDiaAgendavel.clone();

        const [horarios, servico, salao] = await Promise.all([
            Horario.find({ salaoId, especialidades: servicoId }),
            Servico.findById(servicoId).select('duracao'),
            Salao.findById(salaoId).select('diasFuncionamento'),
        ]);
        if (!servico) {
            return res.status(404).json({ error: true, message: 'Serviço não encontrado.' });
        }
        if (horarios.length === 0) {
            return res.status(404).json({ error: true, message: 'Horário não configurado para este salão e serviço.' });
        }

        const idsColaboradores = [...new Set(
            horarios.flatMap(horario => horario.colaboradores.map(id => String(id)))
        )];
        const colaboradores = await Colaborador.find({
            _id: { $in: idsColaboradores },
            status: 'A',
        }).select('nome foto');

        const servicoMinutos = util.hourToMinutes(moment.utc(servico.duracao).format('HH:mm'));
        const servicoSlots = Math.ceil(servicoMinutos / util.SLOT_DURATION);
        if (!Number.isFinite(servicoMinutos) || servicoMinutos <= 0) {
            return res.status(400).json({ error: true, message: 'A duração do serviço é inválida.' });
        }

        const agenda = [];
        let dia = dataInicial.clone().startOf('day');

        for (let i = 0; i <= 365 && agenda.length < 7; i++) {
            const diaAberto = !Array.isArray(salao?.diasFuncionamento) || salao.diasFuncionamento.includes(dia.day());
            const horariosDoDia = diaAberto ? horarios.filter(horario => horario.dias.includes(dia.day())) : [];
            if (horariosDoDia.length > 0) {
                const janelasPorColaborador = {};
                for (const horario of horariosDoDia) {
                    for (const colaboradorId of horario.colaboradores) {
                        const chave = String(colaboradorId);
                        if (!janelasPorColaborador[chave]) janelasPorColaborador[chave] = [];
                        janelasPorColaborador[chave].push({
                            inicio: moment(util.mergeDateTime(dia, horario.inicio)),
                            fim: moment(util.mergeDateTime(dia, horario.fim)),
                        });
                    }
                }

                const horariosDisponiveis = {};
                for (const [colaboradorId, janelas] of Object.entries(janelasPorColaborador)) {
                    const inicioDia = dia.clone().startOf('day').toDate();
                    const fimDia = dia.clone().endOf('day').toDate();
                    const agendamentos = await Agendamento.find({
                        colaboradorId,
                        data: { $gte: inicioDia, $lte: fimDia },
                    }).select('data servicoId -_id').populate('servicoId', 'duracao');

                    const ocupados = agendamentos
                        .filter(agendamento => agendamento.servicoId)
                        .map(agendamento => {
                            const inicio = moment(agendamento.data);
                            const duracao = util.hourToMinutes(moment.utc(agendamento.servicoId.duracao).format('HH:mm'));
                            return { inicio, fim: inicio.clone().add(duracao, 'minutes') };
                        });



                    const sequenciasValidas = [];
                    const horariosJaIncluidos = new Set();
                    for (const janela of janelas) {
                        const gradeDoHorario = util.sliceMinutes(
                            janela.inicio,
                            janela.fim,
                            util.SLOT_DURATION
                        ).map(hora => {
                            const inicioSlot = moment(util.mergeDateTime(dia, hora));
                            const fimSlot = inicioSlot.clone().add(util.SLOT_DURATION, 'minutes');
                            const ocupado = ocupados.some(agendamento =>
                                inicioSlot.isBefore(agendamento.fim) && fimSlot.isAfter(agendamento.inicio)
                            );
                            return ocupado ? '-' : hora;
                        });

                        const sequenciasLivres = util.splitByValues(gradeDoHorario, '-');
                        for (const sequencia of sequenciasLivres) {
                            if (sequencia.length < servicoSlots) continue;

                            // Uma sequência precisa comportar a duração inteira; seus últimos slots
                            // não são horários de início válidos para este serviço.
                            const horariosDeInicio = sequencia.slice(0, sequencia.length - servicoSlots + 1);
                            const horariosUnicos = horariosDeInicio.filter(hora => !horariosJaIncluidos.has(hora));
                            if (horariosUnicos.length > 0) {
                                sequenciasValidas.push(horariosUnicos);
                                horariosUnicos.forEach(hora => horariosJaIncluidos.add(hora));
                            }
                        }
                    }

                    horariosDisponiveis[colaboradorId] = sequenciasValidas;
                    }

                agenda.push({ [dia.format('YYYY-MM-DD')]: horariosDisponiveis });
            }
            dia.add(1, 'day');
        }

        return res.json({ error: false, colaboradores, agenda });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});
module.exports = router;
