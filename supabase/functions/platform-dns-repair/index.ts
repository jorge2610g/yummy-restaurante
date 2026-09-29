import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

function json(body: unknown, status=200){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
}
async function cf(path:string, init:RequestInit, token:string){
  const r=await fetch("https://api.cloudflare.com/client/v4"+path,{
    ...init,
    headers:{Authorization:"Bearer "+token,"content-type":"application/json",...(init.headers||{})},
  });
  const p=await r.json().catch(()=>({}));
  if(!r.ok||p?.success===false) throw new Error(p?.errors?.[0]?.message||("Cloudflare HTTP "+r.status));
  return p;
}
Deno.serve(async(req)=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceKey) return json({error:"environment_not_ready"},503);

  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:expected,error:secretError}=await admin.rpc("service_get_runtime_secret",{p_name:"custom_domain_reconcile_token"});
  if(secretError) return json({error:"secret_lookup_failed"},500);
  const provided=req.headers.get("x-repair-secret")||"";
  if(!provided||provided!==String(expected||"")) return json({error:"unauthorized"},401);

  const {data:vaultCf,error:vaultCfError}=await admin.rpc("service_get_runtime_secret",{p_name:"cloudflare_api_token"});
  if(vaultCfError) console.error("Vault Cloudflare lookup failed",vaultCfError);
  const cfToken=String(vaultCf||"").trim()||String(Deno.env.get("CLOUDFLARE_API_TOKEN")||"").trim();
  if(!cfToken) return json({error:"cloudflare_not_configured"},503);

  try{
    const body=await req.json().catch(()=>({}));
    const zones=await cf("/zones?name=yummypro.online&status=active&per_page=1",{method:"GET"},cfToken);
    const zoneId=String(zones?.result?.[0]?.id||"");
    if(!zoneId) throw new Error("zone_not_found");

    const names=["web.yummypro.online","admin.yummypro.online","menu.yummypro.online","streaming.yummypro.online","retail.yummypro.online","pro.yummypro.online"];
    const listed=await cf("/zones/"+zoneId+"/dns_records?per_page=100",{method:"GET"},cfToken);
    const current=(listed?.result||[]).filter((r:any)=>names.includes(String(r?.name||"").toLowerCase()))
      .map((r:any)=>({id:r.id,type:r.type,name:r.name,content:r.content,proxied:r.proxied,ttl:r.ttl}));

    if(body?.action!=="ensure") return json({ok:true,current});

    const template=(listed?.result||[]).find((r:any)=>String(r?.name||"").toLowerCase()==="admin.yummypro.online")
      ||(listed?.result||[]).find((r:any)=>String(r?.name||"").toLowerCase()==="streaming.yummypro.online");
    if(!template) throw new Error("template_record_not_found");

    const desired=["retail.yummypro.online","pro.yummypro.online"];
    const changes:any[]=[];
    for(const name of desired){
      const existing=(listed?.result||[]).find((r:any)=>String(r?.name||"").toLowerCase()===name);
      const payload={
        type:String(template.type||"CNAME"),
        name,
        content:String(template.content||"jorge2610g.github.io"),
        ttl:Number(template.ttl||1),
        proxied:Boolean(template.proxied),
      };
      if(existing){
        const same=String(existing.type)===payload.type&&String(existing.content)===payload.content&&Boolean(existing.proxied)===payload.proxied;
        if(!same){
          await cf("/zones/"+zoneId+"/dns_records/"+existing.id,{method:"PUT",body:JSON.stringify(payload)},cfToken);
          changes.push({name,action:"updated",type:payload.type,content:payload.content,proxied:payload.proxied});
        }else changes.push({name,action:"unchanged",type:payload.type,content:payload.content,proxied:payload.proxied});
      }else{
        await cf("/zones/"+zoneId+"/dns_records",{method:"POST",body:JSON.stringify(payload)},cfToken);
        changes.push({name,action:"created",type:payload.type,content:payload.content,proxied:payload.proxied});
      }
    }
    return json({ok:true,changes});
  }catch(e){
    return json({error:String((e as Error)?.message||e)},500);
  }
});