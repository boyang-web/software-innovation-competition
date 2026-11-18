import {warpColor,yarnOf,THREADS} from '../domain/loom.js';
/** Actual committed crossings, colors and packing determine this texture. No preset substitution. */
export function drawFabric(run,{size=384,repeat=1,highlight=-1}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d');c.fillStyle='#e5d9bd';c.fillRect(0,0,size,size);
 if(!run?.rows.length){c.fillStyle='#b9ac91';c.font='16px sans-serif';c.textAlign='center';c.fillText('织出的每一纬都会出现在这里',size/2,size/2);return canvas;}
 const all=run.rows.length*repeat,w=size/(THREADS*repeat),h=size/all;
 for(let y=0;y<all;y++){
  const row=run.rows[y%run.rows.length],slack=(row.tension-60)/140,edge=Math.max(0,slack)*size*.16;
  const gap=Math.max(.08,(100-row.beat)/220)*h;
  for(let x=0;x<THREADS*repeat;x++){
   const col=x%THREADS,px=edge+x*w*(1-edge*2/size),cw=w*(1-edge*2/size);
   c.fillStyle=warpColor(run,col);c.fillRect(px,y*h,cw,h);
   c.fillStyle=yarnOf(row.yarn).color;c.fillRect(px,y*h+gap/2,cw,h-gap);
   if(row.mask[col]){c.fillStyle=warpColor(run,col);c.fillRect(px+cw*.12,y*h,cw*.76,h);}
   c.fillStyle='rgba(255,255,255,.18)';if(row.mask[col])c.fillRect(px+cw*.2,y*h,cw*.12,h);else c.fillRect(px,y*h+gap/2+1,cw,Math.max(1,h*.1));
   // Fiber highlights follow the thread that is actually on top.
   c.strokeStyle='rgba(255,246,211,.25)';c.lineWidth=Math.max(.5,size/720);
   c.beginPath();
   for(let fiber=1;fiber<5;fiber++){
    if(row.mask[col]){const fx=px+cw*(.14+fiber*.14);c.moveTo(fx,y*h);c.lineTo(fx+cw*.06,(y+1)*h);}
    else{const fy=y*h+gap/2+(h-gap)*fiber/5;c.moveTo(px,fy);c.lineTo(px+cw,fy+h*.035);}
   }
   c.stroke();
   c.fillStyle='rgba(36,30,20,.16)';c.fillRect(px+cw*.9,y*h,cw*.1,h);
  }
  if(y%run.rows.length===highlight){c.strokeStyle='#efb84f';c.lineWidth=3;c.strokeRect(1,y*h,size-2,h);}
 }
 return canvas;
}
export function drawDraft(canvas,run,selected=-1){
 const c=canvas.getContext('2d'),w=canvas.width/THREADS,h=canvas.height/Math.max(8,run.rows.length);c.fillStyle='#e9e0cb';c.fillRect(0,0,canvas.width,canvas.height);
 run.rows.forEach((row,y)=>row.mask.forEach((up,x)=>{c.fillStyle=up?warpColor(run,x):yarnOf(row.yarn).color;c.fillRect(x*w+1,y*h+1,w-2,h-2);if(y===selected){c.strokeStyle='#de9c37';c.lineWidth=2;c.strokeRect(x*w+1,y*h+1,w-2,h-2);}}));
}

// Distance along the woven strip, from the fell, around the front beam, then down.
export function clothPoint(distance){
 const approach=.77,radius=.145,base=1.67;
 if(distance<=approach)return {y:base,z:.36+distance};
 const angle=Math.min(Math.PI/2,(distance-approach)/radius);
 return {y:base-radius*(1-Math.cos(angle))-Math.max(0,distance-approach-radius*Math.PI/2),z:.36+approach+radius*Math.sin(angle)};
}
