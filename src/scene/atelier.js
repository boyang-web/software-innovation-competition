import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import hills from '../assets/hills.jpg';

function surface(width,height,paint){
 const c=document.createElement('canvas');c.width=width;c.height=height;
 paint(c.getContext('2d'),width,height);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}

// Bake stationary geometry into batches. Interactive meshes and all moving parts stay independent.
function batch(group){
 const batches=new Map();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.children.length||mesh.userData.station)continue;
  mesh.updateMatrix();
  const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  g.applyMatrix4(mesh.matrix);
  const list=batches.get(mesh.material)||[];list.push(g);batches.set(mesh.material,list);
  group.remove(mesh);mesh.geometry.dispose();
 }
 for(const [material,parts] of batches){
  const merged=mergeGeometries(parts);
  const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  for(const part of parts)part.dispose();
 }
}

export function textileMap(index=0){
 const palettes=[['#234b55','#ddae69','#a84f36'],['#883e36','#ebc580','#294f54'],['#36574d','#e2cda0','#ad643e']];
 return surface(256,384,(c,w,h)=>{
  const [field,thread,accent]=palettes[index%3];c.fillStyle=field;c.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=96){
   c.fillStyle=thread;for(const band of [4,10,25,72,86])c.fillRect(0,y+band,w,band===10?5:2);
   for(let x=-32;x<w;x+=64){
    for(let j=0;j<7;j++){const n=4-Math.abs(j-3);c.fillStyle=j%2?thread:accent;c.fillRect(x+32-n*5,y+32+j*5,10*n,5);}
   }
  }
  c.fillStyle='#ffe7ae30';for(let x=1;x<w;x+=4)c.fillRect(x,0,1,h);
  c.fillStyle='#1d282939';for(let y=2;y<h;y+=3)c.fillRect(0,y,w,1);
 });
}

