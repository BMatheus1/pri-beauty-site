// Manual calibration from FFmpeg frame 186 (7.750 s) of the supplied 8 s video.
// Coordinates are source pixels, independent of viewport size. Inspect reference
// assets/handoff-frame.png when adjusting a replacement film.
export const handoff = Object.freeze({
  time:7.75,prepareTime:7.15,sourceWidth:768,sourceHeight:1366,
  cardBounds:{x:0,y:513,width:768,visibleHeight:410},
  cardCorners:[[0,513],[768,511],[768,923],[0,923]],
  mouth:[[0,739],[201,922],[531,922],[768,698]],
  paperImage:'./assets/handoff-card-top.webp',
  frameImage:'./assets/handoff-frame.png',
  paperColor:[214,208,196]
});
export function renderedVideoBox(rect,width,height,fit='contain'){
  const scale=fit==='cover'?Math.max(rect.width/width,rect.height/height):Math.min(rect.width/width,rect.height/height);
  const w=width*scale,h=height*scale;
  return {left:rect.left+(rect.width-w)/2,top:rect.top+(rect.height-h)/2,width:w,height:h,scale};
}
