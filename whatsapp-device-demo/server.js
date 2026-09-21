import express from "express";
import QRCode from "qrcode";
import pino from "pino";
import fs from "node:fs/promises";
import path from "node:path";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";
const MENU_BASE_URL = process.env.MENU_BASE_URL || ALLOWED_ORIGIN;
const DATA_DIR = path.resolve(".data");
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

const clients = new Map();
const rate = new Map();

function safeRestaurantId(value) {
  const id = String(value || "");
  if (!/^\d+$/.test(id)) throw Object.assign(new Error("restaurant_id inválido"), { status: 400 });
  return id;
}
function sessionDir(id) { return path.join(DATA_DIR, id); }

app.use((req,res,next)=>{
  if (ALLOWED_ORIGIN) {
    const origin=req.headers.origin;
    if (origin && origin !== ALLOWED_ORIGIN) return res.status(403).json({error:"Origen no permitido"});
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary","Origin");
    res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
  }
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
});

async function supabase(pathname, token) {
  const r = await fetch(SUPABASE_URL + pathname, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token }
  });
  if (!r.ok) throw Object.assign(new Error("Supabase rechazó la solicitud"), {status:r.status===401?401:403});
  return r.json();
}

async function auth(req,res,next) {
  try {
    if(!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({error:"Servicio no configurado"});
    const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    if(!token) return res.status(401).json({error:"Sesión requerida"});
    const user=await supabase("/auth/v1/user",token);
    const restaurantId=safeRestaurantId(req.params.restaurantId || req.body?.restaurant_id);
    const q = "/rest/v1/restaurant_staff?select=role&restaurant_id=eq."+encodeURIComponent(restaurantId)+"&user_id=eq."+encodeURIComponent(user.id)+"&limit=1";
    const rows=await supabase(q,token);
    const role=String(rows?.[0]?.role||"").toLowerCase();
    if(!["restaurant","manager","admin","administrador","encargado"].includes(role)) return res.status(403).json({error:"Sin permiso"});
    req.ctx={token,user,restaurantId,role}; next();
  } catch(e){ res.status(e.status||500).json({error:e.status?e.message:"Error de autorización"}); }
}

async function menuUrl(token, restaurantId) {
  try {
    const rows=await supabase("/rest/v1/restaurants?select=slug&id=eq."+restaurantId+"&limit=1",token);
    const slug=rows?.[0]?.slug;
    return slug ? MENU_BASE_URL.replace(/\/$/,"") + "/?r=" + encodeURIComponent(slug) : MENU_BASE_URL;
  } catch { return MENU_BASE_URL; }
}

async function startClient(id, token) {
  let entry=clients.get(id);
  if(entry?.sock) return entry;
  await fs.mkdir(sessionDir(id),{recursive:true});
  const {state,saveCreds}=await useMultiFileAuthState(sessionDir(id));
  const {version}=await fetchLatestBaileysVersion();
  entry={sock:null,qr:null,status:"connecting",number:null,token};
  const sock=makeWASocket({auth:state,version,logger,printQRInTerminal:false,syncFullHistory:false,markOnlineOnConnect:false});
  entry.sock=sock; clients.set(id,entry);
  sock.ev.on("creds.update",saveCreds);
  sock.ev.on("connection.update", async ({connection,lastDisconnect,qr})=>{
    if(qr){ entry.qr=await QRCode.toDataURL(qr,{margin:1,width:320}); entry.status="qr"; }
    if(connection==="open"){ entry.qr=null; entry.status="connected"; entry.number=sock.user?.id?.split(":")[0]?.split("@")[0]||null; }
    if(connection==="close"){
      const code=lastDisconnect?.error?.output?.statusCode;
      entry.sock=null; entry.status="disconnected";
      if(code!==DisconnectReason.loggedOut) setTimeout(()=>startClient(id,entry.token).catch(()=>{}),2500);
    }
  });
  sock.ev.on("messages.upsert", async ({messages,type})=>{
    if(type!=="notify") return;
    for(const m of messages||[]){
      if(m.key.fromMe || !m.key.remoteJid || m.key.remoteJid.endsWith("@g.us")) continue;
      const text=(m.message?.conversation || m.message?.extendedTextMessage?.text || "").trim().toLowerCase();
      if(!["menu","menú"].includes(text)) continue;
      const now=Date.now(), k=id+":"+m.key.remoteJid;
      if(now-(rate.get(k)||0)<60000) continue;
      rate.set(k,now);
      const url=await menuUrl(entry.token,id);
      await sock.sendMessage(m.key.remoteJid,{text:"¡Hola! 👋 Puedes ver nuestro menú y realizar tu pedido aquí: "+url});
    }
  });
  return entry;
}

app.get("/health",(req,res)=>res.json({ok:true,service:"yummypro-whatsapp-device-demo"}));
app.post("/api/restaurants/:restaurantId/connect",auth,async(req,res)=>{
  try{const e=await startClient(req.ctx.restaurantId,req.ctx.token);res.json({status:e.status,qr:e.qr,number:e.number});}
  catch{res.status(500).json({error:"No se pudo iniciar WhatsApp"});}
});
app.get("/api/restaurants/:restaurantId/status",auth,async(req,res)=>{
  const e=clients.get(req.ctx.restaurantId);
  res.json({status:e?.status||"disconnected",qr:e?.qr||null,number:e?.number||null});
});
app.post("/api/restaurants/:restaurantId/send",auth,async(req,res)=>{
  try{
    const e=clients.get(req.ctx.restaurantId);
    if(!e?.sock || e.status!=="connected") return res.status(409).json({error:"WhatsApp no está conectado"});
    const phone=String(req.body?.phone||"").replace(/\D/g,""), message=String(req.body?.message||"").trim();
    if(phone.length<8 || message.length<1 || message.length>1000) return res.status(400).json({error:"Datos inválidos"});
    await e.sock.sendMessage(phone+"@s.whatsapp.net",{text:message});
    res.json({ok:true});
  }catch{res.status(500).json({error:"No se pudo enviar"});}
});
app.delete("/api/restaurants/:restaurantId/session",auth,async(req,res)=>{
  try{
    const id=req.ctx.restaurantId,e=clients.get(id);
    try{await e?.sock?.logout();}catch{}
    clients.delete(id); await fs.rm(sessionDir(id),{recursive:true,force:true});
    res.json({ok:true,status:"disconnected"});
  }catch{res.status(500).json({error:"No se pudo desvincular"});}
});

await fs.mkdir(DATA_DIR,{recursive:true});
app.listen(PORT,()=>logger.info({port:PORT},"WhatsApp device demo ready"));
