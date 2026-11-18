/** Resolve gestures attached to a physical object, never to arbitrary screen swipes. */
export const packingForce=dy=>Math.max(20,Math.min(95,Math.round(dy*.8)));
export function resolveGesture(target,dx,dy,initial={}){
 const distance=Math.hypot(dx,dy);
 if(target==='warp-thread')return dy< -40&&distance>50?{tool:'op-warp'}:{hint:'从线头向织机后方拉出一组经线。'};
 if(target==='shuttle'){
  if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.3)return {hint:'按住梭子，横向拖到织机另一侧。'};
  return {tool:dx>0?'throw-right':'throw-left'};
 }
 if(target==='beater')return dy>40&&dy>Math.abs(dx)*1.2?{tool:'op-beat',value:packingForce(dy)}:{hint:'按住打纬杆，向自己这一侧拉下。'};
 if(target==='tension')return distance>10?{tool:'set-tension',value:Math.max(15,Math.min(95,Math.round((initial.tension??60)+dx*.45)))}:{hint:'左右拖动经轴旋钮，调整经线张力。'};
 if(distance>15)return {cancelled:true};
 return {tool:target};
}
