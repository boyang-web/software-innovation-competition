import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
await mkdir('test-results',{recursive:true});
const click=async action=>{await page.locator(`[data-action="${action}"]`).filter({visible:true}).first().click();};
const panelClick=async action=>{await page.locator(`#panel [data-action="${action}"]`).click();};
const snapshot=async name=>{await page.locator('#panel').evaluate(el=>el.scrollTop=0);await page.waitForTimeout(500);await page.screenshot({path:`test-results/v2-${name}.png`});};
const review=async()=>{await panelClick('review-structure-0');await panelClick('review-culture-1');await panelClick('review-transfer-1');};
const row=async(index,shed,color)=>{if(color)await panelClick('yarn-weft-'+color);await panelClick('shed-'+shed);await panelClick(index%2?'throw-left':'throw-right');await panelClick('op-beat');};
const start=async id=>{await page.locator('nav [data-action=village]').click();await panelClick('brief-'+id);await panelClick('begin');};
const dress=async()=>{for(let i=0;i<3;i++)await panelClick('op-warp');await panelClick('op-dress');};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>window.__zhiyouDiagnostics?.().webgl);
 await snapshot('village');
 await page.locator('nav [data-action=archive]').click();await panelClick('read-culture');await panelClick('read-warp');
 await start('first');await dress();
 // Wrong repeated shed must fail inspection rather than granting progress.
 for(let i=0;i<6;i++)await row(i,i===5?0:i%2);
 await panelClick('op-submit');assert.match(await page.locator('#toast').innerText(),/验收发现/);
 await panelClick('inspect');assert.match(await page.locator('.diagnosis').innerText(),/第 6 纬/);await click('close-inspector');
 await panelClick('op-undo');await row(5,1);await snapshot('loom');
 await panelClick('op-submit');await review();assert.equal((await page.evaluate(()=>window.__zhiyouDiagnostics())).completed,1);
 await panelClick('doll');await page.waitForTimeout(800);await panelClick('shape-capsule');await panelClick('layout-panel');await panelClick('tool-star');
 const rect=await page.locator('#scene canvas').boundingBox();
 for(const [u,v]of [[.5,.5],[.5,.6],[.45,.5]])await page.touchscreen.tap(rect.x+rect.width*u,rect.y+rect.height*v);
 const marks=await page.evaluate(()=>JSON.parse(localStorage.getItem('zhiyou-workshop-v2')).draft.marks.length);assert.ok(marks>0,'3D raycast must paint the doll surface');
 await panelClick('tool-rotate');await snapshot('doll');
 await page.getByLabel('作品名称',{exact:true}).fill('第一块会呼吸的布');await page.locator('#reflection').fill('我交替提综形成平纹，木偶装饰是自己的设计。');await panelClick('save-work');assert.equal(await page.locator('.saved-work').count(),1);
 await page.reload();await page.waitForFunction(()=>window.__zhiyouDiagnostics?.().webgl);assert.equal(await page.locator('.saved-work').count(),1);
 await start('repair');await panelClick('inspect');assert.match(await page.locator('.diagnosis').innerText(),/第 5 纬/);await click('close-inspector');await panelClick('op-undo');await panelClick('op-undo');await row(4,0);await row(5,1);await panelClick('op-submit');await review();
 await start('transfer');await dress();assert.equal(await page.locator('[data-action=hint-1]').count(),0);
 for(let i=0;i<8;i++)await row(i,(i+1)%2,Math.floor(i/2)%2?'cream':'rust');await panelClick('op-submit');await review();
 await start('twill');await dress();for(let i=0;i<8;i++)await row(i,i%4);await panelClick('op-submit');await review();
 await page.locator('nav [data-action=journal]').click();assert.equal((await page.evaluate(()=>window.__zhiyouDiagnostics())).completed,4);await snapshot('journal');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});for(const name of ['village','loom','doll','archive','journal']){await page.locator(`nav [data-action=${name}]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow ${width} ${name}`);assert.ok(await page.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`panel overflow ${width} ${name}`);}}
 const downloadPromise=page.waitForEvent('download');await page.locator('#panel [data-action^="export-"]').first().click();const download=await downloadPromise;await download.saveAs('test-results/exported-recipe.json');
 assert.deepEqual(errors,[]);console.log('PASS: 4 missions; rejection + repair; independent transfer; 4-shaft twill; 3D raycast painting; collection reload; JSON export; 320/390/768px; no JS errors.');
}finally{await browser.close();}
