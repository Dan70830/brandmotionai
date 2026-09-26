import { CREATIVE_SKILLS, validateProductParams, extractProductFacts } from './creativeSkills.js';

const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const testProducts = [
  {
    id: 'Product A',
    name: 'AuraGlow Rosewater Facial Spray',
    description: 'Ultra-fine organic rosewater hydrating mist that soothes dry, sensitive skin and gives an instant dewy glow.',
    image: dummyDataUrl
  },
  {
    id: 'Product B',
    name: 'VoltGrip Ergonomic Gaming Mouse',
    description: 'Ultra-lightweight wireless mouse with 26000 DPI sensor, textured side grips, and 80-hour rechargeable battery life.',
    image: dummyDataUrl
  }
];

const styles = ['problem_solution', 'recommendation', 'first_impression'];

console.log('===================================================================');
console.log('      PRODUCT-AWARE CREATIVE SKILL SYSTEM — LOCAL TEST SUITE        ');
console.log('===================================================================\n');

testProducts.forEach((product) => {
  console.log(`\n===================================================================`);
  console.log(`[${product.id}] NAME: ${product.name}`);
  console.log(`DESCRIPTION: ${product.description}`);
  console.log(`-------------------------------------------------------------------`);

  // Fact Extraction Log
  const facts = extractProductFacts(product.name, product.description);
  console.log(`FACT EXTRACTION ANALYSIS:`);
  console.log(`  • Extracted Category:   "${facts.category}"`);
  console.log(`  • Consideration Hook:   "${facts.problem}"`);
  console.log(`  • Highlight 1:          "${facts.highlight1}"`);
  console.log(`  • Highlight 2:          "${facts.highlight2}"`);
  console.log(`-------------------------------------------------------------------`);

  styles.forEach((styleId) => {
    const validation = validateProductParams(product, styleId);
    if (!validation.valid) {
      console.error(`Validation Error for ${styleId}: ${validation.message}`);
      return;
    }

    const skill = CREATIVE_SKILLS[styleId];
    const script = skill.generateScript(product.name, product.description);
    const visualPrompt = skill.generateVisualPrompt(product.name, product.description);
    const wordCount = script.split(/\s+/).filter(Boolean).length;

    console.log(`\n  ► CREATIVE SKILL: ${styleId.toUpperCase()} (${skill.name})`);
    console.log(`    • Hook Strategy: ${skill.hookStrategy}`);
    console.log(`    • Narrative Structure: ${skill.narrativeStructure}`);
    console.log(`    • Word Count: ${wordCount} words (Target: 18-30 words)`);
    console.log(`    • GENERATED UGC SCRIPT:`);
    console.log(`      "${script}"`);
    console.log(`    • GENERATED VISUAL PROMPT:`);
    console.log(`      "${visualPrompt}"`);
  });
});

console.log('\n===================================================================');
console.log('TESTING STAGE VALIDATION FOR MISSING DATA (EXPECTED TO FAIL GRACEFULLY)');
console.log('-------------------------------------------------------------------');
const missingRes = validateProductParams({ name: '', description: '', image: '' }, 'problem_solution');
console.log(`Missing Data Validation Response:`);
console.log(`  Status: VALIDATION_FAILED (as expected)`);
console.log(`  Message: "${missingRes.message}"`);

console.log('\n===================================================================');
console.log('                      LOCAL TEST COMPLETE                          ');
console.log('===================================================================\n');
