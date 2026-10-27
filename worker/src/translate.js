// ============================================================
// PrepareKora Worker — Translation
// Primary: Cloudflare Workers AI (IndicTrans2)
// Fallback: MyMemory (free, no key)
// Never exposes secrets — no API key needed for either source.
// ============================================================

import { json, error, readJSON } from "./utils.js";

/* Map of our app language codes → IndicTrans2 model codes */
const LANG_MAP = {
  as: "asm_Beng",
  en: "eng_Latn",
  hi: "hin_Deva",
  bn: "ben_Beng"
};

const MAX_TEXT_LENGTH = 2000;

/* ---------- POST /api/translate ---------- */

export async function handleTranslate(request, env) {
  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const text = String(body.text || "").trim();
  const source = String(body.source || "en");
  const target = String(body.target || "as");

  if (!text) return error("Text is required", 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return error(`Text too long (max ${MAX_TEXT_LENGTH} characters)`, 400);
  }

  if (!LANG_MAP[source]) return error("Unsupported source language", 400);
  if (!LANG_MAP[target]) return error("Unsupported target language", 400);

  if (source === target) {
    return json({ translated: text, source: "passthrough" });
  }

  /* ---------- Attempt 1: Cloudflare Workers AI ---------- */

  if (env.AI) {
    try {
      const result = await env.AI.run(
        "@cf/ai4bharat/indictrans2-en-indic-1B",
        {
          text,
          source_language: LANG_MAP[source],
          target_language: LANG_MAP[target]
        }
      );

      const translated =
        result &&
        Array.isArray(result.translations) &&
        typeof result.translations[0] === "string"
          ? result.translations[0].trim()
          : "";

      if (translated && translated !== text) {
        return json({ translated, source: "workers-ai" });
      }
    } catch (err) {
      /* Fall through to MyMemory */
    }
  }

  /* ---------- Attempt 2: MyMemory (free, no key) ---------- */

  try {
    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" + encodeURIComponent(text) +
      "&langpair=" + encodeURIComponent(`${source}|${target}`);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 86400 }
    });

    if (res.ok) {
      const data = await res.json();
      const translated =
        data &&
        data.responseData &&
        typeof data.responseData.translatedText === "string"
          ? data.responseData.translatedText.trim()
          : "";

      if (translated && translated !== text) {
        return json({ translated, source: "mymemory" });
      }
    }
  } catch (err) {
    /* Fall through to English */
  }

  /* ---------- Final fallback: return original ---------- */

  return json({ translated: text, source: "fallback" });
}
