const UPSTREAM = 'https://api.tije.info/buses';
const HEALTH = 'tije-sse-proxy-v6';
const JSON_HEADERS = {'Cache-Control':'no-store, no-transform','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
function asJson(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:JSON_HEADERS})}
async function getHeaders(abortSignal){
 return fetch(UPSTREAM,{headers:{'Accept':'text/event-stream','Cache-Control':'no-cache'},cache:'no-store',signal:abortSignal});
}
export default async function handler(request){
 const url=new URL(request.url);
 if(request.method!=='GET')return asJson({error:'Only GET is allowed'},405);
 if(url.searchParams.get('health')==='1')return asJson({service:HEALTH,source:UPSTREAM,proxy:true});
 if(url.searchParams.get('diagnose')==='1'){
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort('diagnostic timeout'),10000);
  let response;
  try{
    response=await getHeaders(controller.signal);
    const ct=response.headers.get('content-type')||'';
    const result={ok:response.ok && ct.includes('text/event-stream'),upstream:UPSTREAM,upstreamStatus:response.status,contentType:ct,validSse:response.ok && ct.includes('text/event-stream'),firstChunkBytes:0,sampleEvent:''};
    if(result.validSse&&response.body){
      const reader=response.body.getReader();
      try{
        // Sampling one chunk verifies that the upstream delivers bytes, not only HTTP headers.
        // Timeout aborts reader.read() if the server remains silent.
        const read=await Promise.race([reader.read(),new Promise(resolve=>setTimeout(()=>resolve({done:true,timeout:true}),2500))]);
        if(read && read.value){
          result.firstChunkBytes=read.value.byteLength;
          const txt=new TextDecoder().decode(read.value);
          result.sampleEvent=txt.slice(0,180).replace(/[\r\n]+/g,' ').replace(/[\x00-\x1f]/g,'');
          // Avoid leaking full payload to diagnostics.
        }
      }finally{try{await reader.cancel()}catch{}}
    }else{try{await response.body?.cancel()}catch{}}
    return asJson(result,200);
  }catch(err){return asJson({ok:false,upstream:UPSTREAM,upstreamStatus:0,validSse:false,error:err?.name==='AbortError'?'API upstream tidak menjawab dalam 10 detik':String(err)},502)}
  finally{clearTimeout(timeout)}
 }
 try{
  const upstream=await getHeaders(request.signal);
  if(!upstream.ok){try{await upstream.body?.cancel()}catch{}return asJson({error:'API sumber mengembalikan HTTP '+upstream.status,upstream:UPSTREAM},upstream.status)}
  const ct=upstream.headers.get('content-type')||'';
  if(!ct.includes('text/event-stream')){
    try{await upstream.body?.cancel()}catch{}
    return asJson({error:'Format tidak sesuai: diharapkan SSE, ternyata '+ct,upstream:UPSTREAM},502)
  }
  return new Response(upstream.body,{status:200,headers:{
   'Content-Type':'text/event-stream; charset=utf-8',
   'Cache-Control':'no-cache, no-transform',
   'X-Accel-Buffering':'no',
   'X-Content-Type-Options':'nosniff'
  }});
 }catch(err){return asJson({error:'Koneksi Netlify → api.tije.info gagal',detail:String(err),upstream:UPSTREAM},502)}
}
