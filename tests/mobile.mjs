import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await mkdir('test-results',{recursive:true});
const click=async action=>{await page.locator(`[data-action="${action}"]`).filter({visible:true}).first().click();};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('zhiyou-workshop-v2')));
async function point(id){
 let last=null;
 for(let attempt=0;attempt<50;attempt++){
  const target=await page.evaluate(id=>window.__zhiyouSceneTargets().find(t=>t.id===id),id);
  if(target?.visible&&(!last||Math.hypot(target.x-last.x,target.y-last.y)<.8)){if(last)return target;}
  last=target;await page.waitForTimeout(80);
 }
 throw Error('Physical object not reachable: '+id+' '+JSON.stringify(await page.evaluate(()=>window.__zhiyouSceneTargets())));
}
async function touch(id){const p=await point(id);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(60);}
async function drag(id,dx,dy){const p=await point(id);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:7});await page.mouse.up();await page.waitForTimeout(60);}
async function home(){await click('village');}
async function start(id){await home();await touch('station-board');await touch('commission-'+id);await click('begin');}
async function dress(){for(let i=0;i<3;i++)await drag('warp-thread',0,-80);assert.equal((await saved()).run.warpCount,12);await touch('dress');}
async function row(index,shed,color){if(color)await touch('yarn-'+color);await touch('shed-'+shed);await drag('shuttle',index%2?-85:85,0);await drag('beater',0,75);}
async function review(){for(const a of ['review-structure-0','review-culture-1','review-transfer-1'])await click(a);}
async function shot(name){await page.waitForTimeout(400);await page.screenshot({path:`test-results/v3-${name}.png`});}
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>window.__zhiyouSceneTargets&&window.__zhiyouDiagnostics?.().webgl);
 assert.equal(await page.locator('nav').count(),0,'main scene should not have a tab menu');
 assert.ok(await page.getByRole('button').filter({visible:true}).count()<=5,'only minimal camera and pocket controls remain');
 await shot('village');
 await touch('station-archive');await touch('book-culture');await click('read-culture');await touch('book-warp');await click('read-warp');
 await start('first');await touch('yarn-indigo');
 // A tap is not a drag, and dragging empty space must not operate the loom.
 await touch('warp-thread');assert.equal((await saved()).run.warpCount,0);
 await dress();
 const before=(await saved()).run.rows.length;
 const stage=await page.locator('#scene canvas').boundingBox();await page.mouse.move(stage.x+25,stage.y+50);await page.mouse.down();await page.mouse.move(stage.x+95,stage.y+50,{steps:6});await page.mouse.up();assert.equal((await saved()).run.rows.length,before);
 await click('camera-reset');
 // Wrong direction must be rejected, not counted as a throw.
 await touch('shed-0');await drag('shuttle',-75,0);assert.equal((await saved()).run.pending,null);await drag('shuttle',85,0);await drag('beater',0,75);
 for(let i=1;i<6;i++)await row(i,i===5?0:i%2);
 await touch('submit');assert.match(await page.locator('#toast').innerText(),/验收发现/);
 await touch('inspect');assert.match(await page.locator('.diagnosis').innerText(),/第 6 纬/);await click('close-inspector');await touch('undo');await row(5,1);await shot('loom');
 await touch('submit');await review();await click('close-workbook');
 await home();await touch('station-doll');await touch('shape-capsule');await touch('layout-panel');await touch('ink-rust');await touch('tool-star');
 // Paint the actual projected doll, not the workbench controls.
 await page.waitForTimeout(500);const canvas=await page.locator('#scene canvas').boundingBox();for(const [u,v]of [[.5,.5],[.5,.44],[.48,.48]])await page.touchscreen.tap(canvas.x+canvas.width*u,canvas.y+canvas.height*v);
 assert.ok((await saved()).draft.marks.length>0,'must paint through a 3D surface hit');await shot('doll');
 await touch('save');await page.getByLabel('作品名称',{exact:true}).fill('在场景里织成的布');await click('save-work');assert.equal(await page.locator('.saved-work').count(),1);
 await page.reload();await page.waitForFunction(()=>window.__zhiyouSceneTargets);assert.equal(await page.locator('.saved-work').count(),1);await click('close-workbook');
 await start('repair');await touch('inspect');assert.match(await page.locator('.diagnosis').innerText(),/第 5 纬/);await click('close-inspector');await touch('undo');await touch('undo');await row(4,0);await row(5,1);await touch('submit');await review();await click('close-workbook');
 await start('transfer');await dress();assert.equal(await page.locator('[data-action=hint-1]').filter({visible:true}).count(),0);for(let i=0;i<8;i++)await row(i,(i+1)%2,Math.floor(i/2)%2?'cream':'rust');await touch('submit');await review();await click('close-workbook');
 await start('twill');await dress();for(let i=0;i<8;i++)await row(i,i%4);await touch('submit');await review();assert.equal((await page.evaluate(()=>window.__zhiyouDiagnostics())).completed,4);await click('close-workbook');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});await home();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);await touch('station-loom');await point('inspect');}
 await click('journal');const downloadPromise=page.waitForEvent('download');await page.locator('[data-action^="export-"]').filter({visible:true}).first().click();await (await downloadPromise).saveAs('test-results/exported-recipe.json');
 assert.deepEqual(errors,[]);console.log('PASS: all 4 missions via physical objects; drag-only winding/shuttle/beater; wrong-direction rejection; fault repair; in-scene material/tool selection and painting; reload/export; no main tab menu; responsive.');
}finally{await browser.close();}
