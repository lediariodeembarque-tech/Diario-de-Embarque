# Diário de Embarque

Aplicação React/Vite preparada para Cloudflare Pages.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

A build é gerada em `dist/`.

## Cloudflare Pages

Configure o projeto com:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

O arquivo `public/_redirects` mantém as rotas de uma SPA funcionando.

> Este repositório estava inicialmente sem os arquivos do app, contendo apenas metadados e um README mínimo. Foi adicionada uma base React/Vite funcional para que o projeto tenha uma build publicável. A integração de autenticação, dados e telas do projeto original precisa ser adicionada quando os arquivos-fonte originais estiverem disponíveis.

## Importante sobre Wrangler

Não use `npx wrangler deploy` para publicar este frontend estático. Para Pages via CLI, gere a build e use:

```bash
npm run build
npx wrangler pages deploy dist --project-name diario-de-embarque
```
