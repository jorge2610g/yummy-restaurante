self.addEventListener("push",event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||"Tienes una actualización."}}
 event.waitUntil(self.registration.showNotification(data.title||"YummyPro",{body:data.body||"Tienes una actualización.",icon:"/icon-192.png",badge:"/icon-192.png",tag:data.tag||"yummypro-notification",renotify:true,data:{url:data.url||"/"}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||"/",self.location.origin).href;
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const client of list){if(client.url.startsWith(self.location.origin)){client.navigate(target);return client.focus()}}return clients.openWindow(target)}));
});