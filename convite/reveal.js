import {handoff} from './handoff-config.js';
// A single live HTML article is projected onto the physical sheet, then returned
// to normal document flow at precisely the same viewport rectangle.
export function createReveal(card,intro,stage){
const anchor=document.createComment('invitation-home');card.before(anchor);
const mask=document.createElement('div');mask.className='invitation-mask';mask.hidden=true;document.body.append(mask);
const plate=new Image();plate.className='handoff-paper';plate.alt='';plate.src=handoff.paperImage;plate.hidden=true;card.querySelector('.card-inner').append(plate);
let box=null,progress=0,active=false,stageTop=0,stageShift=0;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function measure(){const hidden=intro.hidden;intro.hidden=true;anchor.after(card);card.removeAttribute('style');card.hidden=false;box=card.getBoundingClientRect();intro.hidden=hidden;mask.append(card);card.style.width=`${box.width}px`;card.style.position='absolute';card.style.margin='0';card.style.top='0';card.style.left='0';card.style.transformOrigin='0 0';}
function begin(){active=true;progress=0;stageTop=stage.getBoundingClientRect().top;stageShift=0;measure();mask.hidden=false;card.inert=true;document.body.classList.add('extracting');}
function fallbackPose(){const b=stage.getBoundingClientRect(),paper=stage.querySelector('.paper').getBoundingClientRect(),width=paper.width*.92,top=paper.top-progress*160;return {corners:[{x:paper.left+paper.width*.04,y:top},{x:paper.left+paper.width*.04+width,y:top},{x:paper.left+paper.width*.04+width,y:top+card.offsetHeight*width/box.width},{x:paper.left+paper.width*.04,y:top+card.offsetHeight*width/box.width}],edge:[{x:b.left,y:paper.top},{x:b.right,y:paper.top}]};}
function matrix(c,w,h){const [a,b,c2,d]=c;const dx1=b.x-c2.x,dx2=d.x-c2.x,dx3=a.x-b.x+c2.x-d.x,dy1=b.y-c2.y,dy2=d.y-c2.y,dy3=a.y-b.y+c2.y-d.y;const den=dx1*dy2-dx2*dy1;let g=0,k=0;if(Math.abs(den)>1e-8){g=(dx3*dy2-dx2*dy3)/den;k=(dx1*dy3-dx3*dy1)/den;}return `matrix3d(${(b.x-a.x+g*b.x)/w},${(b.y-a.y+g*b.y)/w},0,${g/w},${(d.x-a.x+k*d.x)/h},${(d.y-a.y+k*d.y)/h},0,${k/h},0,0,1,0,${a.x},${a.y},0,1)`;}
function update(p,scene){if(!active)return;progress=p;const clearance=smooth((p-.52)/.48);stageShift=clearance*(innerHeight-stageTop+180);stage.style.transform=`translateY(${stageShift}px)`;const pose=scene?.invitationPose(card.offsetHeight/box.width,p)||fallbackPose();const settle=smooth((p-.62)/.38),height=card.offsetHeight;
const target=[{x:box.left,y:box.top},{x:box.right,y:box.top},{x:box.right,y:box.top+height},{x:box.left,y:box.top+height}];
const corners=pose.corners.map((v,i)=>({x:lerp(v.x,target[i].x,settle),y:lerp(v.y-stageShift,target[i].y,settle)}));card.style.transform=matrix(corners,box.width,height);
// Opening stays at the envelope lip until the sheet clears it. The lip then
// travels downward, progressively uncovering the printed message.
const edge=pose.edge;const left=edge[0].y,right=edge[1].y;
if(pose.mouth){const points=[...pose.mouth].reverse().map(v=>`${v.x}px ${v.y}px`).join(',');mask.style.clipPath=`polygon(0 0,100% 0,100% ${right}px,${points},0 ${left}px)`;}else mask.style.clipPath=`polygon(0 0,100% 0,100% ${right}px,0 ${left}px)`;
const ink=smooth((p-.12)/.38),material=smooth((p-.015)/.18);plate.hidden=!pose.paper;plate.style.opacity=String(1-material);
card.style.setProperty('--print-opacity',String(ink));card.style.setProperty('--edge-opacity',String(ink));card.style.setProperty('--shadow-opacity',String(p*.13));
const rgb=(pose.paperColor||handoff.paperColor).map(c=>Math.round(lerp(c,255,material)));card.style.setProperty('--sheet-paper',`rgb(${rgb.join(' ')})`);

const copy=intro.querySelector('h1'),eyebrow=intro.querySelector('.eyebrow');copy.style.opacity=String(1-smooth(p/.25));eyebrow.style.opacity=copy.style.opacity;
card.style.setProperty('--sheet-shadow',`${lerp(0,30,settle)}px`);
card.dataset.extraction=String(p.toFixed(3));
}
function finish(){if(!active)return;plate.hidden=true;card.style.transform=`translate(${box.left}px,${box.top}px)`;intro.hidden=true;anchor.after(card);card.removeAttribute('style');card.inert=false;mask.hidden=true;mask.style.clipPath='';active=false;document.body.classList.remove('extracting');stage.style.transform='';intro.querySelector('h1').style.opacity='';intro.querySelector('.eyebrow').style.opacity='';}
function reset(){plate.hidden=true;active=false;anchor.after(card);card.hidden=true;card.inert=false;card.removeAttribute('style');delete card.dataset.extraction;mask.hidden=true;mask.style.clipPath='';document.body.classList.remove('extracting');stage.style.transform='';intro.querySelector('h1').style.opacity='';intro.querySelector('.eyebrow').style.opacity='';}
return{prepare(){measure();card.inert=true;},begin,update,finish,reset,resize(scene){if(active){stageTop=stage.getBoundingClientRect().top-stageShift;measure();update(progress,scene);}},dispose(){reset();mask.remove();anchor.remove();}};
}
