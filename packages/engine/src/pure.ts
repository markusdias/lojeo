// Pure engine subpath — exports apenas helpers SEM dependência DB.
//
// Use em client components / Edge Runtime / Service Workers onde
// `@lojeo/db` (postgres-js) faria fail no bundle.
//
// Importa via `@lojeo/engine/pure` — ver `package.json` exports.

export * from './template';
export * from './pricing';
export * from './sku';
export * from './rfm';
export * from './churn';
export * from './inventory-forecast';
export * from './warranty';
export * from './market-basket';
export * from './file-signature';
export * from './customer-ltv';
export * from './competitive-pricing';
export * from './embeddings';
export * from './attribution';
export * from './markdown';
export * from './experiments-stats';
export * from './cpf';
export * from './currency';
export * from './fraud';
export * from './cohort-retention';
export * from './best-send-hour';
