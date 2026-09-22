import {readFileSync} from 'node:fs';
for(const file of ['index.html','panel/index.html']){const html=readFileSync(file,'utf8');if(!/<!doctype html>/i.test(html)||!/<\/html>/i.test(html))throw new Error(`${file}: HTML incompleto`);if(file.includes('panel/')&&!html.includes('data-theme'))throw new Error(`${file}: falta soporte de tema`)}
const panel=readFileSync('panel/index.html','utf8');
for(const marker of ['billing-pending-actions-v2454','managePendingSubscriptionPayment','Continuar pago','Cancelar','billing-plans-polish-v2453','syncSubscriptionBannerForActiveTab','plan-current-badge','billingCurrentPlan','subscriptionPaymentHistory','refreshBillingCenter','loadSubscriptionHistory','data-tab="inventory"','restaurant_inventory_items','restaurant_inventory_movements','saveInventoryMovement','data-tab="kitchen"','restaurant_cash_sessions','openCashSession','cashHistoryList','data-tab="pos"','create_waiter_order','data-tab="staff"','create-restaurant-user','.eq("order_source","online").eq("payment_status","approved")','restaurant_payment_methods','payment_proofs','.eq("available",true)','Cargando productos','No se pudieron cargar los productos del POS','.side-menu .tab[hidden]','role-hidden','Tu usuario no tiene permiso','mobile-icon-actions-v223','aria-label="Abrir menú del panel"','subscription-banner-row','optionsModal','restaurant_product_option_groups','createProductOption'])if(!panel.includes(marker))throw new Error(`panel/index.html: falta ${marker}`);
if(panel.includes('data-tab="health"')||panel.includes('loadRestaurantHealth'))throw new Error('panel/index.html: el monitoreo debe estar eliminado');
if(panel.includes('.panel-layout,.panel-content,#orders'))throw new Error('panel/index.html: Pedidos no debe forzarse visible fuera de su pestaña');
for(const marker of ['data-tab="whatsapp-demo"','id="whatsapp-demo"','WHATSAPP_DEVICE_DEMO_ENABLED','startWhatsAppDeviceDemo','whatsappDemoRequest'])if(panel.includes(marker))throw new Error(`panel/index.html: residuo de WhatsApp demo detectado: ${marker}`);
if(!/Versión v2\.4\.\d+/.test(panel))throw new Error('panel/index.html: falta versión v2.4.x visible');
if(!panel.includes('Enviar pedido a cocina'))throw new Error('panel/index.html: falta envío POS sin impresión del mesero');
for(const marker of ['id="posCartPanel"','id="posCartFab"','id="posCartBackdrop"','openPosCart','closePosCart'])if(!panel.includes(marker))throw new Error(`panel/index.html: falta carrito móvil POS: ${marker}`);
if(panel.includes('Enviar a cocina e imprimir'))throw new Error('panel/index.html: el POS no debe imprimir en el dispositivo del mesero');
if(!panel.includes('data-cash-date="today"')||!panel.includes('data-inventory-date="today"')||!panel.includes('data-pos-date="today"'))throw new Error('panel/index.html: faltan filtros por periodo en POS, caja o inventario');
if(!panel.includes('deleteInventoryItem'))throw new Error('panel/index.html: falta eliminación controlada de insumos');
console.log('Landing y panel restaurante validados');

// Subscription module access regression checks
for (const needle of ["subscriptionModuleAccess","loadSubscriptionModuleAccess","effectiveTabs","subscription_plans"]) {
  if (!panel.includes(needle)) throw new Error(`Missing subscription module access marker: ${needle}`);
}

for(const marker of ['currencyDigits','minimumFractionDigits:shown','maximumFractionDigits:shown'])if(!panel.includes(marker))throw new Error('panel/index.html: falta formato monetario adaptable '+marker);
