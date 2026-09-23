import {readFileSync} from 'node:fs';
for(const file of ['index.html','panel/index.html']){const html=readFileSync(file,'utf8');if(!/<!doctype html>/i.test(html)||!/<\/html>/i.test(html))throw new Error(`${file}: HTML incompleto`);if(file.includes('panel/')&&!html.includes('data-theme'))throw new Error(`${file}: falta soporte de tema`)}
const landing=readFileSync('index.html','utf8');
const panel=readFileSync('panel/index.html','utf8');
const professional=readFileSync('panel/professional.js','utf8');
for(const marker of ['billing-pending-actions-v2454','managePendingSubscriptionPayment','Continuar pago','Cancelar','billing-plans-polish-v2453','syncSubscriptionBannerForActiveTab','plan-current-badge','billingCurrentPlan','subscriptionPaymentHistory','refreshBillingCenter','loadSubscriptionHistory','data-tab="inventory"','restaurant_inventory_items','restaurant_inventory_movements','saveInventoryMovement','data-tab="kitchen"','restaurant_cash_sessions','openCashSession','cashHistoryList','data-tab="pos"','create_waiter_order','data-tab="staff"','create-restaurant-user','.eq("order_source","online").eq("payment_status","approved")','restaurant_payment_methods','payment_proofs','.eq("available",true)','Cargando productos','No se pudieron cargar los productos del POS','.side-menu .tab[hidden]','role-hidden','Tu usuario no tiene permiso','mobile-icon-actions-v223','aria-label="Abrir menú del panel"','subscription-banner-row','optionsModal','restaurant_product_option_groups','createProductOption'])if(!panel.includes(marker))throw new Error(`panel/index.html: falta ${marker}`);
if(panel.includes('data-tab="health"')||panel.includes('loadRestaurantHealth'))throw new Error('panel/index.html: el monitoreo debe estar eliminado');
if(panel.includes('.panel-layout,.panel-content,#orders'))throw new Error('panel/index.html: Pedidos no debe forzarse visible fuera de su pestaña');
for(const marker of ['data-tab="whatsapp-demo"','id="whatsapp-demo"','WHATSAPP_DEVICE_DEMO_ENABLED','startWhatsAppDeviceDemo','whatsappDemoRequest'])if(panel.includes(marker))throw new Error(`panel/index.html: residuo de WhatsApp demo detectado: ${marker}`);
if(!/Versión v2\.(?:4|5)\.\d+/.test(panel))throw new Error('panel/index.html: falta versión v2.4.x o v2.5.x visible');
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

for(const marker of ['create-flow-subscription-payment','subscription-flow-settings','paySubscriptionPlanFlow','Pagar con Flow','flowPaymentConfigured','showFlowReturnMessage'])if(!panel.includes(marker))throw new Error('panel/index.html: falta integración Flow '+marker);

for(const marker of ['sync-mercadopago-subscription','syncMercadoPagoSubscription','syncFlowSubscription','sync-flow-subscription'])if(!panel.includes(marker))throw new Error('panel/index.html: falta reconciliación de suscripciones '+marker);

for(const marker of ['manage-flow-pending-payment','create-flow-recurring-subscription','payFlowRecurringSubscription','sync-flow-subscription','manageFlowPendingPayment','planCheckoutModal','openPlanPurchaseModal','plan-provider-logo flow'])if(!panel.includes(marker))throw new Error('panel/index.html: falta Flow/modal de compra '+marker);

for(const marker of ['cancel-recurring-subscription','manageRecurringSubscription','Cancelar suscripción Flow','Pausar renovación Mercado Pago','Reactivar suscripción Mercado Pago','Renovación cancelada'])if(!panel.includes(marker))throw new Error('panel/index.html: falta gestión de suscripción '+marker);

for(const marker of ['Comprar ','Pago único','Suscripción automática','Pagar con Mercado Pago','Pagar con Flow','Reactivar con Mercado Pago','plan-provider-logo mp'])if(!panel.includes(marker))throw new Error('panel/index.html: falta checkout profesional '+marker);

for(const marker of ['sidebar-no-gaps-v2462','align-content:start','grid-auto-rows:max-content','syncSidebarGroupVisibility'])if(!panel.includes(marker))throw new Error('panel/index.html: falta compactación del menú lateral '+marker);

for(const marker of ['subscriptionBannerShouldShow','activeTab!=="plans"','banner.innerHTML=""','display","none","important"'])if(!panel.includes(marker))throw new Error('panel/index.html: falta prevención de flash del contador '+marker);

for(const marker of ['restaurant-admin-sidebar-scale-v2464','#sideMenu .nav-label{font-size:15px!important;font-weight:720!important','#sideMenu .nav-icon{width:44px!important;height:44px!important','#sideMenu .tab{width:100%!important;height:56px!important'])if(!panel.includes(marker))throw new Error('panel/index.html: falta escala del menú igual al admin '+marker);

for(const marker of ['restaurant-collapsed-admin-reference-v2465','scrollbar-width:none','::-webkit-scrollbar','width:62px!important','height:42px!important'])if(!panel.includes(marker))throw new Error('panel/index.html: falta estilo cerrado igual al admin '+marker);

for(const marker of ['role-and-cash-gates-v2466','operationalTabLockReason','Mesero / POS solo puede utilizarse con un usuario con rol Mesero','Cocina solo puede utilizarse con un usuario con rol Cocina','restaurant_has_open_cash','posCashGate','Caja cerrada: primero el usuario de Caja debe abrir una caja'])if(!panel.includes(marker))throw new Error('panel/index.html: falta restricción de rol/caja '+marker);

