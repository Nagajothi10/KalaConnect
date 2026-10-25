'use strict';

/**
 * Gemini AI Service — Phase 3/4
 * Handles: title/description/tag generation, category suggestion,
 * price-range suggestion, and the shopping assistant chatbot.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI = null;
let generationModel = null;

function getGenAI() {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in server/.env');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

function getGenerationModel() {
  if (!generationModel) {
    generationModel = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return generationModel;
}



/**
 * Craft types and materials used for category suggestion when AI is unavailable.
 */
const CATEGORY_KEYWORDS = {
  'Pottery & Ceramics': ['clay', 'ceramic', 'pottery', 'terracotta', 'earthen', 'wheel', 'kiln'],
  'Textile & Weaving': ['silk', 'cotton', 'khadi', 'weave', 'fabric', 'loom', 'thread', 'yarn', 'kalamkari', 'batik', 'ikat'],
  'Woodcraft': ['wood', 'teak', 'rosewood', 'bamboo', 'cane', 'carving', 'furniture'],
  'Metal & Jewellery': ['brass', 'copper', 'silver', 'gold', 'metal', 'jewel', 'ring', 'necklace', 'bangle', 'dhokra'],
  'Painting & Art': ['painting', 'canvas', 'madhubani', 'warli', 'pattachitra', 'miniature', 'art', 'draw'],
  'Leather Craft': ['leather', 'bag', 'wallet', 'shoes', 'footwear'],
  'Stone Craft': ['stone', 'marble', 'granite', 'sandstone', 'idol', 'sculpture'],
  'Bamboo & Cane': ['bamboo', 'cane', 'rattan', 'basket', 'wicker'],
  'Handmade Paper': ['paper', 'handmade', 'notebook', 'journal'],
  'Home Décor': ['vase', 'lamp', 'candle', 'decor', 'wall', 'hanging', 'cushion', 'mat'],
};

/**
 * Rule-based category suggestion from material/craft_type text.
 */
