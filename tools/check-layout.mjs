import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('tmp/layout-review', {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1200,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',r=>r.abort());
await page.route('**/src/main.js*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:(await res.text()).replace('window.bt = {','window.__reviewBag = bagGeo; window.bt = {')});});
await page.goto('http://127.0.0.1:5194/?debug=23&nointro&q=1');await page.waitForFunction(()=>window.bt);
const result=await page.evaluate(async()=>{
 const {World}=await import('/src/world.js');
 const g=bt.game(), zones=[];
 for(const o of [...g.ovens,...g.machines]) {zones.push(o.pickup);if(o.drop)zones.push(o.drop);}
 for(const o of g.counters)zones.push(o.drop,o.pile.zone);
 for(const o of [...g.tables,...g.trashes])zones.push(o.zone);
 const step=.22,x0=-10,z0=-9,nx=142,nz=140,free=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz);
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const p=new bt.THREE.Vector3(x0+i*step,0,z0+j*step),q=p.clone();World.resolve(q,.32);free[j*nx+i]=p.distanceTo(q)<1e-6;}
 const idx=p=>Math.round((p.z-z0)/step)*nx+Math.round((p.x-x0)/step);
 const q=[idx(bt.player.pos)];seen[q[0]]=1;
 for(let n=0;n<q.length;n++){const id=q[n];for(const next of [id-1,id+1,id-nx,id+nx]) if(next>=0&&next<free.length&&free[next]&&!seen[next]){seen[next]=1;q.push(next);}}
 const inaccessible=zones.filter(z=>!seen[idx(z.center)]).map(z=>[z.cx,z.cz]);
 const shifted=zones.map(z=>{const q=z.center;World.resolve(q,.32);return q.distanceTo(z.center)}).filter(d=>d>.001);
 return {zoneCount:zones.length,inaccessible,shifted,reachableCells:q.length};
});
console.log('ACCESS',JSON.stringify(result));assert.equal(result.inaccessible.length,0);assert.equal(result.shifted.length,0);

await page.evaluate(async()=>{const {World}=await import('/src/world.js');const g=bt.game();window.routeTargets=[g.machines[0].pickup.center,g.ovens[0].drop.center,g.counters[0].drop.center,g.machines[2].pickup.center,g.tables[0].zone.center,g.counters[1].drop.center];window.arrived=[];bt.autopilot=p=>{const goal=routeTargets[0];if(!goal){p.desired.set(0,0,0);return;}if(p.pos.distanceTo(goal)<.25){arrived.push(routeTargets.shift());return;}const target=World.nav(p.pos,goal);p.desired.copy(target).sub(p.pos).normalize();};});
if (!process.env.SKIP_WALK) await page.waitForFunction(()=>routeTargets.length===0,{},{timeout:60000});console.log('WALK',await page.evaluate(()=>arrived.length));
await page.evaluate(async()=>{
 bt.autopilot=null;bt.player.desired.set(0,0,0);bt.freeCam=true;
 const bag=__reviewBag.clone();bag.position.set(0,.15,3);bag.rotation.y=Math.PI;bag.scale.setScalar(2.2);bt.worldRoot.add(bag);
 const {newProduct}=await import('/src/products.js');const pastry=newProduct('painchoc');pastry.position.set(2.5,.15,3);pastry.scale.setScalar(5);bt.worldRoot.add(pastry);
 bt.camera.position.set(1,6,3);bt.camera.lookAt(1,.5,-3);
});await page.waitForTimeout(600);await page.screenshot({path:'tmp/layout-review/models.png'});
await page.evaluate(()=>bt.hud.offer({icon:'bag',title:'Sac bonus',desc:'Regarde une courte vidéo',amount:640,buttons:[{label:'Gratuit',ad:true,onClick:()=>{}},{label:'Non merci',alt:true,onClick:()=>{}}]}));
const button=await page.locator('.modal .pbtn').first().evaluate(el=>({class:el.className,background:getComputedStyle(el).backgroundImage}));assert.ok(button.class.includes('blue'));console.log('BUTTON',button);
await page.screenshot({path:'tmp/layout-review/popup.png'});
for (const stage of [0, 1, 3, 5, 6, 9, 10, 11, 14, 17, 22]) {
 await page.goto('http://127.0.0.1:5194/?debug='+stage+'&nointro&q=1');await page.waitForFunction(()=>window.bt);
 const padClear=await page.evaluate(async()=>{const {World}=await import('/src/world.js');const p=bt.game().pad.root.position.clone(),q=p.clone();World.resolve(q,.32);return p.distanceTo(q)<.001;});
 assert.ok(padClear, 'Blocked purchase pad at stage '+stage);
 if(stage===0) {await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);await page.screenshot({path:'tmp/layout-review/start-mobile.png'});await page.setViewportSize({width:1200,height:900});}
}
console.log('PADS: 11 progression stages clear');
assert.deepEqual(errors,[]);console.log('PASS: no runtime errors');await browser.close();
