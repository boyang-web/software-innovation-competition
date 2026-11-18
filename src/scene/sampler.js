import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {STUDIES,matchesSample} from '../domain/sampler.js';
import {warpFaceUp} from '../vendor/weave.js';

const cell=.196,rows=4,columns=8;
function thread(points,radius){
 const curve=new T.CatmullRomCurve3(points);
 return new T.TubeGeometry(curve,points.length*3,radius,8,false);
}
// Two woven pieces in the same frame: the narrow reference and the editable right side.
function wovenPiece(group,phases,x0,count,study,materials){
 const parts=[[],[]];
 for(let col=0;col<count;col++){
  const x=x0+col*cell,points=[new T.Vector3(x,.53,0)];
  for(let row=0;row<rows;row++)points.push(new T.Vector3(x,.36-row*.24,warpFaceUp(study.pattern,col,phases[row])?.047:-.047));
  points.push(new T.Vector3(x,-.53,0));parts[0].push(thread(points,.062));
 }
 for(let row=0;row<rows;row++){
  const y=.36-row*.24,points=[new T.Vector3(x0-cell*.46,y,0)];
  for(let col=0;col<count;col++)points.push(new T.Vector3(x0+col*cell,y,warpFaceUp(study.pattern,col,phases[row])?-.05:.05));
  points.push(new T.Vector3(x0+(count-.54)*cell,y,0));parts[1].push(thread(points,.064));
 }
 parts.forEach((pieces,i)=>{
  const mesh=new T.Mesh(mergeGeometries(pieces),materials[i]);mesh.layers.enable(1);group.add(mesh);
  pieces.forEach(g=>g.dispose());
 });
}

export function buildSampler(s){
 const frame=new T.Group();frame.position.set(-2.97,2.25,-2.80);frame.userData.station='sampler';s.scene.add(frame);
 s.box(3.0,1.6,.09,0,0,-.08,s.darkwood,frame);
 for(const y of [-.61,.61])s.box(2.93,.075,.19,0,y,.06,s.wood,frame);
 s.registerTarget('station-sampler',frame,'补纹架','village');
 const patch=new T.Group();patch.position.z=.08;frame.add(patch);
 const materials=[s.material('#284e67'),s.material('#f8d595')];
 const pegs=[];
 for(let i=0;i<rows;i++){
  const p=s.cylinder(.084,.14,1.32,.36-i*.24,.14,s.wood,frame);p.rotation.x=Math.PI/2;
  s.box(.11,.017,.01,0,.075,0,s.paper,p);
  s.registerTarget('peg-'+i,p,'第 '+(i+1)+' 纬','sampler');pegs.push(p);
 }
 const spool=s.cylinder(.12,.30,.98,-.67,.14,s.metal,frame);spool.rotation.z=Math.PI/2;
 s.registerTarget('next-sample',spool,'卷到下一块','sampler');
 s.label('原 样',-.98,.86,.02,1.02,frame);s.label('接 纹',.38,.86,.02,1.02,frame);
 // Isolate the frame in close-up so walls, lamps and foreground furniture never mask the threads.
 frame.traverse(o=>o.layers.enable(1));
 const mount=s.box(12,15,.12,0,0,-.25,s.plaster,frame);mount.layers.set(1);
 let signature='';
 return model=>{
  const key=[model.level,...model.phases].join(',');
  if(signature===key)return;signature=key;
  for(const mesh of [...patch.children]){patch.remove(mesh);mesh.geometry.dispose();}
  const study=STUDIES[model.level];materials.forEach((m,i)=>m.color.set(study.colors[i]));
  wovenPiece(patch,study.phases,-1.34,4,study,materials);
  wovenPiece(patch,model.phases,-.49,columns,study,materials);
  pegs.forEach((p,i)=>p.rotation.y=model.phases[i]*Math.PI/4);
  spool.material=matchesSample(model)?s.metal:s.darkwood;
 };
}
