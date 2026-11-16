# Deploy no Vercel

O projeto usa a raiz do repositório como diretório do Vercel. O `vercel.json` já configura o build do React em `web/`, publica `web/dist` e envia as rotas da API sob `/api` para a função Express em `api/[...path].js`.

## Variáveis de ambiente

Configure em **Project Settings → Environment Variables** para Production. Configure Preview somente se usar uma base de dados e credenciais de teste separadas:

- `MONGODB_URI`: conexão do MongoDB Atlas. A aplicação seleciona o banco `AgendaFacil`.
- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `ASAAS_ACCESS_TOKEN`: token Asaas. A integração está atualmente apontada para a API sandbox.
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_REGION`
- `VITE_API_URL`: `/api` (opcional; este é o fallback automático em builds de produção).

Não coloque valores secretos no código nem envie arquivos `.env` para o repositório. No MongoDB Atlas, configure o acesso de rede para permitir conexões originadas das funções do Vercel e use um usuário de banco restrito ao banco `AgendaFacil`.

## Importar e publicar

1. Envie o repositório para GitHub, GitLab ou Bitbucket.
2. No Vercel, importe o repositório e mantenha **Root Directory** como `.`.
3. Confira que o projeto usa `npm ci`, `npm --prefix web ci && npm --prefix web run build` e a saída `web/dist` (já definidos em `vercel.json`).
4. Cadastre as variáveis de ambiente acima e publique.

As imagens enviadas pelo formulário passam pela função antes de chegar ao S3, então o limite do aplicativo foi ajustado para 4 MB por arquivo para respeitar o limite de 4,5 MB do corpo de requisição das Vercel Functions.
