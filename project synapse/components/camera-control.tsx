'use client'
import {useEffect,useRef,useState} from 'react'
import {Camera,ChevronDown,Hand,LockKeyhole,Move,Pointer,Power,X} from 'lucide-react'
import type {HandLandmarker} from '@mediapipe/tasks-vision'
import {createPortal} from 'react-dom'
import {handPointer} from './hand-pointer'
import './camera-control.css'

type Props={orbit:(dx:number,dy:number)=>void;decay:(v:number)=>void}
const wasm='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
export function CameraControl({orbit,decay}:Props){
 const [open,setOpen]=useState(false),[phase,setPhase]=useState<'off'|'loading'|'live'>('off'),[message,setMessage]=useState(''),[hint,setHint]=useState('Show one hand'),[mounted,setMounted]=useState(false)
 const video=useRef<HTMLVideoElement>(null),cursor=useRef<HTMLDivElement>(null),cleanup=useRef<()=>void>(()=>{}),generation=useRef(0),actions=useRef({orbit,decay})
 useEffect(()=>{actions.current={orbit,decay}},[orbit,decay])
 function stop(){generation.current++;cleanup.current();cleanup.current=()=>{};setPhase('off');setHint('Show one hand')}
 useEffect(()=>{setMounted(true);const hide=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);return()=>{generation.current++;cleanup.current();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop)}},[])
 async function start(){
   stop();const token=generation.current,valid=()=>token===generation.current;setMessage('');setPhase('loading');setOpen(true)
   const el=video.current!;let stream:MediaStream|undefined,model:HandLandmarker|undefined,raf=0
   const pointer=handPointer(cursor.current!,setHint,(x,y)=>actions.current.orbit(x,y),v=>actions.current.decay(v))
   cleanup.current=()=>{cancelAnimationFrame(raf);stream?.getTracks().forEach(track=>track.stop());el.pause();el.srcObject=null;model?.close();pointer.reset()}
   const fail=(text:string)=>{if(valid()){stop();setMessage(text);setOpen(true)}}
   try{
     if(!navigator.mediaDevices?.getUserMedia){fail('Camera access requires HTTPS and a browser with webcam support.');return}
     stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:30}},audio:false})
     if(!valid()){stream.getTracks().forEach(t=>t.stop());return}
     stream.getVideoTracks()[0].addEventListener('ended',()=>fail('Camera disconnected. Reconnect it and try again.'),{once:true});el.srcObject=stream;await el.play();if(!valid())return
     setHint('Loading hand tracker');const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');if(!valid())return
     const files=await FilesetResolver.forVisionTasks(wasm);if(!valid())return
     model=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/hand_landmarker.task'},runningMode:'VIDEO',numHands:1,minTrackingConfidence:.65});if(!valid()){model.close();return}
     setPhase('live');setHint('Show one hand');setOpen(false);let prev=-1,last=0
     function detect(now:number){if(!valid())return;try{if(now-last>=65&&el.readyState>=2&&el.currentTime!==prev){prev=el.currentTime;last=now;const result=model!.detectForVideo(el,now);pointer.frame(result.landmarks[0],el.videoWidth/el.videoHeight)}if(valid())raf=requestAnimationFrame(detect)}catch{fail('Tracking was interrupted. Restart the camera to reconnect.')}}
     raf=requestAnimationFrame(detect)
   }catch(e){const name=e instanceof Error?e.name:'';fail(name==='NotAllowedError'?'Camera permission is blocked. Allow camera access in your browser, or open this workspace in its own tab.':name==='NotFoundError'?'No camera found. Connect a webcam and try again.':name==='NotReadableError'?'The camera is busy. Close other camera apps and try again.':'Could not start hand tracking. Check your camera and internet connection, then retry.')}
 }
 return <div className="cam-dock"><button className="cam-toggle" aria-expanded={open} aria-controls="camera-guide" onClick={()=>setOpen(!open)}><span className={'cam-icon '+(phase==='live'?'is-live':'')}><Camera size={18}/></span><span><small>SPATIAL INPUT</small><strong>Hand controls</strong></span><ChevronDown size={13} style={{transform:open?'rotate(180deg)':''}}/></button>
 <video ref={video} muted playsInline autoPlay aria-label="Mirrored local camera preview" className={'cam-preview '+(phase==='live'&&open?'show':'')}/>
 {phase==='live'&&!open&&<div className="cam-live"><span><i className="dot"/>{hint}</span><button aria-label="Stop camera" onClick={stop}><Power size={13}/></button></div>}
 {open&&<section className="cam-guide" id="camera-guide" aria-label="Hand control settings"><div className="cam-title"><small>GESTURE GUIDE</small><button aria-label="Close gesture guide" onClick={()=>setOpen(false)}><X size={13}/></button></div><div className="cam-row"><Pointer/><div><b>Point to aim</b><p>Move your index finger to steer the cursor.</p></div></div><div className="cam-row"><Hand/><div><b>Pinch to select</b><p>Touch thumb to index on any control. Release before the next selection.</p></div></div><div className="cam-row"><Move/><div><b>Hold and move</b><p>Drag the starfield to orbit, or the slider to change decay. Aim at the screen edges to scroll.</p></div></div><div className="cam-private"><LockKeyhole size={12}/>On-device only · No audio or recording</div>
 {message&&<p className="cam-error" role="alert">{message}</p>}{phase==='loading'&&<p role="status" className="cam-error">{hint==='Loading hand tracker'?hint:'Waiting for camera permission…'}</p>}
 <button className="cam-action" onClick={phase==='off'?start:stop}>{phase==='off'?<Camera size={14}/>:<Power size={14}/>} {phase==='off'?(message?'Retry camera':'Enable camera'):phase==='loading'?'Cancel':'Stop camera'}</button></section>}
 {mounted&&createPortal(<div hidden ref={cursor} className="hand-cursor" aria-hidden="true"/>,document.body)}</div>
}
