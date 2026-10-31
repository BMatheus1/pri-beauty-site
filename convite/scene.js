import {handoff,renderedVideoBox} from './handoff-config.js';
export async function createScene(container){
  container.innerHTML=`<div class="film-frame"><video class="opening-film" playsinline muted preload="metadata" poster="./assets/opening-poster.webp?v=sem-marca-3" aria-hidden="true"><source src="./assets/opening.mp4?v=sem-marca-3" type="video/mp4"></video><span class="film-loading" role="status" hidden>Carregando abertura…</span><button class="film-sound" type="button" aria-pressed="false">Ativar som</button></div>`;
  const frame=container.querySelector('.film-frame'),video=container.querySelector('video'),loading=container.querySelector('.film-loading'),sound=container.querySelector('.film-sound');
  let settle=null,watchdog=null,frameCallback=null,prepared=false,onPrepare=null,handoffActive=false;
  const nativeFrames=typeof video.requestVideoFrameCallback==='function';
  function cancelFrame(){if(frameCallback!==null&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameCallback);frameCallback=null;}
  function finish(kind,mediaTime=video.currentTime){if(!settle)return;const resolve=settle;settle=null;clearTimeout(watchdog);cancelFrame();loading.hidden=true;video.pause();handoffActive=kind==='handoff'||kind==='ended';frame.dataset.handoffTime=String(mediaTime);resolve({kind,mediaTime});}
  function synchronize(time){if(!settle)return;if(!prepared&&time>=handoff.prepareTime){prepared=true;onPrepare?.();}if(time>=handoff.time-.001)finish('handoff',time);}
  function presented(now,metadata){frameCallback=null;synchronize(metadata.mediaTime);if(settle)frameCallback=video.requestVideoFrameCallback(presented);}
  const stalled=()=>{if(!settle)return;loading.hidden=false;clearTimeout(watchdog);watchdog=setTimeout(()=>finish('stalled'),10000);};
  const progressing=()=>{if(!settle)return;loading.hidden=true;clearTimeout(watchdog);watchdog=setTimeout(()=>finish('stalled'),10000);if(!nativeFrames)synchronize(video.currentTime);};
  const ended=()=>finish('ended'),failed=()=>finish('error');
  video.addEventListener('ended',ended);video.addEventListener('error',failed);video.addEventListener('waiting',stalled);video.addEventListener('playing',progressing);video.addEventListener('timeupdate',progressing);
  sound.addEventListener('click',()=>{video.muted=!video.muted;sound.textContent=video.muted?'Ativar som':'Silenciar';sound.setAttribute('aria-pressed',String(!video.muted));});
  function play(options={}){return new Promise(resolve=>{settle=resolve;onPrepare=options.onPrepare;prepared=false;handoffActive=false;if(video.error){finish('error');return;}if(nativeFrames)frameCallback=video.requestVideoFrameCallback(presented);stalled();video.play().catch(()=>finish('blocked'));});}
  function reset(){finish('cancelled');cancelFrame();video.pause();try{video.currentTime=0;}catch{}video.muted=true;handoffActive=false;prepared=false;onPrepare=null;delete frame.dataset.handoffTime;sound.textContent='Ativar som';sound.setAttribute('aria-pressed','false');loading.hidden=true;}
  function invitationPose(ratio,p){
    const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
    const box=renderedVideoBox(video.getBoundingClientRect(),video.videoWidth||handoff.sourceWidth,video.videoHeight||handoff.sourceHeight,getComputedStyle(video).objectFit);
    const project=(x,y)=>({x:box.left+x*box.scale,y:box.top+y*box.scale});
    const lift=smooth(p/.62)*handoff.cardBounds.width*.95;
    const y=handoff.cardBounds.y-lift,width=handoff.cardBounds.width,height=width*ratio;
    return {corners:[project(0,y),project(width,y-2),project(width,y-2+height),project(0,y+height)],edge:[project(...handoff.mouth[0]),project(...handoff.mouth.at(-1))],mouth:handoff.mouth.map(point=>project(...point)),paper:handoffActive?handoff.paperImage:null,paperColor:handoff.paperColor};
  }
  return{play,skip(){finish('skipped');},reset,invitationPose,get handoffActive(){return handoffActive;},ready:Promise.resolve(),dispose(){finish('disposed');cancelFrame();for(const [name,fn] of [['ended',ended],['error',failed],['waiting',stalled],['playing',progressing],['timeupdate',progressing]])video.removeEventListener(name,fn);clearTimeout(watchdog);video.removeAttribute('src');video.querySelector('source')?.remove();video.load();container.replaceChildren();}};
}
