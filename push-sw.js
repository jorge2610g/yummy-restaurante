const YUMMYPRO_CACHE="yummypro-pwa-v2507-installfix";
const YUMMYPRO_OFFLINE_URL="/offline.html";
const YUMMYPRO_LANDING_OFFLINE="/restaurant-offline.html";
const YUMMYPRO_CORE=[YUMMYPRO_OFFLINE_URL,YUMMYPRO_LANDING_OFFLINE,"/manifest.webmanifest","/restaurant.webmanifest","/pwa-icon.svg","/icon-192.png","/icon-512.png","/apple-touch-icon.png"];

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(YUMMYPRO_CACHE).then(cache=>cache.addAll(YUMMYPRO_CORE)));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("yummypro-pwa-")&&key!==YUMMYPRO_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("message",event=>{
 if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(YUMMYPRO_CORE.includes(url.pathname)){
  event.respondWith(
   fetch(request,{cache:"no-store"}).then(async response=>{
    if(response?.ok){const cache=await caches.open(YUMMYPRO_CACHE);await cache.put(request,response.clone())}
    return response;
   }).catch(()=>caches.match(request).then(hit=>hit||caches.match(url.pathname)))
  );
  return;
 }
 if(request.mode==="navigate"){
  const fallback=url.pathname.startsWith("/panel")?YUMMYPRO_OFFLINE_URL:YUMMYPRO_LANDING_OFFLINE;
  event.respondWith(fetch(request).catch(()=>caches.match(fallback)));
 }
});
self.addEventListener("push",event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||"Tienes una actualización."}}
 event.waitUntil(self.registration.showNotification(data.title||"YummyPro",{body:data.body||"Tienes una actualización.",icon:"/icon-192.png",badge:"/icon-192.png",tag:data.tag||"yummypro-notification",renotify:true,data:{url:data.url||"/panel/"}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||"/panel/",self.location.origin).href;
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const client of list){if(client.url.startsWith(self.location.origin)){client.navigate(target);return client.focus()}}return clients.openWindow(target)}));
});
