import {readFileSync} from 'node:fs';
for(const file of ['index.html','panel/index.html']){const html=readFileSync(file,'utf8');if(!/<!doctype html>/i.test(html)||!/<\/html>/i.test(html))throw new Error(`${file}: HTML incompleto`);if(file.includes('panel/')&&!html.includes('data-theme'))throw new Error(`${file}: falta soporte de tema`)}
const panel=readFileSync('panel/index.html','utf8');
for(const marker of ['data-tab="inventory"','restaurant_inventory_items','restaurant_inventory_movements','saveInventoryMovement'])if(!panel.includes(marker))throw new Error(`panel/index.html: falta ${marker}`);
console.log('Landing y panel restaurante validados');