for(const marker of ['planCheckoutCycleAnnual','setPlanPurchaseCycle','planChargedMonths','annual_bonus_months','billing_cycle:billingCycle','Plan anual','12 meses de acceso'])if(!panel.includes(marker))throw new Error('panel/index.html: falta compra anual '+marker);

for(const marker of ['manifest.webmanifest','pwaInstallBtn','installYummyProPwa','beforeinstallprompt','pwa-install-v2501'])if(!panel.includes(marker))throw new Error('panel/index.html: falta PWA instalable '+marker);

for(const marker of ['pwaNetworkStatus','setupYummyProNetworkStatus','Sin conexión · los pedidos y pagos no se enviarán'])if(!panel.includes(marker))throw new Error('panel/index.html: falta estado de conexión PWA '+marker);

for(const marker of ['pwaUpdateBanner','Nueva versión disponible','applyYummyProUpdate','watchYummyProServiceWorker','Actualizar ahora'])if(!panel.includes(marker))throw new Error('panel/index.html: falta actualización PWA '+marker);

for(const marker of ['pwaNotificationBtn','activateYummyProNotifications','syncRestaurantPushIfGranted','refreshYummyProNotificationButton'])if(!panel.includes(marker))throw new Error('panel/index.html: falta integración de notificaciones PWA '+marker);

for(const marker of ['apple-touch-icon.png','icon-192.png','icon-512.png'])if(!panel.includes(marker)&&marker==='apple-touch-icon.png')throw new Error('panel/index.html: falta icono iOS '+marker);

for(const marker of ['restaurantPwaInstallBtn','install=pwa','v2.0.11'])if(!landing.includes(marker))throw new Error('index.html: falta entrada hacia PWA del panel '+marker);


if(landing.includes('rel="manifest" href="/restaurant.webmanifest'))throw new Error('index.html: la landing no debe competir como PWA independiente');
if(!panel.includes('/manifest.webmanifest?v=2508'))throw new Error('panel/index.html: falta manifest PWA panel v2508');
if(!panel.includes('params.get("install")==="pwa"'))throw new Error('panel/index.html: falta manejo de instalación desde landing');

for(const marker of ['professional.js?v=2532','data-tab="appointments"','data-tab="services"','data-tab="professionals"','professionalPaymentMode','professionalPaymentIntentList','Pagos por verificar','Pago obligatorio antes de reservar','professionalProviderServiceOptions','professionalTimeOffModal','professionalTimeOffList','professionalRescheduleModal','professionalRescheduleSlot'])if(!panel.includes(marker))throw new Error('panel/index.html: falta interfaz profesional '+marker);
if(panel.includes('<option value="none">Sin pago previo</option>'))throw new Error('panel/index.html: las reservas públicas profesionales deben exigir pago previo');
for(const marker of ['professional_services','professional_providers','professional_provider_services','professional_availability','professional_time_off','professional_appointments','professional_booking_payment_intents','get_professional_available_slots','create_professional_appointment','loadProfessionalAppointments','renderProfessionalPaymentIntents','approve_professional_booking_manual_payment','approveProfessionalPaymentIntent','saveProfessionalSchedule','openProfessionalTimeOffModal','saveProfessionalTimeOff','deleteProfessionalTimeOff','openProfessionalRescheduleModal','loadProfessionalRescheduleSlots','saveProfessionalReschedule','reschedule_professional_appointment','professionalPaymentLabel','professional_booking_payment_mode','approve_professional_appointment_manual_payment','approveProfessionalManualPayment','payment_amount_due','paid_amount','refreshProfessionalDashboard'])if(!professional.includes(marker))throw new Error('panel/professional.js: falta integración real '+marker);

for(const marker of ['restaurantIssueButton','restaurantIssueDialog','submitRestaurantIssueReport','trackRestaurantEvent','trackRestaurantError','submit_issue_report'])if(!panel.includes(marker))throw new Error('panel/index.html: falta observabilidad/reporte '+marker);

for(const marker of ['plan_interest_selected','trial_intended_plan_id','create_my_trial_restaurant_v3','Prueba 30 días gratis','landingHasRestaurant','syncLandingSession'])if(!landing.includes(marker))throw new Error('index.html: falta nuevo flujo de prueba '+marker);
if(landing.includes('<div class="trial"><span class="tag">PRUEBA GRATIS</span>'))throw new Error('index.html: todavía existe tarjeta separada de prueba gratis');

for(const marker of ['data-tab="retail_pos"','data-tab="retail_products"','data-tab="retail_suppliers"','data-tab="retail_purchases"','retail_save_product','retail_complete_sale','retail_receive_purchase','retail_adjust_stock','isRetailBusiness','business_type','create_my_trial_restaurant_v3'])if(!panel.includes(marker)&&!landing.includes(marker))throw new Error('falta infraestructura retail '+marker);

for(const marker of ['retailBarcodeCameraModal','openRetailBarcodeCamera','BarcodeDetector','retailAutoPrint','printRetailSale','retailSaleModal','processRetailPartialReturn','retail_void_sale','retail_return_sale_items','refunded_amount','refund_status'])if(!panel.includes(marker))throw new Error('panel/index.html: falta fase 2 retail '+marker);

for(const marker of ['data-tab="retail_orders"','id="retail_orders"','loadRetailOnlineOrders','retail_online_orders','retail_update_online_order_status','refund-retail-payment','Pedidos Online'])if(!panel.includes(marker))throw new Error('panel/index.html: falta gestión de tienda online retail '+marker);

for(const marker of ['eq("business_type",businessType)','retail_orders:"retail_orders"','retail_pos:"retail_pos"','retail_products:"retail_products"','retail_suppliers:"retail_suppliers"','retail_purchases:"retail_purchases"'])if(!panel.includes(marker))throw new Error('panel/index.html: falta filtrado de planes retail '+marker);
