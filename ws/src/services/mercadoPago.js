const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.mercadopago.com',
});

const access_token = require('../data/keys.json').access_token;

module.exports = async (endpoint, data) => {
  try {
    const response = await api.post(endpoint, data, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      error: false,
      data: response.data,
    };
  } catch (err) {
    return {
      error: true,
      message: err.response?.data || err.message,
    };
  }
};