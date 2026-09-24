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
function outputText(payload: any) {
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["document_type", "currency", "products", "modifiers", "notes"],
  properties: {
    document_type: { type: "string", enum: ["menu", "inventory", "retail_catalog", "unknown"] },
    currency: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
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
        additionalProperties: false,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método no permitido" }, 405);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return response({
      error: "OPENAI_NOT_CONFIGURED",
      message: "Falta configurar OPENAI_API_KEY en los secretos de Supabase.",
    }, 503);
  }

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
  try { body = await req.json(); } catch { return response({ error: "INVALID_JSON" }, 400); }

  const restaurantId = Number(body?.restaurant_id || 0);
  const imageDataUrl = String(body?.image_data_url || "");
  const targetHint = String(body?.target_hint || "restaurant_menu");

  if (!restaurantId || !Number.isFinite(restaurantId)) return response({ error: "INVALID_RESTAURANT" }, 400);
  if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(imageDataUrl)) return response({ error: "INVALID_IMAGE" }, 400);
  if (imageDataUrl.length > 10_500_000) return response({ error: "IMAGE_TOO_LARGE" }, 413);

  const [{ data: staff }, { data: isAdmin }] = await Promise.all([
    admin.from("restaurant_staff").select("id,role,active")
      .eq("restaurant_id", restaurantId).eq("user_id", userId).eq("active", true).maybeSingle(),
    admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!staff && !isAdmin) return response({ error: "FORBIDDEN" }, 403);

  const prompt = `
Analiza esta foto para digitalizar datos de un negocio gastronómico.
Contexto seleccionado en la aplicación: ${targetHint}.

Primero clasifica visualmente el documento como menu, inventory, retail_catalog o unknown.

REGLAS PARA MENÚ:
- Usa estructura visual, columnas, proximidad entre nombre y precio, tamaños de letra y secciones.
- En products incluye SOLO productos principales vendibles con nombre y precio claramente asociados.
- NO cuentes títulos, nombre del local, categorías, ingredientes sueltos, descripciones, redes sociales, badges NEW, promociones ni textos decorativos.
- Extras/modificadores ("hazla doble", "hazla triple", extra queso, cambio de proteína, agregados) van SOLO en modifiers.
- Si un texto está cortado/mutilado o no puedes asociarlo con seguridad a un producto, omítelo.
- category debe contener la sección real (ej. "Hamburguesas").
- description debe contener ingredientes/descripción cercanos al producto.
- price conserva el valor numérico original. cost/stock/minimum_stock=0, unit/barcode/sku/brand="" si no aplican.

REGLAS PARA INVENTARIO:
- Extrae únicamente insumos/ítems reales identificables.
- Usa stock, minimum_stock, cost y unit cuando estén visibles; si no, usa 0 o "".
- No conviertas encabezados o notas en ítems.

REGLAS PARA RETAIL:
- Extrae productos reales; barcode/SKU/brand/price/cost/stock solo cuando estén visibles.
- No inventes códigos.

REGLAS GENERALES:
- No inventes nombres, precios, cantidades ni descripciones.
- Mantén el idioma original.
- Evita duplicados visuales.
- confidence debe ser 0..1. Omite ítems con confidence < 0.65.
- Si la imagen es un menú, document_type="menu" incluso si target_hint era restaurant_inventory.
- currency debe ser el código o símbolo inferible; si no se sabe, "".
- Campos numéricos no visibles deben ser 0 y strings no visibles "".
`;

  const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-5.6-sol";
  const ai = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
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
      text: { format: { type: "json_schema", name: "restaurant_photo_extraction", strict: true, schema } },
      max_output_tokens: 12000,
    }),
  });

  const payload = await ai.json().catch(() => ({}));
  if (!ai.ok) {
    console.error("OpenAI response error", {
      status: ai.status,
      type: payload?.error?.type,
      code: payload?.error?.code,
      message: payload?.error?.message,
    });
    return response({
      error: "OPENAI_ERROR",
      message: payload?.error?.message || "No se pudo analizar la imagen.",
    }, ai.status >= 500 ? 502 : 400);
  }

  const text = outputText(payload);
  if (!text) return response({ error: "EMPTY_AI_RESPONSE" }, 502);

  let parsed: any;
  try { parsed = JSON.parse(text); }
  catch { return response({ error: "INVALID_AI_RESPONSE" }, 502); }

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

  return response({
    ok: true,
    model,
    document_type: parsed?.document_type || "unknown",
    currency: String(parsed?.currency || ""),
    products,
    modifiers,
    notes: Array.isArray(parsed?.notes) ? parsed.notes.slice(0, 20) : [],
  });
});
