// Rota fixa para funções Vercel fora do Next.js.
// O vercel.json reescreve /api/* para /api e envia o caminho original
// no parâmetro __vercel_path; aqui restauramos o caminho antes do Express.
const app = require('../ws');

module.exports = (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://vercel.local');
    const forwardedPath = requestUrl.searchParams.get('__vercel_path');

    if (forwardedPath) {
        requestUrl.searchParams.delete('__vercel_path');
        const path = `/${forwardedPath.replace(/^\/+/, '')}`;
        const query = requestUrl.searchParams.toString();
        req.url = query ? `${path}?${query}` : path;
    }

    return app(req, res);
};