export function dressAtelier(s){
 const group=new T.Group();s.scene.add(group);
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.85});
 const ochre=mat('#b88244'),clay=mat('#aa573f'),indigo=mat('#20495a'),cream=mat('#f0ce92'),reed=mat('#c4975f');
 const ring=(radius,tube,x,y,z,m,vertical=false)=>{
  const o=new T.Mesh(new T.TorusGeometry(radius,tube,6,32),m);o.position.set(x,y,z);if(!vertical)o.rotation.x=Math.PI/2;group.add(o);return o;
 };
 const turned=(profile,x,y,z,m)=>{
  const mesh=new T.Mesh(new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),28),m);
  mesh.position.set(x,y,z);group.add(mesh);return mesh;
 };
 const woodMap=surface(256,128,(c,w,h)=>{
  c.fillStyle='#d0b895';c.fillRect(0,0,w,h);
  for(let i=0;i<98;i++){const y=i*1.45;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(80,y+7*Math.sin(i*.3),150,y-4*Math.cos(i*.2),w,y);c.lineWidth=i%7===0?1.6:.55;c.strokeStyle=i%3?'#73533966':'#fff0c276';c.stroke();}
 });
 for(const m of [s.wood,s.darkwood]){m.map=woodMap;m.needsUpdate=true;}
 const backdrop=surface(8,256,(c,w,h)=>{const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#c1c6af');gradient.addColorStop(.55,'#e4d6b5');gradient.addColorStop(1,'#aab4a2');c.fillStyle=gradient;c.fillRect(0,0,w,h);});
 s.scene.background=backdrop;s.textures.push(backdrop);
 const landscape=new T.TextureLoader().load(hills,()=>{s.dirtyUntil=performance.now()+800;});
 landscape.colorSpace=T.SRGBColorSpace;
 const pane=new T.Mesh(new T.PlaneGeometry(3.45,1.65),new T.MeshBasicMaterial({map:landscape,toneMapped:false}));
 pane.position.set(.23,2.17,-2.94);group.add(pane);
 for(const x of [-1.54,2])s.box(.1,1.85,.14,x,2.16,-2.91,s.darkwood,group);
 for(const y of [1.3,3.05])s.box(3.65,.11,.21,.23,y,-2.9,s.wood,group);
 for(const x of [-.94,1.4])s.box(.045,1.68,.07,x,2.17,-2.88,s.wood,group);
 // Indigo vat, pigment basin and banded wicker basket by the back wall.
 for(const [x,z,size,material] of [[-1.45,-2,.85,indigo],[1.44,-2.1,.62,clay],[3.8,1.6,.68,reed]]){
  const p=turned([[.27,0],[.43,.09],[.48,.46],[.38,.67],[.39,.72],[.31,.72],[.30,.60]],x,0,z,material);p.scale.setScalar(size);
  for(const [r,h] of [[.44,.15],[.47,.4],[.385,.70]])ring(r*size,.022*size,x,h*size,z,ochre);
  s.cylinder(.315*size,.016,x,.63*size,z,material===reed?cream:indigo,group);
 }
 // A spoked winding wheel and folded yardage at the side of the loom.
 const wx=-2.38,wz=.93;
 ring(.48,.041,wx,.79,wz,s.wood,true);ring(.40,.022,wx,.79,wz,ochre,true);
 for(let i=0;i<8;i++){const spoke=s.box(.028,.93,.035,wx,.79,wz,reed,group);spoke.rotation.z=i*Math.PI/8;}
 s.box(.12,.79,.13,wx,.39,wz+.08,s.darkwood,group);s.box(.63,.09,.4,wx,.05,wz+.08,s.wood,group);
 // Wound thread has fine oblique ridges, while the cap and axle retain their wood grain.
 const winding=surface(128,128,(c,w,h)=>{c.fillStyle='#f2e9dc';c.fillRect(0,0,w,h);for(let j=-8;j<145;j+=5){c.strokeStyle='#776958';c.lineWidth=1.25;c.beginPath();c.moveTo(0,j+7);c.lineTo(w,j-1);c.stroke();}});
 for(const spool of s.loomSpools){spool.children[0].material.map=winding;spool.children[0].material.needsUpdate=true;}
 s.box(9.13,.16,6.53,0,-.24,0,s.darkwood,group);
 const cloths=[0,1,2].map(i=>new T.MeshStandardMaterial({map:textileMap(i),side:T.DoubleSide,roughness:1}));
 for(let i=0;i<3;i++){
  const x=-4.39,z=-2.1+i*1.26;
  const geo=new T.PlaneGeometry(.94,1.46,16,3),a=geo.attributes.position;
  for(let k=0;k<a.count;k++)a.setZ(k,Math.cos(a.getX(k)*20)*.032);geo.computeVertexNormals();
  const hanging=new T.Mesh(geo,cloths[i]);hanging.rotation.y=Math.PI/2;hanging.position.set(x,2.22,z);group.add(hanging);
  const rail=s.cylinder(.032,1.12,x,2.98,z,ochre,group);rail.rotation.x=Math.PI/2;
  for(let j=0;j<10;j++)s.cylinder(.012,.11,x,1.44,z-.43+j*.096,cream,group);
 }
 for(let i=0;i<3;i++)s.box(.70,.10,.45,3.80,.11+i*.105,-1.83,cloths[i],group);
 // Two paper lanterns, their ribs and silk tassels share the same static batches.
 for(const x of [-3.67,3.67]){
  const z=-2.30;
  s.cylinder(.018,.51,x,3.43,z,s.darkwood,group);
  turned([[.13,0],[.24,.07],[.32,.27],[.27,.50],[.15,.59]],x,2.65,z,cream);
  for(const [r,h] of [[.16,.02],[.30,.18],[.317,.27],[.295,.39],[.16,.57]])ring(r,.012,x,2.65+h,z,ochre);
  s.cylinder(.024,.18,x,2.57,z,clay,group);
 }
 const rug=new T.Mesh(new T.PlaneGeometry(2.30,1.9),cloths[0]);rug.rotation.x=-Math.PI/2;rug.position.set(2.47,.047,.25);group.add(rug);
 const shadow=surface(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'#38261dcc');g.addColorStop(.63,'#422b2260');g.addColorStop(1,'#422b2200');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const contact=new T.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false,toneMapped:false});
 for(const [x,z,w,d,y] of [[-.7,.35,3.7,3.45,.025],[2.45,.12,2.4,1.9,.06],[-3,-.95,2.3,1.7,.025],[-.5,2.8,3.2,1.1,.025]]){
  const pad=new T.Mesh(new T.PlaneGeometry(w,d),contact);pad.rotation.x=-Math.PI/2;pad.position.set(x,y,z);s.scene.add(pad);
 }
 // The newest saved fabric hangs above the shelves.
 const gallery=new T.Mesh(new T.PlaneGeometry(1.6,.76),cloths[1].clone());gallery.position.set(3.06,2.72,-2.92);s.scene.add(gallery);
 s.gallery=gallery;s.galleryDefault=gallery.material.map;
 batch(group);batch(s.heddle);batch(s.beater);
}
