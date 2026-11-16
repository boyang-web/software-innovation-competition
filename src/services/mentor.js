import {KNOWLEDGE,missionOf} from '../content/course.js';
export async function askMentor(endpoint,run){
 if(!/^https:\/\//.test(endpoint))throw new Error('模型服务必须使用 HTTPS。');
 const context={...run,events:run.events.slice(-24)};
 const response=await fetch(endpoint+'/api/mentor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run:context,question:'请结合我的操作解释当前困难，用一个观察线索引导我自己理解。'}),signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw new Error(response.status===503?'模型服务尚未配置密钥或模型，已保留离线诊断。':'导师服务暂时不可用，离线操作与诊断不受影响。');
 const result=await response.json();if(typeof result.answer!=='string'||!result.answer.trim())throw new Error('导师没有返回有效讲解。');return result.answer.slice(0,2000);
}