function suggestCategoryFallback(material, craftType) {
  const text = `${material} ${craftType}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return 'Handmade Crafts';
}

/**
 * Rule-based price suggestion based on craft type and similar products.
 */
function suggestPriceFallback(craftType, existingPrices) {
  if (existingPrices && existingPrices.length > 0) {
    const sorted = [...existingPrices].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || sorted[0];
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1];
    return { min: Math.round(q1 * 0.9), max: Math.round(q3 * 1.1), basis: 'similar_products' };
  }
  // Category-based defaults (INR ranges)
  const defaults = {
    'Pottery & Ceramics': [200, 1500],
    'Textile & Weaving': [500, 5000],
    'Woodcraft': [300, 8000],
    'Metal & Jewellery': [500, 15000],
    'Painting & Art': [800, 20000],
    'Leather Craft': [400, 5000],
  };
  const match = defaults[craftType] || [200, 2000];
  return { min: match[0], max: match[1], basis: 'category_average' };
}

/**
 * Generate AI product listing content (title, description, tags, category, price).
 * @param {{ material: string, craft_type: string, palette?: string, quality_score?: number }} productInfo
 * @param {number[]} similarPrices - prices of similar published products
 */
async function generateProductContent(productInfo, similarPrices = []) {
  const { material, craft_type, palette = '', quality_score = 80 } = productInfo;

  // Fallback category/price always computed
  const categoryFallback = suggestCategoryFallback(material, craft_type);
  const priceSuggestion = suggestPriceFallback(craft_type, similarPrices);

  if (!GEMINI_API_KEY) {
    console.warn('[ai] GEMINI_API_KEY not set — using rule-based fallbacks');
    return {
      ai_title: `${craft_type} in ${material}`,
      ai_description: `A handcrafted ${craft_type.toLowerCase()} made from ${material.toLowerCase()}, created by a skilled artisan.`,
      ai_tags: JSON.stringify([craft_type.toLowerCase(), material.toLowerCase(), 'handmade', 'artisan']),
      ai_category: categoryFallback,
      ai_price_min: priceSuggestion.min,
      ai_price_max: priceSuggestion.max,
      generated_by: 'rule_based_fallback',
    };
  }

  const prompt = `You are an expert in Indian handmade crafts and marketplace listings.

A new product is being listed on KalaConnect, a marketplace for Indian artisans.
Material: ${material}
Craft type: ${craft_type}
${palette ? `Dominant colours: ${palette}` : ''}
Image quality score: ${quality_score}/100

Write compelling, authentic product listing content. Respond ONLY with valid JSON:
{
  "title": "Compelling 6-10 word title (no quotes around the whole thing)",
  "description": "2-3 sentences (60-100 words) about craft, material, and appeal to buyers. Mention the Indian craft tradition if relevant.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "Most fitting category from: Pottery & Ceramics, Textile & Weaving, Woodcraft, Metal & Jewellery, Painting & Art, Leather Craft, Stone Craft, Bamboo & Cane, Home Décor, Handmade Crafts",
  "price_min": <integer INR — realistic low-end price>,
  "price_max": <integer INR — realistic high-end price>
}`;

  try {
    const model = getGenerationModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown fences if present
    const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      ai_title: parsed.title || `${craft_type} in ${material}`,
      ai_description: parsed.description || '',
      ai_tags: JSON.stringify(Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : []),
      ai_category: parsed.category || categoryFallback,
      ai_price_min: parsed.price_min || priceSuggestion.min,
      ai_price_max: parsed.price_max || priceSuggestion.max,
      generated_by: 'gemini-1.5-flash',
    };
  } catch (err) {
    console.error('[ai] generateProductContent failed:', err.message);
    return {
      ai_title: `${craft_type} in ${material}`,
      ai_description: `A handcrafted ${craft_type.toLowerCase()} made from ${material.toLowerCase()}.`,
      ai_tags: JSON.stringify([craft_type.toLowerCase(), material.toLowerCase(), 'handmade']),
      ai_category: categoryFallback,
      ai_price_min: priceSuggestion.min,
      ai_price_max: priceSuggestion.max,
      generated_by: 'rule_based_fallback',
      error: err.message,
    };
  }
}

/**
 * Shopping assistant chatbot powered by Google Gemini API.
 * @param {string} userMessage
 * @param {Array} history - Previous chat history
 * @param {Array<Object>} products - published products from DB for context
 */
async function chatWithAssistant(userMessage, history = [], products = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const errorMsg = 'GEMINI_API_KEY is not configured in server/.env';
    return {
      reply: `Gemini Configuration Error: ${errorMsg}. Please set GEMINI_API_KEY in server/.env to use KalaCraft AI.`,
      history,
      error: errorMsg,
    };
  }

  // Build product context string (top 20 products to keep prompt size manageable)
  const productContext = products.slice(0, 20).map((p) =>
    `ID:${p.id} | "${p.ai_title || p.product_name}" | ${p.craft_type} | ${p.material} | ₹${p.price} | Category: ${p.ai_category || p.craft_type}`
  ).join('\n');

  const systemInstruction = `You are KalaConnect's friendly AI shopping assistant. You help customers discover authentic Indian handmade products.

AVAILABLE PRODUCTS IN CATALOG:
${productContext || 'No products listed yet.'}

RULES:
- Only recommend products that are in the catalog above. NEVER invent products, prices, or availability.
- When recommending a product, always mention its ID, name, price, material, and craft type.
- Ask follow-up questions to understand: budget, occasion, material preference, recipient, style.
- If no product matches, say so honestly and suggest they check back later.
- Keep responses concise (2-4 sentences) and friendly.
- Always recommend real products by their ID so the frontend can link to them.
- Format product recommendations as: "**[Product Name]** (₹Price) — [brief description]. View it at /products/ID"`;

  // Normalize history into Gemini message objects { role: 'user' | 'model', parts: [{ text }] }
  const formattedHistory = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item) continue;
      let text = '';
      if (typeof item.content === 'string') {
        text = item.content;
      } else if (typeof item.text === 'string') {
        text = item.text;
      } else if (Array.isArray(item.parts)) {
        text = item.parts.map((p) => (typeof p === 'string' ? p : p.text || '')).join('');
      }
      text = text.trim();
      if (!text) continue;

      const role = (item.role === 'model' || item.role === 'assistant') ? 'model' : 'user';
      formattedHistory.push({ role, parts: [{ text }] });
    }
  }

  // Gemini requires multi-turn chat history to start with a 'user' turn
  while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
    formattedHistory.shift();
  }

  // Ensure strict alternating turns (user -> model -> user -> model)
  const sanitizedHistory = [];
  for (const msg of formattedHistory) {
    if (sanitizedHistory.length === 0) {
      sanitizedHistory.push(msg);
    } else {
      const prev = sanitizedHistory[sanitizedHistory.length - 1];
      if (prev.role === msg.role) {
        prev.parts[0].text += `\n${msg.parts[0].text}`;
      } else {
        sanitizedHistory.push(msg);
      }
    }
  }
  // Ensure the history ends with 'model' so that sending userMessage continues the alternate sequence
  if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
    sanitizedHistory.pop();
  }

  try {
    let result = null;
    const primaryModelName = process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite';
    try {
      const model = getGenAI().getGenerativeModel({
        model: primaryModelName,
        systemInstruction,
      });
      const chat = model.startChat({ history: sanitizedHistory });
      result = await chat.sendMessage(userMessage);
    } catch (primaryErr) {
      // In case the default model experiences a temporary demand spike, gracefully try gemini-3.5-flash
      if (!process.env.GEMINI_CHAT_MODEL && primaryErr.status === 503) {
        console.warn(`[ai] ${primaryModelName} experienced temporary 503 spike, trying gemini-3.5-flash...`);
        const fallbackModel = getGenAI().getGenerativeModel({
          model: 'gemini-3.5-flash',
          systemInstruction,
        });
        const fallbackChat = fallbackModel.startChat({ history: sanitizedHistory });
        result = await fallbackChat.sendMessage(userMessage);
      } else {
        throw primaryErr;
      }
    }

    const reply = result?.response?.text()?.trim() || '';

    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage, text: userMessage },
      { role: 'assistant', content: reply, text: reply },
    ];

    return { reply, history: updatedHistory };
  } catch (err) {
    console.error('[ai] Gemini chatWithAssistant failed:', err.message);
    return {
      reply: `Gemini API Error: ${err.message}`,
      history,
      error: err.message,
    };
  }
}

module.exports = { generateProductContent, chatWithAssistant, suggestCategoryFallback, suggestPriceFallback };
