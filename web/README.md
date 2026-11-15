# Frontend web

## Rodar localmente

1. Instale as dependências com `npm install` dentro desta pasta.
2. Copie `.env.example` para `.env.local` e configure `VITE_API_URL` e `VITE_SALAO_ID`.
3. Inicie a API existente na porta configurada.
4. Rode `npm run dev` e abra o endereço exibido pelo Vite.

## Rotas

- `/salao/:salaoId` — página pública do salão e catálogo.
- `/agendamento/:salaoId/:servicoId` — seleção de dia, especialista e horário.
- `/agendamento/:salaoId/:servicoId/especialista` — fluxo com foco inicial na escolha da equipe.
- `/painel/:salaoId` — painel responsivo com agenda, clientes, equipe, serviços e horários.

A reserva mostra explicitamente o modo de teste quando a API retorna `TESTE_SEM_PAGAMENTO`. O cadastro de cliente usa a rota atual de clientes, que depende da integração existente do servidor.
