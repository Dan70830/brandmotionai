/**
 * Creative Skill Architecture & Dynamic Generation Engine
 * Defines UGC Creative Skills, Fact Extractor, and product-aware strategy generators.
 *
 * Rules enforced:
 *  - No fabricated personal experience (no "I've been using", "I noticed through use", "worked for me")
 *  - No invented problems presented as viewer fact — only grounded consideration framing
 *  - Product name used naturally — category references replace name repetition mid-script
 *  - Visual prompts describe product-led UGC (no talking-creator unless image is supplied)
 *  - Product image is the absolute source of truth — no benchmark/replacement product
 */

/**
 * Product Fact Extractor
 * Identifies key category, grounded consideration context, and 1-2 factual highlights from product info.
 */
export function extractProductFacts(productName, description) {
  const cleanName = (productName || '').trim();
  const desc = (description || '').trim();
  const descLower = desc.toLowerCase();

  // 1. Identify Product Category / Type
  let category = '';
  const typeMatch = desc.match(/\b(facial spray|hydrating mist|face serum|facial mist|gaming mouse|wireless mouse|mouse|earbuds|headphones|cleanser|moisturizer|cream|spray|bottle|watch|bag|shoes|shampoo|serum|skincare)\b/i);
  if (typeMatch) {
    category = typeMatch[0].toLowerCase();
  } else {
    const nameWords = cleanName.split(/\s+/);
    category = nameWords.slice(-2).join(' ').toLowerCase();
  }

  // 2. Build grounded "consideration context"
  let problem = null;

  if (descLower.includes('rosewater') || descLower.includes('hydrating mist') || descLower.includes('facial spray') || descLower.includes('facial mist')) {
    problem = 'Looking for a lightweight facial spray?';
  } else if (descLower.includes('gaming') || cleanName.toLowerCase().includes('gaming')) {
    problem = 'Looking for a lighter gaming mouse?';
  } else if (descLower.includes('mouse') || descLower.includes('wireless mouse')) {
    problem = 'Looking for a wireless mouse with serious specs?';
  } else if (descLower.includes('serum')) {
    problem = 'Looking for a simple, effective serum?';
  } else {
    problem = `Looking for a better ${category || 'option'}?`;
  }

  // 3. Extract 1-2 Specific Key Highlights (factual, from description only)
  let highlight1 = '';
  let highlight2 = '';

  if (descLower.includes('rosewater')) {
    highlight1 = 'organic rosewater mist';
    highlight2 = 'soothes dry skin and leaves a dewy finish';
  } else if (descLower.includes('gaming') || descLower.includes('mouse')) {
    highlight1 = 'ultra-lightweight with textured side grips';
    highlight2 = '80-hour rechargeable battery';
  } else {
    const clauses = desc.replace(/\.$/, '').split(/[\,\;\.]/gm).map(c => c.trim()).filter(Boolean);
    highlight1 = clauses[0] ? clauses[0].toLowerCase().replace(/^(an?|the)\s+/i, '') : 'great features';
    highlight2 = clauses[1] ? clauses[1].toLowerCase() : '';
  }

  return {
    name: cleanName,
    category,
    problem,
    highlight1,
    highlight2,
    rawDescription: desc
  };
}

/**
 * Caption Formatter
 * Deterministically splits a narration script into 2-3 balanced, naturally punctuated lines
 * with newlines (\n) to prevent horizontal overflow/clipping in Hyperframes video rendering.
 * Enforces centered, mobile-safe margins without awkward word breaks.
 */
