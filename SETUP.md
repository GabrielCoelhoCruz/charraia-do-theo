# Charraiá do Theo — Configuração (Google Sheets)

Guia para conectar o site à planilha Google. Faça isso **uma vez** antes de compartilhar o link com os convidados.

## 1. Criar a planilha

1. Acesse [Google Sheets](https://sheets.google.com) e crie uma planilha em branco.
2. Nome sugerido: **Charraiá do Theo**.

## 2. Instalar o Apps Script

1. Na planilha: **Extensões → Apps Script**.
2. Apague o conteúdo padrão de `Code.gs`.
3. Copie todo o arquivo [`google-apps-script/Code.gs`](google-apps-script/Code.gs) do projeto e cole no editor.
4. Troque a senha do admin na linha `ADMIN_KEY` (ex: `charraia-theo-2026`).
5. Salve (Ctrl+S).

## 3. Rodar o setup (uma vez)

1. No Apps Script, selecione a função **`setupSheets`** no menu de funções.
2. Clique em **Executar**.
3. Autorize o acesso quando o Google pedir.
4. Volte à planilha — devem aparecer as abas `rsvps`, `rsvp_gifts` e `config`.

## 4. Publicar como Web App

1. No Apps Script: **Implantar → Nova implantação**.
2. Tipo: **App da Web**.
3. Executar como: **Eu**.
4. Quem tem acesso: **Qualquer pessoa**.
5. Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

> Sempre que alterar o `Code.gs`, crie uma **nova implantação** (ou gerencie implantações → editar → nova versão).

## 5. Configurar o site

1. Abra [`api-client.js`](api-client.js).
2. Substitua `COLE_A_URL_DO_WEB_APP_AQUI` pela URL copiada no passo 4.

```js
const SHEETS_API_URL = "https://script.google.com/macros/s/SEU_ID/exec";
```

## 6. Testar localmente

1. Abra [`Arraial do Theo.html`](Arraial%20do%20Theo.html) no navegador (ou use um servidor local).
2. Preencha o RSVP de teste e confirme.
3. Abra o admin: `admin.html?key=SUA_SENHA` (a mesma do `ADMIN_KEY`).
4. Verifique se a confirmação aparece e se o estoque da lista atualiza.

## 7. Publicar online (Vercel)

1. Crie conta em [vercel.com](https://vercel.com).
2. **Add New → Project** e importe esta pasta (ou envie via GitHub).
3. Framework: **Other** — sem build command.
4. Deploy.
5. URLs úteis:
   - Site: `https://seu-projeto.vercel.app/Arraial%20do%20Theo.html`
   - Admin: `https://seu-projeto.vercel.app/admin.html?key=SUA_SENHA`

Guarde o link do admin nos favoritos. **Não** coloque esse link no convite público.

## Depois do chá

- No admin: **Exportar CSV**
- Ou na planilha: **Arquivo → Fazer download → Excel (.xlsx)**
- Opcional: excluir a implantação do Apps Script ou arquivar a planilha

## Problemas comuns

| Problema | Solução |
|----------|---------|
| "API não configurada" | Cole a URL do Web App em `api-client.js` |
| "Acesso restrito" no admin | Use `?key=` igual ao `ADMIN_KEY` no Code.gs |
| Confirmação não salva | Rode `setupSheets()` e republicue o Web App |
| Estoque não atualiza | Nova implantação após mudar o script; limpe cache do navegador |
