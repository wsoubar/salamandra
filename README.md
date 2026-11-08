# Salamandra

Simulador didático de Kafka feito com Vite + React, executado inteiramente no navegador.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

O simulador permite criar tópicos, publicar mensagens JSON e visualizar partições, offsets e consumidores. Os dados são temporários e ficam apenas na memória do navegador; nenhum broker real é utilizado.

## GitHub Pages

O Vite usa caminhos relativos (`base: './'`) para suportar publicação em páginas de projeto. Configure GitHub Pages para servir a pasta `dist` após executar `npm run build`.
