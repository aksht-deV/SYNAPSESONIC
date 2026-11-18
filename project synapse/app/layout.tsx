import {Analytics} from '@vercel/analytics/next'
import type {Metadata,Viewport} from 'next'
import './globals.css'
export const metadata:Metadata={title:'SynapseSonic — Workspace',description:'A spatial study workspace with timed recall quizzes and live telemetry.'}
export const viewport:Viewport={themeColor:'#050811',colorScheme:'dark'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className="dark"><body className="antialiased">{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html>}
