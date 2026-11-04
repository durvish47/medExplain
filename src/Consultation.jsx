import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, AudioLines, Check, CircleHelp, Mic, Phone, PhoneCall, Radio, ShieldCheck, Square, Stethoscope, UserRound, X } from 'lucide-react';

const patientId = 'maya-sharma';
const request = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not reach the consultation service.');
  return data;
};

export default function Consultation() {
  const [role, setRole] = useState('patient');
  const [snapshot, setSnapshot] = useState({ calls: [], messages: [] });
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const recorder = useRef(null), chunks = useRef([]), streamRef = useRef(null), startedAt = useRef(0);
  const refresh = async () => { try { setSnapshot(await request('/api/consultations')); setError(''); } catch (e) { setError(e.message); } };
  useEffect(() => { refresh(); const timer = setInterval(refresh, 2200); return () => { clearInterval(timer); streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setElapsed(v => v + 1), 1000); return () => clearInterval(timer); }, [recording]);
  const activeCall = snapshot.calls.find(c => c.patientId === patientId && ['ringing', 'accepted'].includes(c.status));
  const incoming = snapshot.calls.find(c => c.status === 'ringing');
  const acceptedCall = snapshot.calls.find(c => c.status === 'accepted');
  const sorted = [...snapshot.messages].filter(m => role === 'doctor' || m.patientId === patientId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  async function startCall() {
    setError('');
    try { const { call } = await request('/api/consultations/calls', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ patientId, patientName: 'Maya Sharma' }) }); setSnapshot(s => ({...s, calls:[call,...s.calls] })); }
    catch(e) { setError(e.message); }
  }
  function openLiveVisit(call, participantRole) { window.open(`/teleconsult.html?room=${encodeURIComponent(call.room)}&role=${participantRole}`, '_blank'); }
  async function updateCall(call, status) {
    try { const { call: updated } = await request(`/api/consultations/calls/${call.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }); setSnapshot(s => ({...s,calls:s.calls.map(c=>c.id===updated.id?updated:c)})); }
    catch(e) { setError(e.message); }
  }
  async function startRecording() {
    setError(''); setNotice('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Audio recording is not supported in this browser. Try Chrome or Edge.'); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({audio:true}); streamRef.current = stream; chunks.current=[]; const media = new MediaRecorder(stream); recorder.current=media; media.ondataavailable = e => { if(e.data.size) chunks.current.push(e.data); }; media.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); streamRef.current=null; const blob=new Blob(chunks.current,{type:media.mimeType||'audio/webm'}); if(!blob.size){setNotice('No audio data was captured. Check your microphone and record again.');return;} const duration=Math.max(1,Math.round((Date.now()-startedAt.current)/1000)); await sendRecording(blob,duration); }; media.start(); startedAt.current=Date.now(); setElapsed(0); setRecording(true); } catch { setError('Microphone access is blocked. Allow microphone permission and try again.'); }
  }
  function stopRecording() { if(recorder.current?.state==='recording'){setRecording(false);recorder.current.stop();} }
  async function sendRecording(blob,duration) {
    setSending(true);
    try { const extension=blob.type.includes('mp4')?'mp4':blob.type.includes('ogg')?'ogg':'webm'; const body=new FormData(); body.append('audio',blob,`voice-note-${Date.now()}.${extension}`); body.append('role',role); body.append('patientId',patientId); body.append('patientName','Maya Sharma'); body.append('duration',String(duration)); const {message}=await request('/api/consultations/messages',{method:'POST',body}); setSnapshot(s=>({...s,messages:[...s.messages,message]})); setNotice('Voice message sent securely to the consultation thread.'); }
    catch(e){setError(e.message);} finally{setSending(false);}
  }
  const audioUrl = message => message.audioUrl || `/api/consultations/messages/${encodeURIComponent(message.id)}/audio`;
  return <section className="consult-page">
    <div className="consult-heading"><div><div className="eyebrow"><span className="dot"/> SECURE CARE, AT YOUR PACE</div><h1>Care that keeps the conversation going.</h1><p>Start a live visit or exchange a voice message with your care team.</p></div><div className="consult-secure"><ShieldCheck size={17}/> Private care space</div></div>
    <div className="role-switch" aria-label="Choose your consultation view"><button className={role==='patient'?'selected':''} onClick={()=>{setRole('patient');setError('');}}><UserRound size={17}/> Patient view</button><button className={role==='doctor'?'selected':''} onClick={()=>{setRole('doctor');setError('');}}><Stethoscope size={17}/> Doctor view{incoming&&role!=='doctor'&&<i/>}</button></div>
    {error&&<div className="consult-alert" role="alert">{error}<button aria-label="Dismiss" onClick={()=>setError('')}><X size={15}/></button></div>}
    <div className="consult-grid"><section className="consult-main">
      <article className="call-card"><div className="call-card-top"><div><span className="call-kicker"><Radio size={14}/> {role==='patient'?'YOUR CARE TEAM':'PATIENT CONSULTATION'}</span><h2>{role==='patient'?'Dr. Aisha Raman':'Maya Sharma'}</h2><p>{role==='patient'?'General physician · Available today':'Patient · Follow-up visit'}</p></div><div className="avatar-circle">{role==='patient'?<Stethoscope size={25}/>:<UserRound size={25}/>}</div></div>
        {role==='patient'?<><div className="call-divider"/><div className="call-action-row"><div className="availability"><span className="availability-dot"/><span><b>Available for a call</b><small>Usually replies within a few minutes</small></span></div><button className="call-now" onClick={startCall} disabled={!!activeCall}><PhoneCall size={17}/>{activeCall?.status==='ringing'?'Calling doctor…':activeCall?.status==='accepted'?'Doctor accepted':'Start a live call'}</button></div>{activeCall?.status==='accepted'&&<button className="join-call" onClick={()=>openLiveVisit(activeCall,'patient')}><Phone size={15}/> Join your live consultation</button>}{!activeCall&&<p className="call-caption"><CircleHelp size={14}/> Your doctor will be notified and can answer when ready.</p>}</>:<><div className="call-divider"/><div className={`incoming-panel ${incoming||acceptedCall?'is-ringing':''}`}>{incoming?<><span className="ring-icon"><PhoneCall size={17}/></span><span className="ring-copy"><b>Incoming call from Maya Sharma</b><small>Patient is waiting to speak with you.</small></span><button className="accept-call" onClick={()=>updateCall(incoming,'accepted')}><Check size={15}/> Accept</button><button className="decline-call" aria-label="Decline call" onClick={()=>updateCall(incoming,'declined')}><X size={17}/></button></>:acceptedCall?<><span className="ring-icon"><Check size={17}/></span><span className="ring-copy"><b>Call accepted with Maya Sharma</b><small>Open the consultation to join the patient.</small></span><button className="accept-call" onClick={()=>openLiveVisit(acceptedCall,'doctor')}><Phone size={15}/> Open visit</button><button className="decline-call" aria-label="End accepted call" onClick={()=>updateCall(acceptedCall,'ended')}><X size={17}/></button></>:<><span className="ring-icon muted-ring"><Phone size={17}/></span><span className="ring-copy"><b>No incoming calls</b><small>New patient calls will appear here.</small></span><span className="waiting-label"><span/> Waiting</span></>}</div></>}
      </article>
      <article className="messages-card"><div className="messages-heading"><div><div className="eyebrow">ASYNC VOICE CARE</div><h2>{role==='patient'?'Your voice messages':'Patient voice messages'}</h2></div><span className="message-count">{sorted.length} {sorted.length===1?'message':'messages'}</span></div>
        <div className="message-list">{sorted.length===0?<div className="empty-messages"><span><AudioLines size={22}/></span><b>No voice messages yet</b><p>{role==='patient'?'If a call does not fit your day, leave a recording for your doctor.':'Patient recordings will arrive here for you to listen and reply.'}</p></div>:sorted.map(m=><div className={`voice-message ${m.role==='doctor'?'from-doctor':'from-patient'}`} key={m.id}><div className="voice-msg-avatar">{m.role==='doctor'?<Stethoscope size={16}/>:<UserRound size={16}/>}</div><div className="voice-msg-content"><div className="voice-msg-title"><b>{m.role==='doctor'?'Dr. Aisha Raman':'Maya Sharma'}</b><time>{new Date(m.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></div><div className="voice-player"><audio controls preload="metadata" src={audioUrl(m)} aria-label={`Voice recording from ${m.role==='doctor'?'doctor':'patient'}`} onError={()=>setError('This recording could not be loaded. Check that the server is running, then refresh the inbox.')}/></div><span className="audio-label"><ArrowDownLeft size={12}/> Audio recording</span></div></div>)}</div>
        <div className="record-composer"><div className="record-intro"><span className="record-mic"><Mic size={18}/></span><span><b>{role==='patient'?'Send a voice message':'Record a voice reply'}</b><small>{role==='patient'?'Describe how you are feeling, in your own words.':'Your response will be sent straight to the patient.'}</small></span></div><div className="record-controls">{recording?<><span className="record-timer"><i/>{formatTime(elapsed)}</span><button className="stop-record" onClick={stopRecording}><Square size={14} fill="currentColor"/> Stop & send</button></>:<button className="start-record" disabled={sending} onClick={startRecording}>{sending?<><span className="spinner"/> Sending…</>:<><Mic size={15}/>{role==='patient'?'Record a message':'Record a reply'}</>}</button>}</div>{notice&&<div className="record-success"><Check size={14}/>{notice}</div>}<p className="record-note"><ShieldCheck size={13}/> Your recording is shared only in this consultation.</p></div>
      </article>
    </section><aside className="consult-aside"><article className="aside-card"><span className="aside-icon"><Activity size={18}/></span><h3>Choose what works for you</h3><p>Live calls are great for quick conversations. Voice messages let your doctor listen and reply when they are available.</p><div className="aside-option"><span><PhoneCall size={15}/></span><div><b>Live call</b><small>Talk in real time</small></div><ArrowUpRight size={15}/></div><div className="aside-option"><span><AudioLines size={15}/></span><div><b>Voice message</b><small>Listen and reply later</small></div><ArrowUpRight size={15}/></div></article><div className="privacy-card"><ShieldCheck size={18}/><div><b>Your care stays private</b><p>Recordings are shared with your consultation team.</p></div></div><a className="back-overview" href="#" onClick={e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('medexplain:page',{detail:'overview'}));}}>← Back to MedExplain</a></aside></div>
  </section>;
}
