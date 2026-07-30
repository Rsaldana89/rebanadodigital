const DEFAULT_INCLUDE_TERMS = ['Rebanada', 'Rebanado', 'Estándar', 'Grueso', 'Corte'];
const DEFAULT_EXCLUDE_TERMS = ['Barra'];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseTerms(value, defaults) {
  const source = String(value || '').trim();
  const terms = source ? source.split(',') : defaults;
  return terms.map(normalizeText).filter(Boolean);
}

function getProductRuleConfig() {
  return {
    includeTerms: parseTerms(process.env.REBANADO_PRODUCT_INCLUDE_TERMS, DEFAULT_INCLUDE_TERMS),
    excludeTerms: parseTerms(process.env.REBANADO_PRODUCT_EXCLUDE_TERMS, DEFAULT_EXCLUDE_TERMS)
  };
}

function lineaAplicaARebanado(linea, config = getProductRuleConfig()) {
  const presentation = normalizeText(linea?.presentacion);
  const cutType = normalizeText(linea?.tipoRebanado ?? linea?.tipo_rebanado);
  const searchable = `${presentation} ${cutType}`.trim();

  if (!searchable) return false;
  if (config.excludeTerms.some(term => searchable.includes(term))) return false;
  return config.includeTerms.some(term => searchable.includes(term));
}

module.exports = {
  DEFAULT_INCLUDE_TERMS,
  DEFAULT_EXCLUDE_TERMS,
  getProductRuleConfig,
  lineaAplicaARebanado,
  normalizeText
};
