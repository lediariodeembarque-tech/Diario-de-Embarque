# Diário de Embarque

Aplicação React/Vite executada como Cloudflare Worker, com API, autenticação, D1 e R2.

## Deploy pelo Cloudflare Workers Builds

No projeto **Workers & Pages → Settings → Builds**, configure:

- **Production branch:** `cloudflare-migration`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler versions upload`
- **Root directory:** `/`

O comando de build é obrigatório: ele cria `dist/`, que é usado pelo campo `assets.directory` do `wrangler.jsonc`.

Não configure `npx wrangler versions upload` como único comando de deploy sem o build antes dele.

## Configurar recursos Cloudflare

Faça login:

```bash
npx wrangler login
```

Crie os recursos uma vez:

```bash
npx wrangler d1 create diario-de-embarque
npx wrangler r2 bucket create diario-de-embarque-uploads
```

Copie o `database_id` retornado pelo comando D1 para `wrangler.jsonc` e ative os blocos `d1_databases` e `r2_buckets`. O binding D1 precisa se chamar `DB` e o binding R2 precisa se chamar `UPLOADS`.

Aplique as migrations antes do primeiro deploy:

```bash
npm run db:migrate:remote
```

Configure a origem permitida para cookies e CORS:

```bash
npx wrangler secret put ALLOWED_ORIGIN
```

Use a URL final da aplicação, sem barra no final, por exemplo:

```text
https://diario-de-embarque.seu-dominio.com
```

## Deploy pelo terminal

```bash
npm install
npm run build
npm run deploy
```

Para usar versões/Workers Builds pelo terminal:

```bash
npm run deploy:versions
```

## Desenvolvimento local

```bash
npm install
npm run db:migrate:local
npx wrangler dev
```

Acesse a URL mostrada pelo Wrangler. O frontend e a API serão servidos pelo mesmo Worker.

## Cloudflare Pages

Pages é adequado apenas para o frontend estático separado. Nesse caso, use:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Deploy command:** vazio

Para este projeto completo, prefira Workers, pois a autenticação, a API, o D1 e o R2 estão no Worker.
