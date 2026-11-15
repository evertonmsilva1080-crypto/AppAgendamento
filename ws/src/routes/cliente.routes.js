const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Cliente = require('../models/cliente');
const SalaoCliente = require('../models/relationship/salaoCliente');
const moment = require('moment');
const asaas = require('../services/asaas');

function normalizarTipoDocumento(tipo) {
  const valor = String(tipo || '').toLowerCase();
  if (valor === 'cpf' || valor === 'individual') return 'individual';
  if (valor === 'cnpj' || valor === 'corporation') return 'corporation';
  return null;
}

async function criarClienteAsaas(cliente, clienteId) {
  const endereco = cliente.endereco || {};
  const dadosAsaas = {
    name: cliente.nome,
    cpfCnpj: cliente.documento.numero.replace(/\D/g, ''),
    email: cliente.email,
    mobilePhone: cliente.telefone.replace(/\D/g, ''),
    externalReference: String(clienteId),
  };

  if (endereco.cep) dadosAsaas.postalCode = endereco.cep.replace(/\D/g, '');
  if (endereco.numero) dadosAsaas.addressNumber = String(endereco.numero);

  const resposta = await asaas('POST', '/customers', dadosAsaas);
  if (resposta.error) {
    const message = typeof resposta.message === 'string'
      ? resposta.message
      : JSON.stringify(resposta.message);
    const err = new Error(message);
    err.statusCode = 502;
    throw err;
  }
  if (!resposta.data?.id) {
    const err = new Error('O Asaas não retornou o ID do cliente cadastrado.');
    err.statusCode = 502;
    throw err;
  }
  return resposta.data.id;
}

router.post('/', async (req, res) => {
  const { cliente, salaoId } = req.body;
  const tipoDocumento = normalizarTipoDocumento(cliente?.documento?.tipo);

  if (!cliente || !salaoId) {
    return res.status(400).json({
      error: true,
      message: 'Os campos cliente e salaoId são obrigatórios.',
    });
  }

  const camposObrigatorios = [
    ['nome', cliente.nome],
    ['email', cliente.email],
    ['telefone', cliente.telefone],
    ['dataNascimento', cliente.dataNascimento],
    ['sexo', cliente.sexo],
    ['documento.numero', cliente.documento?.numero],
  ];
  const campoAusente = camposObrigatorios.find(([, valor]) => !valor);
  if (campoAusente) {
    return res.status(400).json({
      error: true,
      message: `O campo ${campoAusente[0]} é obrigatório.`,
    });
  }
  if (!tipoDocumento) {
    return res.status(400).json({
      error: true,
      message: 'documento.tipo deve ser cpf, cnpj, individual ou corporation.',
    });
  }
  if (!['M', 'F'].includes(cliente.sexo)) {
    return res.status(400).json({
      error: true,
      message: 'sexo deve ser M ou F.',
    });
  }

  const session = await mongoose.connection.startSession();
  session.startTransaction();

  try {
    const filtros = [{ email: cliente.email }, { telefone: cliente.telefone }];
    let clienteSalvo = await Cliente.findOne({ $or: filtros }).session(session);
    const clienteNovo = !clienteSalvo;
    const clienteId = clienteSalvo?._id || new mongoose.Types.ObjectId();

    let vinculo = await SalaoCliente.findOne({
      salaoId,
      clienteId,
    }).session(session);

    if (vinculo?.status === 'A') {
      await session.abortTransaction();
      return res.status(409).json({
        error: true,
        message: 'Cliente já está vinculado a este salão.',
      });
    }

    let asaasCustomerId = clienteSalvo?.asaasCustomerId;
    if (!asaasCustomerId) {
      asaasCustomerId = await criarClienteAsaas({
        ...cliente,
        documento: {
          ...cliente.documento,
          tipo: tipoDocumento,
        },
      }, clienteId);
    }

    if (clienteNovo) {
      clienteSalvo = new Cliente({
        _id: clienteId,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        dataNascimento: cliente.dataNascimento,
        sexo: cliente.sexo,
        documento: {
          tipo: tipoDocumento,
          numero: cliente.documento.numero,
        },
        endereco: cliente.endereco || {},
        senha: cliente.senha || null,
        foto: cliente.foto || null,
        asaasCustomerId,
      });
      await clienteSalvo.save({ session });
    } else if (!clienteSalvo.asaasCustomerId) {
      clienteSalvo.asaasCustomerId = asaasCustomerId;
      await clienteSalvo.save({ session });
    }

    if (vinculo) {
      vinculo.status = 'A';
      await vinculo.save({ session });
    } else {
      vinculo = await new SalaoCliente({
        salaoId,
        clienteId: clienteSalvo._id,
      }).save({ session });
    }

    await session.commitTransaction();
    return res.status(clienteNovo ? 201 : 200).json({
      error: false,
      cliente: {
        _id: clienteSalvo._id,
        nome: clienteSalvo.nome,
        email: clienteSalvo.email,
        telefone: clienteSalvo.telefone,
        asaasCustomerId: clienteSalvo.asaasCustomerId,
      },
      vinculoId: vinculo._id,
    });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('Erro ao cadastrar cliente:', err);
    return res.status(err.statusCode || 500).json({
      error: true,
      message: err.message,
    });
  } finally {
    await session.endSession();
  }
});

router.post('/filter', async (req, res) => {
  try {
    const clientes = await Cliente.find(req.body.filters);
    res.json({ error: false, clientes });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/salao/:salaoId', async (req, res) => {
  try {
    const clientes = await SalaoCliente.find({
      salaoId: req.params.salaoId,
      status: 'A',
    })
      .populate('clienteId')
      .select('clienteId');

    res.json({
      error: false,
      clientes: clientes.filter((vinculo) => vinculo.clienteId).map((vinculo) => ({
        ...vinculo.clienteId._doc,
        vinculoId: vinculo._id,
        dataCadastro: moment(vinculo.dataCadastro).format('DD/MM/YYYY'),
      })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete('/vinculo/:id', async (req, res) => {
  try {
    await SalaoCliente.findByIdAndUpdate(req.params.id, { status: 'I' });
    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