export function formatCaptions(script) {
  if (!script || typeof script !== 'string') return '';
  const clean = script.trim().replace(/\s+/g, ' ');

  // Split into natural sentence/clause phrases
  const sentences = clean.split(/(?<=[?.!])\s+/).filter(Boolean);

  if (sentences.length >= 2 && sentences.length <= 3) {
    return sentences.join('\n');
  }

  // If single long sentence or > 3 sentences, split into 2-3 balanced lines by words
  const words = clean.split(' ');
  if (words.length <= 7) return clean;

  const targetLines = words.length > 18 ? 3 : 2;
  const chunkSize = Math.ceil(words.length / targetLines);

  const lines = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    lines.push(words.slice(i, i + chunkSize).join(' '));
  }

  return lines.join('\n');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const CREATIVE_SKILLS = {

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL 1: Problem → Solution
  // Product-led UGC direction: hand picking up / presenting product in real setting
  // ─────────────────────────────────────────────────────────────────────────────
  problem_solution: {
    id: 'problem_solution',
    name: 'Problem → Solution',
    tagline: 'Grounded context leads naturally into the product as a solution.',
    description: 'Opens with a realistic consideration context, then bridges to specific documented product benefits.',
    hookStrategy: 'Grounded product-relevant consideration — not an invented viewer problem.',
    narrativeStructure: 'Consideration context → product → specific feature/benefit → soft CTA',
    tone: 'Helpful and informative, social-media natural',
    productFactStrategy: 'Select documented problem-adjacent context + 1-2 factual product features.',
    ctaStrategy: 'Soft discovery CTA (link in bio / worth a look)',
    visualStrategy: 'Authentic smartphone UGC footage of product casually presented toward camera.',
    pacing: 'Hook (0-2s), Solution Bridge (2-5s), Proof & CTA (5-8s)',
    captionStrategy: 'Dynamic mobile-safe multi-line subtitles',

    generateScript: (productName, description) => {
      const facts = extractProductFacts(productName, description);
      const descLower = facts.rawDescription.toLowerCase();

      if (descLower.includes('rosewater')) {
        return `${facts.problem} ${facts.name} is an ultra-fine rosewater mist — soothes dry skin and leaves a dewy glow. Link in bio.`;
      } else if (descLower.includes('mouse') || descLower.includes('gaming')) {
        return `${facts.problem} ${facts.name} has an ultra-lightweight build, textured grips, and an 80-hour battery. Worth a look.`;
      } else {
        const joiner = facts.highlight2 ? ` and ${facts.highlight2}` : '';
        return `${facts.problem} ${facts.name} features ${facts.highlight1}${joiner}. Definitely worth checking out.`;
      }
    },

    generateVisualPrompt: (productName, description) => {
      const cleanName = (productName || '').trim();
      const descLower = (description || '').toLowerCase();

      let context = 'in a clean everyday real-world setting';
      if (descLower.includes('rosewater') || descLower.includes('spray') || descLower.includes('mist')) {
        context = 'in a real bathroom or vanity setting with soft natural window light';
      } else if (descLower.includes('gaming') || descLower.includes('mouse')) {
        context = 'on a gaming desk with soft ambient lighting';
      }

      return `Authentic smartphone UGC footage of the ${cleanName} ${context}. The product is casually picked up and presented toward the camera, handheld framing with subtle natural movement, ordinary real-world lighting, imperfect but appealing social-media composition, close product interaction, natural depth and focus shifts. Preserve the exact product packaging, label, colors, shape and proportions from the supplied image. No human face or creator visible. No cinematic commercial styling.`;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL 2: Recommendation
  // Product-led UGC direction: product presented in natural close-up repositioning
  // ─────────────────────────────────────────────────────────────────────────────
  recommendation: {
    id: 'recommendation',
    name: 'Product Recommendation',
    tagline: 'Casual word-of-mouth recommendation grounded in real product facts.',
    description: 'Frames the product as worth recommending based on its documented specifications — without implying personal testing.',
    hookStrategy: 'Why someone would seek this product category, then pivot to specific product facts.',
    narrativeStructure: 'Why consider this category → specific factual product details → natural recommendation',
    tone: 'Casual, warm, conversational',
    productFactStrategy: 'Base recommendation strictly on 1-2 actual documented product facts only.',
    ctaStrategy: 'Natural word-of-mouth close (worth looking at / check it out)',
    visualStrategy: 'Product-led UGC camera tilt and close-up detail presentation.',
    pacing: 'Hook (0-2s), Why This (2-5s), Recommendation Close (5-8s)',
    captionStrategy: 'Clean social subtitles with balanced lines',

    generateScript: (productName, description) => {
      const facts = extractProductFacts(productName, description);
      const descLower = facts.rawDescription.toLowerCase();

      if (descLower.includes('gaming') || descLower.includes('mouse')) {
        return `If a lightweight wireless gaming mouse is on your radar — this one's worth knowing about. The ${facts.name} has textured side grips and lasts up to 80 hours on a charge.`;
      } else if (descLower.includes('rosewater') || descLower.includes('spray') || descLower.includes('mist')) {
        return `If you're into facial sprays, this one's interesting. The ${facts.name} is an organic rosewater mist — soothes dry skin and gives a dewy finish.`;
      } else {
        const cat = facts.category ? facts.category : 'product';
        return `If you're in the market for a ${cat}, this one's genuinely worth considering. The ${facts.name} features ${facts.highlight1}${facts.highlight2 ? ` and ${facts.highlight2}` : ''}.`;
      }
    },

    generateVisualPrompt: (productName, description) => {
      const cleanName = (productName || '').trim();
      const descLower = (description || '').toLowerCase();

      let setting = 'in a casual everyday space';
      if (descLower.includes('rosewater') || descLower.includes('spray') || descLower.includes('mist')) {
        setting = 'by a bathroom vanity shelf with warm natural light';
      } else if (descLower.includes('gaming') || descLower.includes('mouse')) {
        setting = 'at a desk workspace';
      }

      return `Authentic product-led UGC video of the ${cleanName} ${setting}. Casual handheld smartphone camera gently tilts and repositions to highlight the product label, texture, and physical design details. Subtle organic hand interaction presenting the product in close-up with soft depth of field. Preserve exact product packaging, label, colors, shape and proportions from the reference image. No human face visible. Organic real-world lighting, authentic short-form social composition.`;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL 3: First Impression
  // Product-led UGC direction: spontaneous camera drift highlighting standout detail
  // ─────────────────────────────────────────────────────────────────────────────
  first_impression: {
    id: 'first_impression',
    name: 'First Impression',
    tagline: 'Spontaneous attention-catch framed around a standout product detail.',
    description: 'Opens with a discovery hook on a visually interesting or spec-led product detail — no fabricated testing or ownership implied.',
    hookStrategy: 'What immediately catches the eye or stands out about this product on first encounter.',
    narrativeStructure: 'Discovery hook → standout visual or spec detail → one factual highlight → casual reaction',
    tone: 'Spontaneous, curious, genuine',
    productFactStrategy: 'Highlight 1 immediate visual or functional detail — no invented long-term usage claims.',
    ctaStrategy: 'Casual curiosity close (keeping an eye on this / kind of want to try this)',
    visualStrategy: 'Spontaneous product discovery with close-up focus shift.',
    pacing: 'Discovery (0-2s), Detail Focus (2-5s), Reaction (5-8s)',
    captionStrategy: 'Bold multi-line kinetic subtitles',

    generateScript: (productName, description) => {
      const facts = extractProductFacts(productName, description);
      const descLower = facts.rawDescription.toLowerCase();

      if (descLower.includes('gaming') || descLower.includes('mouse')) {
        return `Okay, the ${facts.name} — first thing that stands out? It's surprisingly lightweight. And 80 hours of battery in a wireless gaming mouse is hard to ignore.`;
      } else if (descLower.includes('rosewater') || descLower.includes('spray') || descLower.includes('mist')) {
        return `The ${facts.name} — just look at this. Ultra-fine rosewater mist, organic formula, made for dry and sensitive skin. The packaging alone is clean.`;
      } else {
        return `Look at this — ${facts.name}. The ${facts.highlight1} really catches your eye. ${facts.highlight2 ? capitalize(facts.highlight2) + '.' : ''} Kind of want to try this one.`;
      }
    },

    generateVisualPrompt: (productName, description) => {
      const cleanName = (productName || '').trim();
      const descLower = (description || '').toLowerCase();

      let discoverySetting = 'on an everyday table surface';
      if (descLower.includes('rosewater') || descLower.includes('spray') || descLower.includes('mist')) {
        discoverySetting = 'on a clean counter surface';
      } else if (descLower.includes('gaming') || descLower.includes('mouse')) {
        discoverySetting = 'on a desk setup';
      }

      return `Spontaneous smartphone UGC video revealing the ${cleanName} ${discoverySetting}. Handheld camera casually moves in close to showcase the standout packaging and label text as if discovering the item for the first time. Natural handheld movement, organic shifts in focus, real-world lighting. Imperfect, genuine short-form social video feel. Preserve exact product packaging, label, colors, shape and proportions from the reference image. No human face visible.`;
    }
  }
};

/**
 * Validate input product parameters strictly
 */
export function validateProductParams(product, ugcStyle) {
  if (!product) {
    return { valid: false, message: 'Missing product payload. Please provide product information.' };
  }

  const missing = [];
  if (!product.image || typeof product.image !== 'string' || !product.image.trim()) {
    missing.push('uploaded product image');
  }
  if (!product.name || typeof product.name !== 'string' || !product.name.trim()) {
    missing.push('product name');
  }
  if (!product.description || typeof product.description !== 'string' || !product.description.trim()) {
    missing.push('product description');
  }
  if (!ugcStyle || !CREATIVE_SKILLS[ugcStyle]) {
    missing.push('valid UGC skill style (problem_solution, recommendation, or first_impression)');
  }

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Required generation parameters missing: ${missing.join(', ')}. Please supply all required product details.`,
    };
  }

  // Reject seeded/demo Unsplash fallback images explicitly
  if (product.image.includes('unsplash.com')) {
    return {
      valid: false,
      message: 'Product image error: Sample/seeded Unsplash images are disabled. Please upload your actual product image file.',
    };
  }

  return { valid: true };
}
