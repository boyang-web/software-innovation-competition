import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PegDoll} from '../vendor/doll.js';
import {PaintSurface} from '../vendor/paint.js';
import {drawFabric} from './fabric.js';
import {warpColor,yarnOf,THREADS} from '../domain/loom.js';
import {missionOf,YARNS} from '../content/course.js';
import {resolveGesture} from './gestures.js';

const POSITIONS={village:{eye:[13,13,17],target:[0,.8,.2]},board:{eye:[2.7,3.2,7.4],target:[-.5,1.5,2.8]},loom:{eye:[2.2,5.3,7.6],target:[-.5,1.2,.35]},doll:{eye:[4.4,3.3,4.3],target:[2.45,1.55,.1]},archive:{eye:[-4.3,2.8,4.8],target:[-2.8,1.3,-.9]},top:{eye:[-.7,6.6,.35],target:[-.7,1,.3]}};
const ease=(v,target,k)=>v.lerp(target,k);
export class Workshop {
 constructor(host,{onStation=()=>{},onTool=()=>{},onMark=()=>{},onReady=()=>{},onHint=()=>{}}={}) {
  this.targets=[];this.onHint=onHint;this.host=host;this.onStation=onStation;this.onTool=onTool;this.onMark=onMark;this.station='village';this.interact='rotate';this.state=null;this.disposed=false;this.textures=[];this.meshes=[];this.frame=0;this.t=0;this.lastTime=0;this.fps=0;this.animatingCamera=false;this.animateUntil=0;
  try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}catch{host.innerHTML='<div class="scene-fallback"><b>三维预览不可用</b><p>仍可通过右上角「⋯ → 备用工具」完成学习，交织图会同步记录操作。</p></div>';this.failed=true;onReady(false);return;}
  const r=this.renderer;r.setPixelRatio(Math.min(devicePixelRatio,1.65));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;host.append(r.domElement);r.domElement.setAttribute('aria-label','可操作的三维织造工坊');
  this.scene=new T.Scene();this.scene.background=new T.Color('#c4cebe');this.scene.fog=new T.Fog('#c4cebe',15,30);
  this.camera=new T.PerspectiveCamera(39,1,.05,40);this.controls=new OrbitControls(this.camera,r.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;this.controls.minDistance=2.6;this.controls.maxDistance=45;this.controls.maxPolarAngle=Math.PI*.48;
  this.controls.addEventListener('start',()=>this.animatingCamera=false);
  this.scene.add(new T.HemisphereLight('#fff6df','#647464',2));
  const sun=new T.DirectionalLight('#ffe6b4',3.1);sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.03;this.scene.add(sun);
  this.wood=new T.MeshStandardMaterial({color:'#956a41',roughness:.83});this.darkwood=new T.MeshStandardMaterial({color:'#4a392b',roughness:.9});this.plaster=new T.MeshStandardMaterial({color:'#e4dac3',roughness:1});this.paper=new T.MeshStandardMaterial({color:'#f4ead4',roughness:1});this.metal=new T.MeshStandardMaterial({color:'#83765e',metalness:.55,roughness:.45});this.yarnMaterials={};
  this.buildRoom();this.buildLoom();this.buildDoll();this.buildArchive();this.buildHandsOn();this.setStation('village',true);
  this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.down=null;this.painting=false;
  this.handlers={down:e=>this.pointerDown(e),move:e=>this.pointerMove(e),up:e=>this.pointerUp(e),lost:()=>this.cancelGesture()};
  r.domElement.addEventListener('pointerdown',this.handlers.down,true);r.domElement.addEventListener('pointermove',this.handlers.move,true);r.domElement.addEventListener('pointerup',this.handlers.up,true);r.domElement.addEventListener('pointercancel',this.handlers.lost,true);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  this.visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else if(!this.frame){this.lastTime=0;this.tick(performance.now());}};document.addEventListener('visibilitychange',this.visibility);
  this.contextLost=e=>{e.preventDefault();host.dataset.context='lost';};this.contextRestored=()=>{host.dataset.context='';};r.domElement.addEventListener('webglcontextlost',this.contextLost);r.domElement.addEventListener('webglcontextrestored',this.contextRestored);
  this.tick(performance.now());onReady(true);
 }
 material(color){return new T.MeshStandardMaterial({color,roughness:.85});}
 box(w,h,d,x,y,z,mat=this.wood,parent=this.scene){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 cylinder(radius,length,x,y,z,mat=this.wood,parent=this.scene){const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,16),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
 label(text,x,y,z,width=1.2,parent=this.scene){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f4ead7';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#a4946d';ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);ctx.fillStyle='#3c4e3e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 42px sans-serif';ctx.fillText(text,256,65);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;}
 buildRoom(){
  this.box(9,.2,6.4,0,-.12,0,this.material('#d2bd99'));
  for(let x=-4.4;x<4.5;x+=.46)this.box(.008,.01,6.3,x,.001,0,this.material('#b79a76'));
  this.box(9,3.7,.15,0,1.75,-3.2,this.plaster);this.box(.15,3.7,6.4,-4.5,1.75,0,this.plaster);
  for(const x of [-4.3,-1.5,1.5,4.3])this.box(.17,3.85,.25,x,1.8,-3.03,this.darkwood);
  this.box(9,.18,.25,0,3.4,-3.05,this.darkwood);
  const win=this.material('#c0d8ce');this.box(2.4,1.6,.04,.6,2.05,-3.07,win);
  for(const x of [-.65,.6,1.85])this.box(.08,1.8,.1,x,2.05,-2.98,this.darkwood);
  this.box(2.6,.08,.1,.6,2.05,-2.97,this.darkwood);
  this.label('织 游  ·  山 海 工 坊',-.8,3.05,-2.94,2.9);
  // Skeins, shelves, clay vessels and a leafy plant form a navigable diorama.
  for(let level=0;level<3;level++){
   this.box(2.05,.09,.5,3.05,.7+level*.65,-2.65);
   for(let j=0;j<5;j++){
    const col=['#284e67','#ab533f','#c7a14e','#d6c9ac','#68745b'][j];
    const spool=this.cylinder(.12,.27,2.3+j*.36,.89+level*.65,-2.65,this.material(col));spool.userData={station:'loom'};
    this.cylinder(.15,.04,2.3+j*.36,1.04+level*.65,-2.65);
   }
  }
  for(const x of [2.03,4.08])this.box(.07,2.3,.4,x,1.3,-2.65,this.darkwood);
  const pot=this.cylinder(.27,.44,-3.6,.24,1.4,this.material('#b16e4d'));
  for(let j=0;j<7;j++){const leaf=new T.Mesh(new T.SphereGeometry(.25,10,6),this.material(j%2?'#668168':'#819071'));leaf.scale.set(.38,2.1,.65);leaf.rotation.z=j*.8;leaf.position.set(-3.6+Math.sin(j)*.25,.7+j*.07,1.4+Math.cos(j)*.2);this.scene.add(leaf);}
  this.box(1.6,.04,1.3,2.45,.02,.25,this.material('#a2644a'));
 }
 buildLoom(){
  const g=this.loom=new T.Group();g.position.set(-.7,0,.35);this.scene.add(g);g.userData.station='loom';
  for(const x of [-1.04,1.04])for(const z of [-1.05,1.05])this.box(.14,1.8,.14,x,.9,z,this.wood,g);
  for(const x of [-1.04,1.04])this.box(.14,.15,2.4,x,1.48,0,this.wood,g);
  for(const z of [-1.15,1.15]){const roller=this.cylinder(.14,2.25,0,1.5,z,this.wood,g);roller.rotation.z=Math.PI/2;}
  this.box(2.3,.12,.12,0,.35,1.05,this.darkwood,g);this.box(2.3,.12,.12,0,.35,-1.05,this.darkwood,g);
  this.warpGroup=new T.Group();g.add(this.warpGroup);this.warpLines=[];
  for(let i=0;i<THREADS;i++){
   const geom=new T.BufferGeometry().setFromPoints([new T.Vector3(-.86+i*.157,1.53,-1.15),new T.Vector3(-.86+i*.157,1.53,0),new T.Vector3(-.86+i*.157,1.53,1.15)]);
   const line=new T.Line(geom,new T.LineBasicMaterial({color:'#284e67'}));this.warpLines.push(line);this.warpGroup.add(line);
  }
  this.heddle=new T.Group();g.add(this.heddle);this.box(2.1,.07,.08,0,2.04,-.25,this.wood,this.heddle);this.box(2.1,.07,.08,0,1.25,-.25,this.wood,this.heddle);
  for(let i=0;i<THREADS;i++)this.box(.012,.78,.012,-.86+i*.157,1.65,-.25,this.metal,this.heddle);
  this.heddle.userData.tool='shed';
  this.beater=new T.Group();g.add(this.beater);this.beater.position.z=.72;
  this.box(2.2,.13,.12,0,1.8,0,this.darkwood,this.beater);
  for(let i=0;i<25;i++)this.box(.015,.4,.02,-.98+i*.08,1.55,0,this.metal,this.beater);
  this.beater.userData.tool='beat';
  this.shuttle=new T.Group();g.add(this.shuttle);this.shuttle.position.set(-1.18,1.62,.12);
  const boat=this.box(.46,.1,.16,0,0,0,this.wood,this.shuttle);boat.geometry.dispose();boat.geometry=new T.CapsuleGeometry(.065,.32,4,10);boat.rotation.z=Math.PI/2;
  const bobbin=this.cylinder(.045,.2,0,.06,0,this.material('#d7c29d'),this.shuttle);bobbin.rotation.z=Math.PI/2;this.shuttle.userData.tool='shuttle';
  this.cloth=new T.Mesh(new T.PlaneGeometry(1.82,1.06),new T.MeshStandardMaterial({color:'#d9c9a5',side:T.DoubleSide,roughness:1}));this.cloth.rotation.x=-Math.PI/2;this.cloth.position.set(0,1.54,.65);g.add(this.cloth);
  this.cloth.userData.tool='inspect';
  this.frontCloth=new T.Mesh(new T.PlaneGeometry(1.82,.65),new T.MeshStandardMaterial({color:'#d9c9a5',side:T.DoubleSide,roughness:1}));this.frontCloth.position.set(0,1.17,1.17);g.add(this.frontCloth);
  const stool=this.cylinder(.38,.15,0,.6,1.85,this.wood,g);for(const x of [-.23,.23])this.box(.09,.55,.09,x,.28,1.85,this.darkwood,g);
  this.label('织 造 台',-.7,.32,2.28,1.1);
 }
 buildDoll(){
  const g=this.dollStation=new T.Group();g.position.set(2.45,0,0);this.scene.add(g);g.userData.station='doll';
  this.box(1.75,.16,1.35,0,.98,0,this.wood,g);for(const x of [-.7,.7])for(const z of [-.5,.5])this.box(.12,.95,.12,x,.47,z,this.darkwood,g);
  this.doll=new PegDoll();this.doll.setTurnQuality(.6);this.doll.setSize(11);this.doll.group.position.set(0,1.07,0);g.add(this.doll.group);
  this.paint=new PaintSurface(this.doll,512);
  this.label('木 偶 创 作',2.45,.32,1.04,1.3);
  const mat=this.material('#e8dcc4');this.box(.4,.015,.5,-.53,1.075,.2,mat,g);
  for(let j=0;j<3;j++){const brush=this.cylinder(.018,.5,.57+j*.08,1.23,-.2,this.material(j%2?'#ac5b43':'#315c64'),g);brush.rotation.z=.25;}
 }
 buildArchive(){
  const g=this.archive=new T.Group();g.position.set(-3,0,-.95);g.userData.station='archive';this.scene.add(g);
  this.box(1.7,.12,.9,0,1.1,0,this.wood,g);for(const x of [-.65,.65])this.box(.1,1.05,.1,x,.52,0,this.darkwood,g);
  for(let j=0;j<4;j++){const book=this.box(.31,.06,.48,-.55+j*.36,1.22+j*.025,0,this.material(['#b56846','#6b7b64','#395d6a','#d4b471'][j]),g);book.rotation.y=j*.1;}
  this.box(1.45,1.05,.08,0,2,-.43,this.wood,g);this.box(1.3,.9,.02,0,2,-.38,this.paper,g);
  this.label('纺  ·  染  ·  织  ·  绣',-3,2.05,-1.36,1.15);
  this.label('资 料 台',-3,.32,-.15,1.05);
 }
 setStation(station,instant=false){if(this.failed)return;this.station=station;this.interact='direct';this.controls.enabled=true;this.cancelGesture();const p=POSITIONS[station]||POSITIONS.village;this.goalEye=new T.Vector3(...p.eye);this.goalTarget=new T.Vector3(...p.target);this.fitView(this.goalEye,this.goalTarget,station);if(instant){this.camera.position.copy(this.goalEye);this.controls.target.copy(this.goalTarget);this.controls.update();}else this.animatingCamera=true;}
 fitView(eye,target,station){
  if(!this.targets?.length)return;
  this.scene.updateMatrixWorld(true);
  const objects=this.targets.filter(t=>t.station===station);
  if(!objects.length)return;
  const camera=this.camera.clone();camera.aspect=this.host.clientWidth/Math.max(1,this.host.clientHeight);camera.updateProjectionMatrix();
  for(let iteration=0;iteration<5;iteration++){
   camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld(true);
   let factor=1;
   for(const t of objects){const p=t.object.getWorldPosition(new T.Vector3()).project(camera);factor=Math.max(factor,Math.abs(p.x)/.78,p.y/.78,-p.y/.53);}
   if(factor<=1.01)break;
   eye.copy(target).add(camera.position.clone().sub(target).multiplyScalar(Math.min(2,factor)*1.025));
  }
 }
 topView(){const p=POSITIONS.top;this.goalEye=new T.Vector3(...p.eye);this.goalTarget=new T.Vector3(...p.target);this.animatingCamera=true;}
 setTool(tool){this.interact=tool;if(!this.drag&&!this.painting)this.controls.enabled=true;}
 update(state){
  this.state=state;if(this.failed)return;this.updateTargets();
  const run=state.run;
  if(run){
   const m=missionOf(run.missionId);
   this.warpLines.forEach((line,i)=>{line.visible=i<run.warpCount;line.material.color.set(warpColor(run,i));const a=line.geometry.attributes.position;const raised=run.shed!==null&&((i-run.shed+(m.type==='twill'?4:2))%(m.type==='twill'?4:2)<(m.type==='twill'?2:1));a.setY(1,1.53+(raised?.34:-.04));a.needsUpdate=true;});
   const signature=JSON.stringify([run.rows,run.warpYarn,run.warpStyle]);
   if(signature!==this.fabricSignature){this.fabricSignature=signature;const canvas=drawFabric(run,{repeat:2});this.fabricTexture?.dispose();this.fabricTexture=new T.CanvasTexture(canvas);this.fabricTexture.colorSpace=T.SRGBColorSpace;for(const mesh of [this.cloth,this.frontCloth]){mesh.visible=run.rows.length>0;mesh.material.map=this.fabricTexture;mesh.material.needsUpdate=true;}}
   const side=run.rows.length%2===0?-1:1;this.shuttleTarget=run.pending?-side*1.18:side*1.18;
   const event=run.events.at(-1);if(event?.type==='BEAT'&&event.at!==this.lastBeat){this.lastBeat=event.at;this.beatStart=performance.now();}
   this.shuttle.children[1].material.color.set(yarnOf(run.weftYarn).color);
  }
  this.doll.setShape(state.draft.shape);if(this.doll.woodKey!==state.draft.wood)this.doll.setWood(state.draft.wood);this.doll.setFinish(state.draft.finish);
  const signature=JSON.stringify([run?.rows,run?.warpYarn,run?.warpStyle,state.draft]);
  if(signature!==this.dollSignature){this.dollSignature=signature;this.updateSkin();}
 }
 updateSkin(){
  const {run,draft}=this.state,c=this.paint.ctx;c.clearRect(0,0,512,512);c.drawImage(this.doll.woodCanvas,0,0,512,512);
  if(run?.rows.length){const fabric=drawFabric(run,{size:256,repeat:draft.scale});c.save();if(draft.layout==='panel'){c.drawImage(fabric,160,220,192,280);}else if(draft.layout==='bands'){for(let y=225;y<512;y+=90)c.drawImage(fabric,0,y,512,58);}else{c.fillStyle=c.createPattern(fabric,'repeat');c.fillRect(0,220,512,292);}c.restore();}
  c.fillStyle='#3b352b';for(const x of [242,270]){c.beginPath();c.arc(x,145,4,0,Math.PI*2);c.fill();}c.strokeStyle='#a95444';c.lineWidth=3;c.beginPath();c.arc(256,155,10,.2,2.9);c.stroke();
  for(const mark of draft.marks){const x=mark.u*512,y=(1-mark.v)*512;if(mark.kind==='brush'){c.fillStyle=mark.color;c.beginPath();c.arc(x,y,5,0,7);c.fill();}else{const decal=this.paint.createStampDecal(mark.kind,mark.color);c.drawImage(decal,x-22,y-22,44,44);}}
  this.doll.setPaintCanvas(this.paint.canvas);
 }
 hit(event){const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.scene.children,true)[0];}
 pointerDown(e){
  if(e.isPrimary===false){this.cancelGesture();return;}
  this.down={x:e.clientX,y:e.clientY,time:performance.now(),pointer:e.pointerId};
  const target=this.pickTarget(e);
  if(target){
   this.drag={target,start:this.down,tension:this.state?.run?.tension??60};
   this.controls.enabled=false;this.controls.autoRotate=false;
   this.renderer.domElement.setPointerCapture(e.pointerId);return;
  }
  if(this.station==='doll'&&['brush','daisy','leaf','star','blossom'].includes(this.interact)){
   const hit=this.hit(e);
   if(hit?.object===this.doll.mesh){this.painting=true;this.controls.enabled=false;this.markAt(e);this.renderer.domElement.setPointerCapture(e.pointerId);return;}
  }
  this.controls.enabled=true;
 }
 pointerMove(e){
  if(this.drag){
   const dx=e.clientX-this.drag.start.x,dy=e.clientY-this.drag.start.y;
   if(this.drag.target.id==='shuttle')this.shuttle.position.x=Math.max(-1.5,Math.min(1.5,(this.state.run.rows.length%2===0?-1.18:1.18)+dx/100));
   if(this.drag.target.id==='beater')this.beater.position.z=.72+Math.max(-.2,Math.min(.55,dy/160));
   if(this.drag.target.id==='warp-thread'){this.pullThread.visible=true;const a=this.pullThread.geometry.attributes.position;a.setXYZ(1,-1.35,1.65+Math.max(0,-dy/200),.9-Math.max(0,-dy/120));a.needsUpdate=true;}
   return;
  }
  if(this.painting&&this.interact==='brush'&&performance.now()-(this.lastMark||0)>40){this.lastMark=performance.now();this.markAt(e);}
 }
 markAt(e){const hit=this.hit(e);if(hit?.object===this.doll.mesh&&hit.uv)this.onMark({u:hit.uv.x,v:hit.uv.y});}
 pointerUp(e){
  if(!this.down)return;
  const dx=e.clientX-this.down.x,dy=e.clientY-this.down.y;
  if(this.painting){this.cancelGesture();return;}
  if(this.drag){
   const {target,tension}=this.drag;
   const result=resolveGesture(target.id,dx,dy,{tension});
   this.cancelGesture();
   if(result.hint)this.onHint(result.hint);
   else if(result.tool){
    if(result.tool.startsWith('station-'))this.onStation(result.tool.slice(8));
    else this.onTool(result.tool,result.value);
   }
   return;
  }
  this.down=null;
 }
 cancelGesture(){this.painting=false;this.drag=null;this.down=null;if(this.controls)this.controls.enabled=true;if(this.pullThread)this.pullThread.visible=false;}
 registerTarget(id,object,label,station,{primary=false}={}){
  const marker=new T.Mesh(new T.TorusGeometry(.13,.012,5,24),new T.MeshBasicMaterial({color:'#e8b966',transparent:true,opacity:.85,depthTest:false}));
  marker.rotation.x=-Math.PI/2;marker.position.y=.1;marker.renderOrder=5;object.add(marker);
  const item={id,object,label,station,marker,primary,enabled:true};this.targets.push(item);return item;
 }
 buildHandsOn(){
  // Materials live on the workbench, not in a screen palette.
  this.loomSpools=[];
  for(let i=0;i<YARNS.length;i++){
   const y=YARNS[i],g=new T.Group();g.position.set(1.58,1.25,-1.1+i*.4);this.loom.add(g);
   this.cylinder(.13,.28,0,0,0,this.material(y.color),g);this.cylinder(.16,.035,0,.15,0,this.wood,g);this.cylinder(.16,.035,0,-.15,0,this.wood,g);
   this.registerTarget('yarn-'+y.id,g,y.name,'loom');this.loomSpools.push(g);
  }
  const peg=this.cylinder(.055,.38,-1.35,1.65,.9,this.wood,this.loom);
  this.registerTarget('warp-thread',peg,'拉线整经','loom');
  this.pullThread=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-1.35,1.65,.9),new T.Vector3(-1.35,1.65,.9)]),new T.LineBasicMaterial({color:'#e6ba66'}));this.pullThread.visible=false;this.loom.add(this.pullThread);
  const latch=this.box(.22,.16,.32,1.05,1.68,1.1,this.metal,this.loom);this.registerTarget('dress',latch,'扣紧经轴','loom');
  const tension=this.cylinder(.18,.12,-1.2,1.45,1.12,this.darkwood,this.loom);tension.rotation.z=Math.PI/2;this.registerTarget('tension',tension,'转轴调张力','loom');
  this.shedHandles=[];
  for(let i=0;i<4;i++){
   const g=new T.Group();g.position.set(-.83+i*.55,2.2,-.25);this.loom.add(g);
   this.box(.08,.32,.08,0,.05,0,this.wood,g);this.box(.34,.08,.15,0,.22,0,this.darkwood,g);
   this.label(String(i+1),0,.4,0,.3,g);
   this.registerTarget('shed-'+i,g,'第 '+(i+1)+' 组综','loom');this.shedHandles.push(g);
  }
  // Attach touch anchors to the actual moving tool, so hit areas follow animation.
  this.registerTarget('shuttle',this.shuttle,'按住梭子拖向另一端','loom');
  const beaterAnchor=new T.Group();beaterAnchor.position.set(0,1.85,0);this.beater.add(beaterAnchor);this.registerTarget('beater',beaterAnchor,'下拉打纬杆','loom');
  const clothAnchor=new T.Group();clothAnchor.position.set(0,1.1,1.19);this.loom.add(clothAnchor);this.registerTarget('inspect',clothAnchor,'摸一摸布面','loom');
  const undo=this.cylinder(.17,.09,-1.2,1.08,1.2,this.material('#ad7953'),this.loom);undo.rotation.z=Math.PI/2;this.registerTarget('undo',undo,'回转拆纬','loom');
  this.loomBell=new T.Group();this.loomBell.position.set(1.45,.85,1.62);this.loom.add(this.loomBell);
  this.cylinder(.17,.2,0,0,0,this.material('#bb9a5b'),this.loomBell);this.cylinder(.05,.14,0,.16,0,this.darkwood,this.loomBell);this.registerTarget('submit',this.loomBell,'摇铃交布','loom');
  const guide=new T.Group();guide.position.set(-1.6,1.1,-.6);this.loom.add(guide);this.cylinder(.14,.3,0,.2,0,this.wood,guide);const head=new T.Mesh(new T.SphereGeometry(.16,12,8),this.material('#dfc197'));head.position.y=.5;guide.add(head);this.registerTarget('mentor',guide,'请教师傅','loom');
  // A physical commission board replaces the home-screen mission menu.
  this.commissionBoard=new T.Group();this.commissionBoard.position.set(-.5,0,2.8);this.commissionBoard.userData.station='board';this.scene.add(this.commissionBoard);
  this.box(2.8,1.65,.12,0,1.4,0,this.wood,this.commissionBoard);
  for(const x of [-1.1,1.1])this.box(.12,1.6,.12,x,.75,.02,this.darkwood,this.commissionBoard);
  for(let i=0;i<4;i++){
   const scroll=this.box(.51,.8,.045,-.95+i*.63,1.56,.09,this.paper,this.commissionBoard);
   this.label('委托 '+(i+1),0,.12,.029,.43,scroll);this.registerTarget('commission-'+['first','repair','transfer','twill'][i],scroll,'委托 '+(i+1),'board');
  }
  const boardAnchor=new T.Group();boardAnchor.position.y=1.5;this.commissionBoard.add(boardAnchor);this.registerTarget('station-board',boardAnchor,'委托板','village');
  this.registerTarget('station-loom',this.loom,'织造台','village');
  this.registerTarget('station-doll',this.doll.group,'木偶台','village');
  const bookAnchor=new T.Group();bookAnchor.position.set(0,1.45,0);this.archive.add(bookAnchor);this.registerTarget('station-archive',bookAnchor,'资料台','village');
  // Each volume opens a single, contextual page rather than a list of cards.
  for(let i=0;i<4;i++){
   const anchor=new T.Group();anchor.position.set(-.55+i*.36,1.32+i*.025,0);this.archive.add(anchor);
   this.registerTarget('book-'+['culture','memory','warp','plain'][i],anchor,['纺染织绣','纹样与记忆','经纬与工具','平纹结构'][i],'archive');
  }
  const ledger=this.box(.45,.08,.55,-.78,1.14,.53,this.material('#64765b'),this.dollStation);this.registerTarget('save',ledger,'签名收藏','doll');
  this.sampleBlanks=[];
  for(let i=0;i<4;i++){
   const g=new T.Group();g.position.set(-.63+i*.42,1.15,-.55);this.dollStation.add(g);
   const body=new T.Mesh(i===0?new T.ConeGeometry(.105,.3,16):i===1?new T.CapsuleGeometry(.09,.15,4,12):new T.CylinderGeometry(i===2?.075:.05,.11,.3,16),this.material('#d4b28b'));body.position.y=.15;g.add(body);
   const h=new T.Mesh(new T.SphereGeometry(.085,12,8),this.material('#dfc196'));h.position.y=.37;g.add(h);
   this.registerTarget('shape-'+['cone','capsule','kokeshi','matryoshka'][i],g,['圆锥木坯','圆润木坯','喇叭身木坯','蛋形木坯'][i],'doll');this.sampleBlanks.push(g);
  }
  for(let i=0;i<6;i++){
   const g=new T.Group();g.position.set(-.62+i*.25,1.13,.5);this.dollStation.add(g);
   this.cylinder(.085,.08,0,0,0,this.material(YARNS[i].color),g);this.registerTarget('ink-'+YARNS[i].id,g,YARNS[i].name+'颜料','doll');
  }
  for(let i=0;i<4;i++){
   const tool=['brush','daisy','leaf','star'][i],g=new T.Group();g.position.set(1.03,1.15,-.5+i*.34);this.dollStation.add(g);
   if(i===0){const brush=this.cylinder(.035,.38,0,.13,0,this.material('#486c69'),g);brush.rotation.z=-.25;}
   else{this.cylinder(.09,.08,0,0,0,this.wood,g);this.label(['','✿','❧','☆'][i],0,.15,0,.2,g);}
   this.registerTarget('tool-'+tool,g,['拿起画笔','拿起雏菊章','拿起叶子章','拿起星星章'][i],'doll');
  }
  for(let i=0;i<3;i++){
   const swatch=this.box(.22,.015,.24,-1.08,1.04,-.5+i*.36,this.material(['#b4a56d','#9bb0a2','#b8907e'][i]),this.dollStation);
   this.registerTarget('layout-'+['repeat','panel','bands'][i],swatch,['平铺样片','正面裁片','色带样片'][i],'doll');
  }
  const eraser=this.box(.18,.05,.16,.62,1.08,.61,this.material('#d7b29b'),this.dollStation);this.registerTarget('undo-mark',eraser,'撤销上笔','doll');
  this.updateTargets();
 }
 updateTargets(){
  const run=this.state?.run,m=run?missionOf(run.missionId):null;
  for(const t of this.targets){
   t.enabled=t.station===this.station;t.primary=false;
   if(t.station==='loom'){
    t.enabled&&=!!run&&!run.submitted;
    if(t.id==='warp-thread'){t.enabled&&=run?.phase==='warp'&&run.warpCount<12;t.primary=t.enabled;}
    if(t.id==='dress'){t.enabled&&=run?.phase==='warp'&&run.warpCount===12;t.primary=t.enabled;}
    if(t.id.startsWith('shed-')){const i=Number(t.id.slice(5));t.enabled&&=run?.phase==='shed'&&!run.pending&&run.rows.length<m.rows&&i<(m.type==='twill'?4:2);t.primary=t.enabled&&run.shed===null;}
    if(t.id==='shuttle'){t.enabled&&=run?.phase==='shed'&&run.shed!==null&&!run.pending&&run.rows.length<m.rows;t.primary=t.enabled;}
    if(t.id==='beater'){t.enabled&&=!!run?.pending;t.primary=t.enabled;}
    if(t.id==='inspect')t.enabled=!!run?.rows.length&&this.station==='loom';
    if(t.id==='undo')t.enabled&&=!!(run?.rows.length||run?.pending);
    if(t.id==='submit'){t.enabled&&=run?.rows.length===m?.rows&&!run.pending;t.primary=t.enabled;}
    if(t.id==='mentor')t.enabled&&=m?.id!=='transfer';
   }
   if(t.id.startsWith('commission-')){const i=['first','repair','transfer','twill'].indexOf(t.id.slice(11));t.enabled&&=i===0||!!this.state?.completed?.[['first','repair','transfer'][i-1]];t.primary=t.enabled&&i===Object.keys(this.state?.completed||{}).length;}
   if(t.station==='doll')t.enabled&&=!!run?.submitted;
   t.marker.visible=t.enabled&&(t.primary||t.id.startsWith('commission-'));
  }
  if(this.shedHandles&&m){const n=m.type==='twill'?4:2;for(let i=0;i<4;i++){this.shedHandles[i].visible=i<n;this.shedHandles[i].position.x=n===2?-.55+i*1.1:-.83+i*.55;this.shedHandles[i].position.y=2.2+(run.shed===i?.16:0);}}
  if(this.commissionBoard)this.commissionBoard.visible=['village','board'].includes(this.station);
 }
 targetPoints(){
  if(this.failed)return [];
  this.scene.updateMatrixWorld(true);const rect=this.renderer.domElement.getBoundingClientRect();
  return this.targets.filter(t=>t.enabled).map(t=>{const p=t.object.getWorldPosition(new T.Vector3()).project(this.camera);return {id:t.id,label:t.label,primary:t.primary,x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2,visible:p.z>-1&&p.z<1&&p.x>-.96&&p.x<.96&&p.y>-.94&&p.y<.94};});
 }
 pickTarget(event){
  const points=this.targetPoints().filter(t=>t.visible).map(t=>({...t,distance:Math.hypot(t.x-event.clientX,t.y-event.clientY)})).filter(t=>t.distance<25).sort((a,b)=>a.distance-b.distance);
  if(points.length)return this.targets.find(t=>t.id===points[0].id&&t.enabled);
  if(this.station==='village'){
   let node=this.hit(event)?.object;
   while(node){if(node.userData.station)return this.targets.find(t=>t.id==='station-'+node.userData.station&&t.enabled)||null;node=node.parent;}
  }
  return null;
 }
 resize(){if(this.failed)return;const {clientWidth:w,clientHeight:h}=this.host;this.renderer.setSize(w,h);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();if(!this.drag){this.fitView(this.camera.position,this.controls.target,this.station);this.controls.update();}}
 tick(time){if(this.disposed||document.hidden){this.frame=0;return;}this.frame=requestAnimationFrame(t=>this.tick(t));if(this.lastTime&&time-this.lastTime<32)return;this.lastTime=time;
  if(this.animatingCamera){ease(this.camera.position,this.goalEye,.12);ease(this.controls.target,this.goalTarget,.12);if(this.camera.position.distanceTo(this.goalEye)<.015)this.animatingCamera=false;}
  if(this.shuttleTarget!==undefined&&this.drag?.target.id!=='shuttle')this.shuttle.position.x+=(this.shuttleTarget-this.shuttle.position.x)*.18;
  const dt=time-(this.beatStart||-1000);if(this.drag?.target.id!=='beater')this.beater.position.z=.72-(dt<600?Math.sin(dt/600*Math.PI)*.45:0);
  for(const t of this.targets)if(t.marker.visible){const k=1+Math.sin(time/450)*.12;t.marker.scale.setScalar(k);}
  this.controls.update();this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.disposed=true;if(this.failed)return;cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();document.removeEventListener('visibilitychange',this.visibility);for(const [event,key] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','lost']])this.renderer.domElement.removeEventListener(event,this.handlers[key],true);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.renderer.domElement.removeEventListener('webglcontextrestored',this.contextRestored);const resources=new Set();this.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){resources.add(m);for(const t of Object.values(m))if(t?.isTexture)resources.add(t);}});resources.add(this.doll.woodTexture);resources.add(this.doll.woodBumpTexture);for(const resource of resources)resource.dispose();this.fabricTexture?.dispose();for(const t of this.textures)t.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
