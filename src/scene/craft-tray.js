import * as T from 'three';
import {CRAFTS} from '../content/apprentice.js';

export function buildCraftTray(s){
 const tray=new T.Group();tray.position.set(-3.2,1,1.62);s.scene.add(tray);tray.userData.station='craft';
 s.box(1.75,.16,1.48,0,0,0,s.wood,tray);
 for(const x of [-.65,.65])for(const z of [-.5,.5])s.box(.10,1,.10,x,-.5,z,s.darkwood,tray);
 s.registerTarget('station-craft',tray,'工序盒','village');
 const notebook=s.box(.40,.065,.31,0,.11,.72,s.paper,tray);s.registerTarget('fieldbook',notebook,'学习手札','craft');
 const cream=s.material('#edd7ac'),blue=s.material('#295467'),red=s.material('#a85439');
 const groups=CRAFTS.map((c,i)=>{
  const g=new T.Group();g.position.set(i%2?.45:-.45,.10,i<2?-.38:.37);tray.add(g);
  s.registerTarget('craft-'+c.tool,g,c.name,'craft');
  return g;
 });
 const [spindle,vat,frame,hoop]=groups;
 s.cylinder(.04,.67,0,.31,0,s.wood,spindle);s.cylinder(.17,.065,0,.19,0,s.darkwood,spindle);
 for(let j=0;j<8;j++)s.cylinder(.12-j*.009,.03,0,.25+j*.026,0,cream,spindle);
 for(let j=0;j<4;j++){const fluff=new T.Mesh(new T.IcosahedronGeometry(.082,1),cream);fluff.position.set(-.18+j*.04,.08,.09+Math.cos(j)*.05);spindle.add(fluff);}
 s.cylinder(.20,.29,0,.15,0,red,vat);s.cylinder(.178,.018,0,.30,0,blue,vat);
 const rim=new T.Mesh(new T.TorusGeometry(.196,.024,8,24),s.wood);rim.rotation.x=Math.PI/2;rim.position.y=.30;vat.add(rim);
 for(const x of [-.22,.22])s.box(.035,.34,.42,x,.17,0,s.wood,frame);
 for(const z of [-.19,.19])s.box(.47,.04,.04,0,.29,z,s.darkwood,frame);
 for(let j=0;j<8;j++)s.box(.018,.017,.39,-.18+j*.052,.30,0,cream,frame);
 for(let j=0;j<4;j++)s.box(.41,.014,.025,0,.32,.16-j*.057,blue,frame);
 s.cylinder(.21,.04,0,.15,0,cream,hoop);
 const band=rim.clone();band.material=s.wood;band.position.y=.18;hoop.add(band);
 for(let j=0;j<5;j++){const stitch=s.box(.11,.009,.018,-.055+j*.027,.18,.04-j*.018,red,hoop);stitch.rotation.y=.75;}
 const needle=s.cylinder(.009,.23,.1,.28,0,s.metal,hoop);needle.rotation.z=-.31;
 // A material specimen stays on the tray while the learner chooses a tool.
 const sample=new T.Group();sample.position.set(0,.14,0);tray.add(sample);
 s.box(.50,.044,.33,0,-.025,0,s.darkwood,sample);
 const specimens=Array.from({length:5},()=>{const group=new T.Group();sample.add(group);return group;});
 for(let i=0;i<5;i++){
  const puff=new T.Mesh(new T.IcosahedronGeometry(.072,1),cream);
  puff.position.set((i-2)*.052,.055,.035*Math.cos(i));specimens[0].add(puff);
 }
 for(const step of [1,2]){
  for(let j=0;j<5;j++){
   const strand=new T.Mesh(new T.TorusGeometry(.091,.016,5,18),step===1?cream:blue);
   strand.rotation.x=Math.PI/2;strand.scale.x=1.6;strand.position.set(0,.026+j*.014,0);specimens[step].add(strand);
  }
 }
 for(const step of [3,4]){
  for(let col=0;col<7;col++)s.box(.038,.019,.24,-.15+col*.05,.026,0,cream,specimens[step]);
  for(let row=0;row<5;row++)for(let col=0;col<7;col++)
   s.box(.049,.014,.032,-.15+col*.05,(row+col)%2?.046:.016,-.096+row*.048,blue,specimens[step]);
  if(step===4)for(let i=0;i<5;i++){const stitch=s.box(.09,.009,.018,-.065+i*.031,.060,-.036+i*.016,red,specimens[step]);stitch.rotation.y=.55;}
 }
 return done=>{
  groups.forEach((g,i)=>g.scale.setScalar(i===done-1?1.10:1));
  specimens.forEach((specimen,i)=>{specimen.visible=i===done;});
 };
}
