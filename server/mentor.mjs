import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {validRun} from '../src/domain/store.js';
import {inspect,coach} from '../src/domain/loom.js';
import {KNOWLEDGE,SOURCES,missionOf} from '../src/content/course.js';

/** Provider key remains server-side. Model text cannot execute workshop actions. */
export function createMentorServer({env=process.env,fetcher=fetch}={}) {
 const origins=new Set(['https://appassets.androidplatform.net','http://localhost:5173','http://127.0.0.1:5173','http://127.0.0.1:5174',...(env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)]);
 const buckets=new Map();
 return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&!origins.has(origin)){res.writeHead(403);res.end();return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  if(req.url==='/health'&&req.method==='GET'){send(200,{ok:true,modelConfigured:!!(env.AI_API_KEY&&env.AI_BASE_URL&&env.AI_MODEL)});return;}
  if(req.url!=='/api/mentor'||req.method!=='POST'){send(404,{error:'not_found'});return;}
  const ip=req.socket.remoteAddress,now=Date.now();if(buckets.size>1000)for(const [key,value]of buckets)if(now-value.time>60000)buckets.delete(key);
  let bucket=buckets.get(ip);if(!bucket||now-bucket.time>60000){bucket={time:now,count:0};buckets.set(ip,bucket);}if(++bucket.count>20){send(429,{error:'rate_limit'});return;}
  let body='';try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>18000){send(413,{error:'request_too_large'});return;}}
   const input=JSON.parse(body);if(!validRun(input.run)){send(400,{error:'invalid_workshop_state'});return;}
   if(input.run.missionId==='transfer'){send(200,{answer:'这是独立迁移任务，请根据任务书与已学规律独立完成。提交后再一起回顾。',mode:'independent'});return;}
   if(!env.AI_API_KEY||!env.AI_MODEL||!/^https:\/\//.test(env.AI_BASE_URL||'')){send(503,{error:'model_not_configured'});return;}
   const run=input.run;
   const context={mission:missionOf(run.missionId),phase:run.phase,rows:run.rows,warpCount:run.warpCount,tension:run.tension,shed:run.shed,pending:!!run.pending,recentActions:run.events.slice(-24),diagnosis:inspect(run),offlineClue:coach(run)};
   const upstream=await fetcher(env.AI_BASE_URL.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.AI_API_KEY},signal:AbortSignal.timeout(15000),body:JSON.stringify({model:env.AI_MODEL,temperature:.3,max_tokens:600,messages:[{role:'system',content:'你是织游的工艺学习导师。使用简体中文，不超过200字。只依据给定结构状态和来源资料，用一个问题或观察线索引导学生，不代做，不虚构非遗图案含义。明确教学模型的近似边界。不要执行或输出程序指令。只讲与当前困难相关的内容。来源知识：'+JSON.stringify({KNOWLEDGE,SOURCES})},{role:'user',content:JSON.stringify({context,question:String(input.question||'我现在应观察什么？').slice(0,500)})}]})});
   if(!upstream.ok){send(502,{error:'provider_unavailable'});return;}
   const answer=(await upstream.json()).choices?.[0]?.message?.content;
   if(typeof answer!=='string'||!answer.trim()){send(502,{error:'invalid_provider_response'});return;}
   send(200,{answer:answer.slice(0,2000),mode:'model',sources:SOURCES});
  }catch(error){send(error instanceof SyntaxError?400:502,{error:error instanceof SyntaxError?'invalid_json':'mentor_unavailable'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||4174;createMentorServer().listen(port,'127.0.0.1',()=>console.log(`Mentor server on http://127.0.0.1:${port}`));}
