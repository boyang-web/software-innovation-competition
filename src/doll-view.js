import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PegDoll } from './vendor/doll.js';
import { makeTile } from './vendor/weave.js';
export function mountDoll(host,color,shape) {
 let renderer;
 try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{host.textContent='此设备暂不支持三维预览。你的织纹与学习记录仍可保存。';return ()=>{};}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,30);
 const doll=new PegDoll();doll.setShape(shape);doll.setTurnQuality(.6);scene.add(doll.group);
 const h=doll.worldHeight;camera.position.set(0,h*.65,h*2.6);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,h*.48,0);controls.enablePan=false;controls.minDistance=h*1.5;controls.maxDistance=h*4;controls.update();
 scene.add(new THREE.HemisphereLight(0xffffff,0x9c8460,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
 const tile=makeTile({warp:[{color,width:8},{color:'#e8dcc2',width:8}],weft:[{color:'#e8dcc2',width:8}],linked:false,mirror:false,weave:'plain',texture:.65});
 const skin=document.createElement('canvas');skin.width=skin.height=512;const c=skin.getContext('2d');c.fillStyle='#e2bc8b';c.fillRect(0,0,512,512);c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,215,512,297);c.fillStyle='#3a3026';c.beginPath();c.arc(242,140,4,0,7);c.arc(270,140,4,0,7);c.fill();c.strokeStyle='#a25641';c.lineWidth=3;c.beginPath();c.arc(256,153,10,.2,2.9);c.stroke();doll.setPaintCanvas(skin);
 const resize=()=>{const w=host.clientWidth,height=host.clientHeight;renderer.setSize(w,height);camera.aspect=w/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let frame;function draw(){frame=requestAnimationFrame(draw);renderer.render(scene,camera);}draw();
 return ()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const v of Object.values(o.material))if(v?.isTexture)v.dispose();o.material.dispose();}});doll.woodTexture.dispose();doll.woodBumpTexture.dispose();renderer.dispose();renderer.domElement.remove();};
}
