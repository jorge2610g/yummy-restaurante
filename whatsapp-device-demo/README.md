# WhatsApp por dispositivo · demo aislada

Prueba técnica opcional para vincular un número escaneando un QR como dispositivo de WhatsApp Web. No reemplaza la integración oficial de Meta Cloud API y no debe utilizarse con números comerciales importantes.

## Seguridad y alcance

- Solo acepta sesiones válidas de Supabase.
- Comprueba que el usuario pertenece al restaurante en `restaurant_staff`.
- Guarda la sesión de WhatsApp fuera de Git en `.data/`.
- No lee historiales ni almacena contenidos de conversaciones.
- La respuesta automática solo reconoce `menu` o `menú` y aplica un límite por destinatario.
- La demo se puede desactivar quitando su URL del panel.

## Variables de entorno

Copia `.env.example` a `.env` y configura los valores.

## Inicio

1. `npm install`
2. `npm start`
3. Expón el servicio únicamente por HTTPS.
4. Configura `ALLOWED_ORIGIN` con el dominio exacto del panel.

Este servicio necesita un servidor Node persistente. GitHub Pages o un hosting únicamente estático no pueden ejecutarlo; para una demostración remota utiliza un contenedor persistente en Render, Railway o un VPS.
