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

// Vercel serves this API under /api; strip that prefix so existing route
// definitions continue to work unchanged in both Vercel and local Express.
app.use((req, res, next) => {
    if (req.url === '/api' || req.url.startsWith('/api/')) {
        req.url = req.url.slice(4) || '/';
    }
    next();
});

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

