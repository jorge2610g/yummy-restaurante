import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

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

async function ensureWorkerRoute(zoneId: string, hostname: string, workerName: string, token: string) {
  const listed = await cfFetch(
    "/zones/" + encodeURIComponent(zoneId) + "/workers/routes",
    { method: "GET" },
    token,
  );
  const routes = Array.isArray(listed?.result) ? listed.result : [];
  let changed = false;

  async function ensureRoute(pattern: string, script?: string) {
    const existing = routes.find((row: any) =>
      String(row?.pattern || "").toLowerCase() === pattern.toLowerCase()
    );

    if (existing) {
      const currentScript = String(existing?.script || "");
      const desiredScript = String(script || "");
      if (currentScript === desiredScript) return existing;

      const updated = await cfFetch(
        "/zones/" + encodeURIComponent(zoneId) + "/workers/routes/" + encodeURIComponent(String(existing.id)),
        {
          method: "PUT",
          body: JSON.stringify(script ? { pattern, script } : { pattern }),
        },
        token,
      );
      changed = true;
      return updated?.result || existing;
    }

    const created = await cfFetch(
      "/zones/" + encodeURIComponent(zoneId) + "/workers/routes",
      {
        method: "POST",
        body: JSON.stringify(script ? { pattern, script } : { pattern }),
      },
      token,
    );
    changed = true;
    return created?.result || null;
  }

  // Rutas más específicas sin Worker: Cloudflare debe servir los tokens DCV
  // directamente desde el edge para validar el certificado del Custom Hostname.
  await ensureRoute(hostname + "/.well-known/acme-challenge/*");
  await ensureRoute(hostname + "/.well-known/pki-validation/*");

  const appRoute = await ensureRoute(hostname + "/*", workerName);
  return { appRoute, changed };
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

    let cfToken = "";
    let cfZone = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
    const { data: runtimeTarget } = await admin.rpc("service_get_runtime_config", {
      p_key: "custom_domain_cname_target",
    });
    const cnameTarget = String(
      Deno.env.get("CLOUDFLARE_CUSTOM_DOMAIN_ORIGIN")
        || runtimeTarget
        || "domains.yummypro.online"
    ).replace(/\.$/, "").toLowerCase();
    const workerName = String(Deno.env.get("CLOUDFLARE_CUSTOM_DOMAIN_WORKER") || "").trim()
      || (cnameTarget === "domains-pruebas.yummypro.online"
        ? "yummypro-custom-domain-staging"
        : "yummypro-custom-domain-gateway");

    const { data: vaultToken, error: vaultError } = await admin.rpc("service_get_runtime_secret", {
      p_name: "cloudflare_api_token",
    });
    if (vaultError) console.error("No se pudo leer Cloudflare API token desde Vault", vaultError);
    cfToken = String(vaultToken || "").trim() || String(Deno.env.get("CLOUDFLARE_API_TOKEN") || "").trim();
    if (!cfToken || !cfZone) throw new Error("Cloudflare no está configurado para el reconciliador");

    const { data: rows, error: rowsError } = await admin
      .from("business_custom_domains")
      .select("id,restaurant_id,hostname,status,verification_token,ssl_status,provider_hostname_id,last_checked_at")
      .in("status", ["pending_dns", "dns_verified", "provisioning", "failed"])
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(20);
    if (rowsError) throw rowsError;

    let fallbackOrigin: any = null;
    try {
      const fallback = await cfFetch(
        "/zones/" + encodeURIComponent(cfZone) + "/custom_hostnames/fallback_origin",
        { method: "GET" },
        cfToken,
      );
      fallbackOrigin = fallback?.result || null;
    } catch (fallbackError) {
      fallbackOrigin = { error: String((fallbackError as Error)?.message || fallbackError) };
    }

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
            v.replace(/\.$/, "").toLowerCase() === cnameTarget
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

          const routeState = await ensureWorkerRoute(cfZone, hostname, workerName, cfToken);

          if (routeState?.changed && providerId) {
            // Reinicia DCV una sola vez cuando acabamos de corregir las rutas.
            const refreshed = await cfFetch(
              "/zones/" + encodeURIComponent(cfZone) + "/custom_hostnames/" + encodeURIComponent(providerId),
              {
                method: "PATCH",
                body: JSON.stringify({ ssl: { method: "http", type: "dv" } }),
              },
              cfToken,
            );
            cfResult = refreshed?.result || cfResult;
          }

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
            result.push({
              hostname,
              status: "provisioning",
              hostname_status: hostnameStatus,
              ssl_status: sslStatus,
              ssl_method: String(cfResult?.ssl?.method || ""),
              ssl_type: String(cfResult?.ssl?.type || ""),
              certificate_authority: String(cfResult?.ssl?.certificate_authority || ""),
              validation_records: Array.isArray(cfResult?.ssl?.validation_records) ? cfResult.ssl.validation_records : [],
              validation_errors: Array.isArray(cfResult?.ssl?.validation_errors) ? cfResult.ssl.validation_errors : [],
            });
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

    return json({ ok: true, cname_target: cnameTarget, worker: workerName, fallback_origin: fallbackOrigin, processed: result.length, result });
  } catch (error) {
    console.error("reconcile-business-domains", error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});