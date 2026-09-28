import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const STAGING_CNAME_TARGET = "domains-pruebas.yummypro.online";
const STAGING_WORKER = "yummypro-custom-domain-staging";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function dnsAnswers(name: string, type: "TXT" | "CNAME") {
  const url = "https://dns.google/resolve?name=" + encodeURIComponent(name) + "&type=" + type;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error("DNS HTTP " + res.status);
  const data = await res.json();
  return Array.isArray(data?.Answer) ? data.Answer.map((x: any) => String(x?.data || "")) : [];
}

async function cfFetch(path: string, init: RequestInit, token: string) {
  const res = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.errors?.[0]?.message || ("Cloudflare HTTP " + res.status));
  }
  return payload;
}

async function findCustomHostname(zoneId: string, hostname: string, token: string) {
  const listed = await cfFetch(
    "/zones/" + encodeURIComponent(zoneId) + "/custom_hostnames?hostname.exact=" + encodeURIComponent(hostname) + "&per_page=5",
    { method: "GET" },
    token,
  );
  const rows = Array.isArray(listed?.result) ? listed.result : [];
  return rows.find((row: any) => String(row?.hostname || "").toLowerCase() === hostname.toLowerCase()) || null;
}

async function ensureStagingWorkerRoute(zoneId: string, hostname: string, token: string) {
  const pattern = hostname + "/*";
  const listed = await cfFetch(
    "/zones/" + encodeURIComponent(zoneId) + "/workers/routes",
    { method: "GET" },
    token,
  );
  const routes = Array.isArray(listed?.result) ? listed.result : [];
  const existing = routes.find((row: any) => String(row?.pattern || "").toLowerCase() === pattern.toLowerCase());

  if (existing) {
    if (String(existing?.script || "") !== STAGING_WORKER) {
      throw new Error("El dominio ya tiene una ruta Worker distinta en Cloudflare");
    }
    return existing;
  }

  const created = await cfFetch(
    "/zones/" + encodeURIComponent(zoneId) + "/workers/routes",
    {
      method: "POST",
      body: JSON.stringify({ pattern, script: STAGING_WORKER }),
    },
    token,
  );
  return created?.result || null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const provided = req.headers.get("x-cron-secret") || "";
    const { data: expected, error: secretError } = await admin.rpc("service_get_runtime_secret", {
      p_name: "custom_domain_reconcile_token",
    });
    if (secretError) throw secretError;
    if (!expected || provided !== String(expected)) return json({ error: "No autorizado" }, 401);

    let cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
    let cfZone = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";

    if (!cfToken) {
      const { data: vaultToken, error: vaultError } = await admin.rpc("service_get_runtime_secret", {
        p_name: "cloudflare_api_token",
      });
      if (vaultError) throw vaultError;
      cfToken = String(vaultToken || "").trim();
    }
    if (!cfToken || !cfZone) throw new Error("Cloudflare no está configurado para el reconciliador");

    const { data: rows, error: rowsError } = await admin
      .from("business_custom_domains")
      .select("id,restaurant_id,hostname,status,verification_token,ssl_status,provider_hostname_id,last_checked_at")
      .in("status", ["pending_dns", "dns_verified", "provisioning", "failed"])
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(20);
    if (rowsError) throw rowsError;

    const result: any[] = [];

    for (const row of rows || []) {
      const hostname = String(row.hostname || "").toLowerCase();
      try {
        const { data: restaurant, error: restaurantError } = await admin
          .from("restaurants")
          .select("id,active,subscription_status,subscription_plan,subscription_plan_id")
          .eq("id", row.restaurant_id)
          .maybeSingle();
        if (restaurantError) throw restaurantError;
        if (!restaurant?.active || String(restaurant.subscription_status || "").toLowerCase() !== "active") {
          result.push({ hostname, skipped: "business_inactive" });
          continue;
        }

        let isPro = String(restaurant.subscription_plan || "").trim().toLowerCase() === "pro";
        if (!isPro && restaurant.subscription_plan_id) {
          const { data: plan } = await admin
            .from("subscription_plans")
            .select("name")
            .eq("id", restaurant.subscription_plan_id)
            .maybeSingle();
          isPro = String(plan?.name || "").trim().toLowerCase() === "pro";
        }
        if (!isPro) {
          result.push({ hostname, skipped: "not_pro" });
          continue;
        }

        let status = String(row.status || "");
        let providerId = String(row.provider_hostname_id || "");
        let cfResult: any = null;

        if (status === "pending_dns" || status === "failed") {
          const txtName = "_yummypro." + hostname;
          const txtValue = "yummypro-verification=" + String(row.verification_token || "");
          const [txtAnswers, cnameAnswers] = await Promise.all([
            dnsAnswers(txtName, "TXT").catch(() => []),
            dnsAnswers(hostname, "CNAME").catch(() => []),
          ]);

          const txtVerified = txtAnswers.some((v: string) => v.replace(/^"|"$/g, "").includes(txtValue));
          const cnameVerified = cnameAnswers.some((v: string) =>
            v.replace(/\.$/, "").toLowerCase() === STAGING_CNAME_TARGET
          );
          const verified = txtVerified && cnameVerified;

          await admin.from("business_custom_domains").update({
            status: verified ? "dns_verified" : "pending_dns",
            verified_at: verified ? new Date().toISOString() : null,
            last_checked_at: new Date().toISOString(),
            last_error: verified ? null : [
              txtVerified ? null : "TXT pendiente",
              cnameVerified ? null : "CNAME pendiente",
            ].filter(Boolean).join(" · "),
          }).eq("id", row.id);

          if (!verified) {
            result.push({ hostname, status: "pending_dns" });
            continue;
          }
          status = "dns_verified";
        }

        if (status === "dns_verified" || status === "provisioning") {
          if (!providerId) {
            cfResult = await findCustomHostname(cfZone, hostname, cfToken);
            if (!cfResult) {
              const created = await cfFetch(
                "/zones/" + encodeURIComponent(cfZone) + "/custom_hostnames",
                {
                  method: "POST",
                  body: JSON.stringify({
                    hostname,
                    ssl: { method: "http", type: "dv" },
                  }),
                },
                cfToken,
              );
              cfResult = created?.result;
            }
            providerId = String(cfResult?.id || "");
            if (!providerId) throw new Error("Cloudflare no devolvió id del Custom Hostname");

            await admin.from("business_custom_domains").update({
              status: "provisioning",
              ssl_status: String(cfResult?.ssl?.status || "") === "active" ? "active" : "initializing",
              provider_hostname_id: providerId,
              last_checked_at: new Date().toISOString(),
              last_error: null,
            }).eq("id", row.id);
          } else {
            const checked = await cfFetch(
              "/zones/" + encodeURIComponent(cfZone) + "/custom_hostnames/" + encodeURIComponent(providerId),
              { method: "GET" },
              cfToken,
            );
            cfResult = checked?.result;
          }

          await ensureStagingWorkerRoute(cfZone, hostname, cfToken);

          if (!cfResult) {
            const checked = await cfFetch(
              "/zones/" + encodeURIComponent(cfZone) + "/custom_hostnames/" + encodeURIComponent(providerId),
              { method: "GET" },
              cfToken,
            );
            cfResult = checked?.result;
          }

          const hostnameStatus = String(cfResult?.status || "pending");
          const sslStatus = String(cfResult?.ssl?.status || "pending");
          const ready = hostnameStatus === "active" && sslStatus === "active";

          if (ready) {
            const { error: activateError } = await admin.rpc("service_activate_business_custom_domain", {
              p_restaurant_id: Number(row.restaurant_id),
              p_hostname: hostname,
              p_provider_hostname_id: providerId,
            });
            if (activateError) throw activateError;
            result.push({ hostname, status: "active" });
          } else {
            await admin.from("business_custom_domains").update({
              status: "provisioning",
              ssl_status: sslStatus === "active" ? "active" : "initializing",
              last_checked_at: new Date().toISOString(),
              last_error: null,
            }).eq("id", row.id);
            result.push({ hostname, status: "provisioning", hostname_status: hostnameStatus, ssl_status: sslStatus });
          }
        }
      } catch (error) {
        const message = String((error as Error)?.message || error);
        await admin.from("business_custom_domains").update({
          last_checked_at: new Date().toISOString(),
          last_error: message.slice(0, 1000),
        }).eq("id", row.id);
        result.push({ hostname, error: message });
      }
    }

    return json({ ok: true, processed: result.length, result });
  } catch (error) {
    console.error("reconcile-business-domains", error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});