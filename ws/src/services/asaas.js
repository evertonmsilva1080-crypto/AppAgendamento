const axios = require('axios');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

const api = axios.create({
  baseURL: 'https://api-sandbox.asaas.com/v3',
});

const access_token = process.env.ASAAS_ACCESS_TOKEN;

module.exports = async (method, endpoint, data = null) => {
  if (!access_token) {
    return {
      error: true,
      message: 'A variável ASAAS_ACCESS_TOKEN não foi configurada em ws/.env.',
    };
  }

  try {
    const response = await api({
      method,
      url: endpoint,
      data,
      headers: {
        'User-Agent': 'AgendaFacil/1.0.0',
        accept: 'application/json',
        access_token,
        'content-type': 'application/json',
      },
    });

    return {
      error: false,
      data: response.data,
    };
  } catch (err) {
    console.error(
      'Erro Asaas:',
      err.response?.data || err.message
    );

    return {
      error: true,
      message: err.response?.data || err.message,
    };
  }
};
