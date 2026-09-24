import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}
function parseJwtSub(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return String(JSON.parse(atob(pad))?.sub || "");
  } catch { return ""; }
}
function openAiOutputText(payload: any) {
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}
function geminiOutputText(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => typeof p?.text === "string" ? p.text : "").join("").trim();
}
function parseImageDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!m) return null;
  return { mimeType: m[1].toLowerCase().replace("jpg", "jpeg"), base64: m[2] };
}
function cleanResult(parsed: any) {
  const products = Array.isArray(parsed?.products)
    ? parsed.products.filter((p: any) =>
        p && String(p.name || "").trim() && Number(p.confidence || 0) >= 0.65
      ).slice(0, 250)
    : [];
  const modifiers = Array.isArray(parsed?.modifiers)
    ? parsed.modifiers.filter((m: any) =>
        m && String(m.name || "").trim() && Number(m.confidence || 0) >= 0.65
      ).slice(0, 100)
    : [];
  return {
    document_type: parsed?.document_type || "unknown",
    currency: String(parsed?.currency || ""),
    products,
    modifiers,
    notes: Array.isArray(parsed?.notes) ? parsed.notes.slice(0, 20) : [],
  };
}

const schema = {
  type: "object",
  required: ["document_type", "currency", "products", "modifiers", "notes"],
  properties: {
    document_type: { type: "string", enum: ["menu", "inventory", "retail_catalog", "unknown"] },
    currency: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        required: [
          "name","description","price","cost","stock","minimum_stock","unit",
          "category","barcode","sku","brand","confidence"
        ],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          cost: { type: "number" },
          stock: { type: "number" },
          minimum_stock: { type: "number" },
          unit: { type: "string" },
          category: { type: "string" },
          barcode: { type: "string" },
          sku: { type: "string" },
          brand: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    modifiers: {
      type: "array",
      items: {
        type: "object",
        required: ["name","description","price_delta","applies_to","confidence"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price_delta: { type: "number" },
          applies_to: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
};

function buildPrompt(targetHint: string) {
  return `
Analiza esta foto para digitalizar datos de un negocio gastronómico.
Contexto seleccionado en la aplicación: ${targetHint}.

Primero clasifica visualmente el documento como menu, inventory, retail_catalog o unknown.

REGLAS PARA MENÚ:
- Usa la estructura visual completa: columnas, alineación, proximidad entre nombre y precio, jerarquía tipográfica y secciones.
- En products incluye SOLO productos principales vendibles con nombre y precio claramente asociados.
- NO cuentes títulos, nombre del local, categorías, ingredientes sueltos, descripciones, redes sociales, badges NEW, promociones ni textos decorativos.
- Extras/modificadores ("hazla doble", "hazla triple", extra queso, cambio de proteína, agregados) van SOLO en modifiers.
- Si un texto está cortado, mutilado o no puedes asociarlo con seguridad a un producto, omítelo.
- category debe contener la sección real del menú cuando sea visible.
- description debe contener únicamente la descripción/ingredientes que pertenecen a ese producto.
- price conserva el valor numérico original. cost/stock/minimum_stock=0 y unit/barcode/sku/brand="" si no aplican.

REGLAS PARA INVENTARIO:
- Extrae únicamente insumos/ítems reales identificables.
- Usa stock, minimum_stock, cost y unit cuando estén visibles; si no, usa 0 o "".
- No conviertas encabezados, categorías, notas o texto explicativo en ítems.

REGLAS PARA RETAIL:
- Extrae únicamente productos reales identificables.
- barcode/SKU/brand/price/cost/stock solo cuando estén visibles.
- No inventes códigos ni cantidades.

REGLAS GENERALES:
- No inventes nombres, precios, cantidades ni descripciones.
- Mantén el idioma original.
- Evita duplicados aunque el mismo producto aparezca visualmente en más de una zona.
- confidence debe estar entre 0 y 1.
- Omite cualquier supuesto producto con confidence < 0.65.
- Si la imagen es un menú, document_type="menu" incluso si target_hint era restaurant_inventory.
- currency debe ser el código o símbolo inferible; si no se sabe, "".
- Campos numéricos no visibles deben ser 0; campos de texto no visibles deben ser "".
- Prioriza precisión sobre cantidad: es mejor omitir una detección dudosa que inventarla.
`;
}

async function tryGemini(image: { mimeType: string; base64: string }, prompt: string) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { ok: false, code: "GEMINI_NOT_CONFIGURED", retryable: true };

  const model = Deno.env.get("GEMINI_VISION_MODEL") || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: image.mimeType, data: image.base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 12000,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(payload?.error?.message || "Gemini no pudo analizar la imagen.");
    console.error("Gemini response error", {
      status: res.status,
      code: payload?.error?.code,
      statusText: payload?.error?.status,
      message: msg,
    });
    return {
      ok: false,
      code: res.status === 429 ? "GEMINI_RATE_LIMIT" : "GEMINI_ERROR",
      retryable: true,
      message: msg,
      status: res.status,
    };
  }

  const text = geminiOutputText(payload);
  if (!text) return { ok: false, code: "GEMINI_EMPTY", retryable: true };
  try {
    return {
      ok: true,
      provider: "gemini",
      model,
      result: cleanResult(JSON.parse(text)),
    };
  } catch {
    console.error("Gemini returned invalid structured JSON");
    return { ok: false, code: "GEMINI_INVALID_JSON", retryable: true };
  }
}

async function tryOpenAI(imageDataUrl: string, prompt: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { ok: false, code: "OPENAI_NOT_CONFIGURED", retryable: false };

  const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-5.6-sol";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageDataUrl, detail: "original" },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "restaurant_photo_extraction",
          strict: true,
          schema,
        },
      },
      max_output_tokens: 12000,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const providerCode = String(payload?.error?.code || "");
    const quotaExhausted = res.status === 429 &&
      (providerCode === "credit_balance_exhausted" || String(payload?.error?.type || "") === "insufficient_quota");
    console.error("OpenAI response error", {
      status: res.status,
      type: payload?.error?.type,
      code: providerCode,
      message: payload?.error?.message,
    });
    return {
      ok: false,
      code: quotaExhausted ? "OPENAI_NO_CREDITS" : "OPENAI_ERROR",
      retryable: false,
      status: res.status,
      message: quotaExhausted
        ? "La cuenta de OpenAI API no tiene créditos disponibles."
        : String(payload?.error?.message || "OpenAI no pudo analizar la imagen."),
    };
  }

  const text = openAiOutputText(payload);
  if (!text) return { ok: false, code: "OPENAI_EMPTY", retryable: false };
  try {
    return {
      ok: true,
      provider: "openai",
      model,
      result: cleanResult(JSON.parse(text)),
    };
  } catch {
    return { ok: false, code: "OPENAI_INVALID_JSON", retryable: false };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método no permitido" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return response({ error: "UNAUTHORIZED" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return response({ error: "SERVER_CONFIG" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const userId = authData?.user?.id || parseJwtSub(token);
  if (authError || !userId) return response({ error: "UNAUTHORIZED" }, 401);

  let body: any;
  try { body = await req.json(); }
  catch { return response({ error: "INVALID_JSON" }, 400); }

  const restaurantId = Number(body?.restaurant_id || 0);
  const imageDataUrl = String(body?.image_data_url || "");
  const targetHint = String(body?.target_hint || "restaurant_menu");

  if (!restaurantId || !Number.isFinite(restaurantId)) return response({ error: "INVALID_RESTAURANT" }, 400);
  if (imageDataUrl.length > 10_500_000) return response({ error: "IMAGE_TOO_LARGE" }, 413);
  const image = parseImageDataUrl(imageDataUrl);
  if (!image) return response({ error: "INVALID_IMAGE" }, 400);

  const [{ data: staff }, { data: isAdmin }] = await Promise.all([
    admin.from("restaurant_staff").select("id,role,active")
      .eq("restaurant_id", restaurantId).eq("user_id", userId).eq("active", true).maybeSingle(),
    admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!staff && !isAdmin) return response({ error: "FORBIDDEN" }, 403);

  const prompt = buildPrompt(targetHint);

  // 1) Gemini principal
  const gemini = await tryGemini(image, prompt);
  if (gemini.ok) {
    return response({
      ok: true,
      provider: gemini.provider,
      model: gemini.model,
      ...gemini.result,
    });
  }

  // 2) OpenAI como respaldo premium
  const openai = await tryOpenAI(imageDataUrl, prompt);
  if (openai.ok) {
    return response({
      ok: true,
      provider: openai.provider,
      model: openai.model,
      fallback_from: gemini.code,
      ...openai.result,
    });
  }

  // 3) El navegador hará OCR local si ambos proveedores fallan.
  const noGeminiKey = gemini.code === "GEMINI_NOT_CONFIGURED";
  const openAiNoCredits = openai.code === "OPENAI_NO_CREDITS";
  const message = noGeminiKey
    ? "Falta configurar GEMINI_API_KEY. OpenAI tampoco está disponible, así que se usará OCR local."
    : openAiNoCredits
      ? "Gemini no respondió y OpenAI API está sin saldo. Se usará OCR local."
      : "Los proveedores de IA visual no están disponibles. Se usará OCR local.";

  return response({
    error: noGeminiKey ? "GEMINI_NOT_CONFIGURED" : "AI_PROVIDERS_UNAVAILABLE",
    message,
    providers: {
      gemini: gemini.code,
      openai: openai.code,
    },
  }, noGeminiKey ? 503 : 502);
});
