'use client'
import { useEffect, useRef, useState } from 'react'
import { AudioLines, Layers3, Sprout, Hand, Upload, Box, Timer, ScanLine, FileText, X } from 'lucide-react'
import { QuizInspector } from './quiz-inspector'
import {useRecall} from './use-recall'
import {NeuralSpace} from './neural-space'
import { Telemetry } from './telemetry'
const modes = [{name:'Unified', Icon:Layers3}, {name:'Study Terrarium', Icon:Sprout}, {name:'Gesture Synth', Icon:Hand}]
export default function Workspace() {
 const [mode,setMode]=useState(0), [decay,setDecay]=useState(65), [panel,setPanel]=useState(true), [pdf,setPdf]=useState<{name:string,url:string}|null>(null), [error,setError]=useState('')
 const recall=useRecall()
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>()=>{if(pdf) URL.revokeObjectURL(pdf.url)},[pdf])
 return <main className="studio"><div className="floor" aria-hidden="true"><div/></div>
 <header className="topbar glass"><h1 className="brand flex items-center gap-3"><span className="brand-mark"><AudioLines size={23} strokeWidth={2.7}/></span>SynapseSonic</h1>
 <nav aria-label="Workspace mode" className="mode-nav">{modes.map(({name,Icon},i)=><button key={name} aria-pressed={mode===i} onClick={()=>setMode(i)}><Icon size={16}/>{name}</button>)}</nav>
 <div className="decay"><label htmlFor="decay" className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><Timer size={13}/>Time-Decay</span><output htmlFor="decay">{(decay/100).toFixed(2)}</output></label><input id="decay" type="range" min="0" max="100" value={decay} style={{background:`linear-gradient(to right,var(--lime) ${decay}%,#37383a ${decay}%)`}} onChange={e=>setDecay(+e.target.value)}/></div>
 <input type="file" ref={input} hidden accept="application/pdf,.pdf" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(!(await f.slice(0,1024).text()).includes('%PDF-')){setError('Choose a valid PDF file.');return}setError('');setPdf({name:f.name,url:URL.createObjectURL(f)})}}/><button className="upload" onClick={()=>input.current?.click()}><Upload size={15}/>Upload PDF</button></header>
 <div className="workbody"><section className="context"><span className="eyebrow flex items-center gap-2"><i className="dot"/>WORKSPACE ONLINE</span><h2>{modes[mode].name} workspace</h2><span className="context-sub flex items-center gap-2"><Box size={14}/>3D Canvas<span className="slash">/</span>Perspective</span>{pdf&&<div className="filetag"><FileText size={13}/><a href={pdf.url} target="_blank" rel="noreferrer">{pdf.name}</a><button aria-label="Remove PDF" onClick={()=>setPdf(null)}><X size={13}/></button></div>}{error&&<p role="alert">{error}</p>}</section>
 <NeuralSpace recall={recall} mode={mode} decay={decay} onDecay={setDecay}/>
 {panel?<QuizInspector recall={recall} onClose={()=>setPanel(false)}/>:<button className="reopen glass" onClick={()=>setPanel(true)}><ScanLine size={16}/>Open quiz inspector</button>}
 <Telemetry decay={decay}/></div><footer className="statusbar flex items-center justify-between"><span className="flex items-center gap-2"><i className="dot"/>System operational</span><span>SYNAPSESONIC <b>/</b> ENGINE V1.0</span></footer></main>
}
