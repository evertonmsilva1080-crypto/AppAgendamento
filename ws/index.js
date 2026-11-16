
const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');
const connectDatabase = require('./database');

app.use(morgan('dev'));
app.use(express.json());
app.use(busboy());
app.use(busboyBodyParser());
app.use(cors());

// Remove o prefixo /api utilizado pela Vercel.
app.use((req, res, next) => {
    console.log('========== REQUISIÇÃO RECEBIDA ==========');
    console.log('METHOD:', req.method);
    console.log('URL:', req.url);
    console.log('ORIGINAL URL:', req.originalUrl);

    if (req.url === '/api' || req.url.startsWith('/api/')) {
        req.url = req.url.slice(4) || '/';
    }

    console.log('URL APÓS TRATAMENTO:', req.url);
    console.log('=========================================');

    next();
});

// ROTA TEMPORÁRIA PARA TESTAR ROTAS DINÂMICAS NA VERCEL.
app.get('/teste-api/:id', (req, res) => {
    res.json({
        funcionando: true,
        mensagem: 'Rota dinâmica funcionando!',
        id: req.params.id,
        url: req.url,
        originalUrl: req.originalUrl
    });
});

// Conexão com o banco de dados.
app.use(async (req, res, next) => {
    try {
        await connectDatabase();
        next();
    } catch (error) {
        console.error('Falha de conexão com MongoDB:', error.message);

        return res.status(503).json({
            error: true,
            message: 'Banco de dados indisponível. Verifique MONGODB_URI, as credenciais e o acesso de rede do MongoDB Atlas.',
        });
    }
});

app.set('port', process.env.PORT || 8000);

// Rotas da aplicação.
app.use('/auth', require('./src/routes/auth.routes'));
app.use('/salao', require('./src/routes/salao.routes'));
app.use('/servico', require('./src/routes/servico.routes'));
app.use('/horario', require('./src/routes/horario.routes'));
app.use('/colaborador', require('./src/routes/colaborador.routes'));
app.use('/cliente', require('./src/routes/cliente.routes'));
app.use('/agendamento', require('./src/routes/agendamento.routes'));

if (require.main === module) {
    app.listen(app.get('port'), () => {
        console.log(`WS Escutando na porta ${app.get('port')}`);
    });
}

module.exports = app;
