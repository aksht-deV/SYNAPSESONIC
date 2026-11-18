type Landmark = { x: number; y: number }
const clamp = (v: number) => Math.max(0, Math.min(1, v))

export function handPointer(cursor: HTMLElement, status: (text: string) => void, orbit: (dx:number,dy:number)=>void, decay: (v:number)=>void) {
  let x = 0, y = 0, seen = false, armed = false, held = false, closeFrames = 0
  let target: HTMLElement | null = null, hover: HTMLElement | null = null
  function highlight(el: HTMLElement | null) {
    if (hover === el) return
    hover?.removeAttribute('data-hand-hover'); hover = el
    hover?.setAttribute('data-hand-hover', '')
  }
  function reset() {
    cursor.hidden = true; seen = armed = held = false; closeFrames = 0; target = null; highlight(null)
  }
  function frame(points: Landmark[] | undefined, aspect:number) {
    if (!points?.length) { reset(); status('Show one hand'); return }
    const d = (i:number,j:number)=>Math.hypot((points[i].x-points[j].x)*aspect,points[i].y-points[j].y)
    const ratio=d(4,8)/Math.max(.02,d(5,17)), open=ratio>.48, closed=ratio<.29
    const aimX=clamp((.91-points[8].x)/.82)*(innerWidth-1), aimY=clamp((points[8].y-.09)/.82)*(innerHeight-1)
    const lastX=x,lastY=y; x=seen?x+(aimX-x)*.55:aimX; y=seen?y+(aimY-y)*.55:aimY; seen=true
    cursor.hidden=false;cursor.style.left=`${x}px`;cursor.style.top=`${y}px`
    const hit=document.elementFromPoint(x,y); const candidate=hit?.closest<HTMLElement>('button:not(:disabled),a[href],input[type=range],.decay,.neural-space canvas')??null
    const item=candidate?.closest('.studio')?candidate:null
    highlight(held?target:item)
    if(open){armed=true;held=false;target=null;closeFrames=0}
    closeFrames=closed?closeFrames+1:0
    if(armed&&!held&&closeFrames>=2){
      armed=false;held=true;target=item
      if(target?.matches('.upload')){status('Click Upload PDF to open the file picker');return}
      if(target?.matches('button,a'))target.click()
    }
    cursor.dataset.held=String(held)
    if(held&&target?.closest('.decay')){const rect=document.querySelector('#decay')!.getBoundingClientRect();decay(Math.round(clamp((x-rect.left)/rect.width)*100));status('Adjusting Time-Decay')}
    else if(held&&target?.matches('canvas')){orbit(x-lastX,y-lastY);status('Orbiting field')}
    else if(held&&target?.matches('.upload'))status('Click Upload PDF to choose a file')
    else if(!held && (y<22 || y>innerHeight-22) && !item){window.scrollBy(0,y<22?-16:16);status('Scrolling')}
    else status(held?'Release to rearm':armed?'Point & pinch':'Open thumb and index')
  }
  return {frame,reset}
}
