const fs = require('fs');

const mappings = JSON.parse(fs.readFileSync('mappings.json', 'utf-8'));
let content = fs.readFileSync('src/data/relationshipsMaster.ts', 'utf-8');

const replacement = `
export function resolveTemplateIdAndLinesForProduct(p: ProductDefinition): {
  templateId: string;
  templateName: string;
  compatibleLineIds: string[];
  relationshipMode: 'STANDARD' | 'PERFORMANCE_ONLY';
  configurationStatus: 'APPROVED' | 'TEMPORARY_APPROVED' | 'UNCONFIGURED';
} {
  const productId = getProductModelId(p);
  const mappings: Record<string, any> = ${JSON.stringify(mappings, null, 2)};
  
  if (mappings[productId]) {
    return {
      templateId: mappings[productId].templateId,
      templateName: mappings[productId].templateName,
      compatibleLineIds: mappings[productId].compatibleLineIds,
      relationshipMode: mappings[productId].templateId === 'tmpl-controlled-performance-only' || mappings[productId].templateId === 'tmpl-torque-converter-performance-v1' ? 'PERFORMANCE_ONLY' : 'STANDARD',
      configurationStatus: mappings[productId].templateId === 'tmpl-controlled-performance-only' || mappings[productId].templateId === 'tmpl-torque-converter-performance-v1' ? 'TEMPORARY_APPROVED' : 'APPROVED',
    };
  }
  
  return {
    templateId: 'tmpl-controlled-performance-only',
    templateName: 'Controlled Performance Only',
    compatibleLineIds: p.compGroup === 'Engine' ? ['dyno-1', 'dyno-2', 'dyno-3'] : ['tb-1', 'tb-2', 'tb-3'],
    relationshipMode: 'PERFORMANCE_ONLY',
    configurationStatus: 'UNCONFIGURED',
  };
}
`;

content = content.replace(/export function resolveTemplateIdAndLinesForProduct[\s\S]*?export function buildAuthoritativeRelationships/, replacement.trim() + '\n\nexport function buildAuthoritativeRelationships');

fs.writeFileSync('src/data/relationshipsMaster.ts', content);
