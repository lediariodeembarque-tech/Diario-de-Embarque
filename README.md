# Diário de Embarque

Aplicação React/Vite preparada para Cloudflare Pages.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Validar a build

```bash
npm run build
npm run preview
```

A saída da build fica em `dist/`.

## Deploy no Cloudflare Pages pelo painel

Configure o projeto conectado ao GitHub com:

- **Root directory:** `/`
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

O arquivo `public/_redirects` preserva as rotas da SPA e `public/_headers` adiciona cabeçalhos básicos de segurança.

## Deploy via CLI

Faça login uma vez:

```bash
npx wrangler login
```

Depois publique como Cloudflare Pages:

```bash
npm run deploy:pages
```

Ou, de forma equivalente:

```bash
npm run build
npx wrangler pages deploy dist --project-name diario-de-embarque
```

**Não use `npx wrangler deploy` para este frontend.** Esse comando publica um Worker; este projeto é um site estático Vite e deve usar `wrangler pages deploy`.

## Sobre o código original Base44

O repositório recebido não contém a exportação completa do aplicativo original: ele contém apenas a base React/Vite e os metadados do projeto. Portanto, a configuração Cloudflare foi aplicada sem substituir a aplicação atual. Para migrar autenticação, entidades, chat e demais telas do Base44, os arquivos-fonte exportados precisam estar presentes neste repositório.
