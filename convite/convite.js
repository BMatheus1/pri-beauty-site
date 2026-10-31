import {event,mapsUrl} from './config.js';
import {createReveal} from './reveal.js';
const $=s=>document.querySelector(s),intro=$('#intro'),card=$('#card'),open=$('#open'),envelope=$('#envelope'),stage=$('#stage'),skip=$('#skip-opening');
const sheet=createReveal(card,intro,stage),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state='closed',scene=null,timeline=null,generation=0,phaseProgress=0,skipRequested=false;
function setState(next){state=next;document.body.dataset.state=next;document.dispatchEvent(new CustomEvent('invite-state',{detail:next}));}
$('#address').textContent=event.address;$('#maps').href=mapsUrl;
function reveal(){sheet.finish();intro.hidden=true;card.hidden=false;skip.hidden=true;setState('opened');card.tabIndex=-1;card.focus({preventScroll:true});}
function animateCard(){return new Promise(resolve=>{const model={p:0};const paint=()=>{phaseProgress=model.p;if(model.p>=.62&&state==='card-extracting')setState('card-expanding');sheet.update(model.p,scene);};if(window.gsap){timeline=gsap.to(model,{p:1,duration:3.4,ease:'none',onUpdate:paint,onComplete:resolve});}else{const start=performance.now();let frame;const tick=now=>{model.p=Math.min(1,(now-start)/3400);paint();if(model.p<1)frame=requestAnimationFrame(tick);else resolve();};frame=requestAnimationFrame(tick);timeline={kill:()=>cancelAnimationFrame(frame)};}});}
async function start(){if(state!=='closed')return;const run=++generation;skipRequested=false;open.disabled=true;envelope.disabled=true;window.scrollTo({top:0,behavior:'instant'});if(reduced.matches){reveal();return;}
document.fonts.load('400 16px Lora').catch(()=>{});setState('video-playing');skip.hidden=false;await sceneReady;if(run!==generation)return;const result=skipRequested?{kind:'skipped'}:await scene.play({onPrepare(){setState('handoff-preparing');sheet.prepare();}});if(run!==generation)return;skip.hidden=true;
if(result.kind==='blocked'||result.kind==='error'||result.kind==='stalled'){document.body.dataset.videoFallback=result.kind;}
await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,900))]);if(run!==generation)return;
setState('handoff');sheet.begin();sheet.update(0,scene);setState('card-extracting');await animateCard();if(run===generation)reveal();}
function reset(){generation++;timeline?.kill();sheet.reset();intro.hidden=false;scene?.reset();open.disabled=false;envelope.disabled=false;skip.hidden=true;delete document.body.dataset.videoFallback;setState('closed');open.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
open.addEventListener('click',start);envelope.addEventListener('click',start);skip.addEventListener('click',()=>{skipRequested=true;scene?.skip();});$('#replay').addEventListener('click',reset);
$('#share').addEventListener('click',async()=>{const url=new URL('./',location.href).href;try{if(navigator.share)await navigator.share({title:document.title,text:'Um momento especial espera por você.',url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);$('#share-status').textContent='Link copiado!';}else $('#share-status').textContent=`Copie este link: ${url}`;}catch(error){if(error.name!=='AbortError')$('#share-status').textContent=`Copie este link: ${url}`;}});
const sceneReady=import('./scene.js').then(async module=>{scene=await module.createScene($('#scene'));$('#scene').hidden=false;document.body.classList.add('film-ready');}).catch(()=>{scene={play:async()=>({kind:'error'}),reset(){},skip(){},invitationPose(){return null;}};});
addEventListener('resize',()=>{if(state==='card-extracting'||state==='card-expanding'||state==='handoff')sheet.resize(scene);});
addEventListener('pagehide',event=>{if(event.persisted){reset();return;}generation++;timeline?.kill();scene?.dispose?.();scene=null;sheet.dispose();});setState('closed');
