import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Brand, Icon, Loading, PageState } from '../../components/UI.jsx'
import { messageFromError, salonApi } from '../../services/api.js'
import { getAuth } from '../../services/auth.js'
import './booking.css'
import './booking-week.css'

const DAY = 86400000
const isoDay = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const upcomingWeekRange = () => { const start=new Date();const daysUntilMonday=(8-start.getDay())%7||7;start.setDate(start.getDate()+daysUntilMonday);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+6);return {start:isoDay(start),end:isoDay(end)} }
const prettyDay = value => new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(`${value}T12:00:00`)).replace('.','')
const money = value => Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const duration = value => { const d=new Date(value); const m=d.getUTCHours()*60+d.getUTCMinutes(); return m ? `${m} min` : '1 hora' }

export default function BookingPage({ specialistFirst = false }) {
  const { salaoId, servicoId } = useParams()
  const [service,setService]=useState(null),[salon,setSalon]=useState(null),[availability,setAvailability]=useState(null)
  const [selectedDate,setSelectedDate]=useState(''),[selectedCollaborator,setSelectedCollaborator]=useState(''),[selectedTime,setSelectedTime]=useState('')
  const [stage,setStage]=useState('schedule'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[completed,setCompleted]=useState(null)
  const weekRange=upcomingWeekRange()
  const canBookDate=date=>date>=weekRange.start&&date<=weekRange.end

  async function load() {
    setLoading(true);setError('')
    try {
      const [services,salonData]=await Promise.all([salonApi.services(salaoId),salonApi.get(salaoId)])
      const found=(services.servicos||[]).find(item=>String(item._id)===servicoId)
      if(!found) throw new Error('Esse serviço não está disponível neste salão.')
      setService(found);setSalon(salonData.salao)
      const result=await salonApi.availability({salaoId,servicoId,data:isoDay(new Date())})
      setAvailability(result)
      const nextWeekDate=result.agenda?.flatMap(item=>Object.keys(item)).find(canBookDate)||''
      setSelectedDate(nextWeekDate)
    } catch(e){setError(messageFromError(e))} finally{setLoading(false)}
  }
  useEffect(()=>{load()},[salaoId,servicoId])
  const dates=useMemo(()=>availability?.agenda?.flatMap(day=>Object.keys(day).map(date=>({date,collabs:day[date]})))||[],[availability])
  const collaborators=availability?.colaboradores||[]
  const availabilityForDate=dates.find(item=>item.date===selectedDate)?.collabs||{}
  const timeOptions=selectedCollaborator ? (availabilityForDate[selectedCollaborator]||[]).flat().filter(time=>time&&time!=='-') : []
  const selectedPerson=collaborators.find(person=>String(person._id)===selectedCollaborator)

  async function chooseDate(date){if(!canBookDate(date))return;setSelectedDate(date);setSelectedTime('');setError('');if(dates.find(d=>d.date===date)?.collabs) return
    setBusy(true);try{const data=await salonApi.availability({salaoId,servicoId,data:date});setAvailability(prev=>({...prev,colaboradores:[...(prev?.colaboradores||[]),...(data.colaboradores||[])].filter((v,i,a)=>a.findIndex(x=>x._id===v._id)===i),agenda:[...(prev?.agenda||[]),...(data.agenda||[])]}))}catch(e){setError(messageFromError(e))}finally{setBusy(false)}}
  function startClient(){if(!selectedDate||!selectedTime||!selectedCollaborator){setError('Escolha um profissional e um horário para continuar.');return}setError('');setStage('client');window.scrollTo({top:0,behavior:'smooth'})}
  async function confirmBooking(event){event.preventDefault();setBusy(true);setError('')
    try{
      const session=getAuth()
      if(session?.usuario?.role!=='cliente')throw new Error('Entre em uma conta de cliente para confirmar a reserva.')
      const [year,month,day]=selectedDate.split('-').map(Number),[hour,minute]=selectedTime.split(':').map(Number)
      const localDate=new Date(year,month-1,day,hour,minute,0)
      const result=await salonApi.book({clienteId:session.usuario.id,salaoId,servicoId,colaboradorId:selectedCollaborator,data:localDate.toISOString()})
      setCompleted(result.agendamento);setStage('complete')
    }catch(e){setError(messageFromError(e))}finally{setBusy(false)}}

  if(loading)return <div className="booking-page"><BookingHeader salon={salon}/><Loading label="Buscando horários disponíveis"/></div>
  if(error&&!service)return <div className="booking-page"><BookingHeader salon={salon}/><PageState error={error} onRetry={load}/></div>
  if(completed)return <div className="booking-page" data-flow={specialistFirst ? 'specialist' : 'standard'}><BookingHeader salon={salon}/><main className="booking-container"><section className="success-card"><span className="success-mark"><Icon name="check" size={28}/></span><span className="eyebrow">HORÁRIO RESERVADO</span><h1>Está marcado.</h1><p>Seu horário para <strong>{service.titulo}</strong> foi salvo para {prettyDay(selectedDate)}, às {selectedTime}.</p><div className="success-detail"><span>Especialista</span><strong>{selectedPerson?.nome}</strong><span>Valor</span><strong>{money(service.preco)}</strong><span>Referência</span><small>{completed._id}</small></div><div className="notice-banner">Modo de teste: a reserva foi salva, mas nenhum pagamento foi cobrado.</div><Link to={`/salao/${salaoId}`} className="button button-primary button-block">Voltar ao salão</Link></section></main></div>

  return <div className="booking-page" data-flow={specialistFirst ? 'specialist' : 'standard'}><BookingHeader salon={salon}/><main className="booking-container">
    <Link className="back-link" to={`/salao/${salaoId}`}><span>←</span> Voltar para serviços</Link>
    <div className="booking-layout"><section className="booking-main">
      <div className="booking-title"><span className="eyebrow">{stage==='client'?'SÓ MAIS UM PASSO':'ESCOLHA SEU HORÁRIO'}</span><h1>{stage==='client'?'Seus dados':specialistFirst?'Escolha seu especialista.':'Vamos encontrar um horário.'}</h1><p>{stage==='client'?'Confirme os dados da reserva vinculada à sua conta.':'Escolha quem vai atender você e um horário disponível. Você pode agendar somente para a próxima semana, até às 23h59 do dia anterior.'}</p></div>
      {stage==='schedule' ? <>
        <section className="booking-step"><div className="step-heading"><span className="step-number">01</span><div><h2>Especialista</h2><p>Escolha com quem quer agendar</p></div></div>
          {collaborators.length ? <div className="specialist-list">{collaborators.map(person=><button className={`specialist-option ${selectedCollaborator===person._id?'selected':''}`} key={person._id} onClick={()=>{setSelectedCollaborator(person._id);setSelectedTime('')}}><Avatar name={person.nome} src={person.foto}/><span className="specialist-name">{person.nome}</span><span className="specialist-check"><Icon name="check" size={15}/></span></button>)}</div> : <div className="notice-banner">Ainda não há especialistas disponíveis para este serviço.</div>}
        </section>
        <section className="booking-step"><div className="step-heading"><span className="step-number">02</span><div><h2>Dia e horário</h2><p>Próxima semana · horários consideram a duração do serviço</p></div></div>
          {dates.length ? <><div className="date-strip">{dates.map(({date})=>{const allowed=canBookDate(date);return <button key={date} disabled={!allowed} aria-disabled={!allowed} title={allowed?'':'Disponível para agendamento em outra semana'} className={`date-chip ${date===selectedDate?'active':''} ${allowed?'':'date-chip-disabled'}`} onClick={()=>chooseDate(date)}><span>{prettyDay(date).split(',')[0]}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong><small>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${date}T12:00:00`)).replace('.','')}</small></button>})}</div>
            {!dates.some(item=>canBookDate(item.date))?<p className="no-times">Não há horários disponíveis para a próxima semana. As datas de outras semanas estão desativadas.</p>:selectedCollaborator ? <div className="time-grid-wrap"><div className="time-label">Horários para {selectedPerson?.nome}</div>{timeOptions.length?<div className="time-grid">{timeOptions.map((time,index)=><button key={`${time}-${index}`} className={`time-chip ${selectedTime===time?'active':''}`} onClick={()=>setSelectedTime(time)}>{time}</button>)}</div>:<p className="no-times">Sem horários livres para esse profissional neste dia.</p>}</div>:<p className="no-times">Selecione um especialista para ver os horários.</p>}
          </> : <div className="notice-banner">Não encontramos horários nos próximos dias. Tente novamente mais tarde.</div>}
        </section>
        {error&&<div className="error-banner" role="alert">{error}</div>}
        <button className="button button-primary continue-button" disabled={!selectedTime||busy} onClick={startClient}>Continuar <Icon name="arrow" size={17}/></button>
      </> : <form className="client-form" onSubmit={confirmBooking}>
        <div className="notice-banner">A reserva será vinculada à conta <strong>{getAuth()?.usuario?.email}</strong>. Confira o salão, especialista, data e horário no resumo antes de confirmar.</div>{error&&<div className="error-banner" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="button button-ghost" onClick={()=>setStage('schedule')}>Voltar</button><button className="button button-primary" disabled={busy}>{busy?'Salvando…':'Confirmar reserva'}</button></div>
      </form>}
      </section><aside className="booking-summary"><span className="eyebrow">RESUMO</span><h2>{service.titulo}</h2><div className="summary-meta"><span><Icon name="clock" size={15}/>{duration(service.duracao)}</span><span><Icon name="calendar" size={15}/>{selectedDate?prettyDay(selectedDate):'Escolha uma data'}{selectedTime?` · ${selectedTime}`:''}</span></div>{selectedPerson&&<div className="summary-person"><Avatar name={selectedPerson.nome} src={selectedPerson.foto}/><div><small>SEU ESPECIALISTA</small><strong>{selectedPerson.nome}</strong></div></div>}<div className="summary-total"><span>Total</span><strong>{money(service.preco)}</strong></div><p>Pagamento não é solicitado nesta etapa.</p></aside></div>
    </main>{stage==='schedule'&&<div className="mobile-bottom"><div className="bottom-inner"><div><span className="bottom-price">{money(service.preco)}</span><div className="muted" style={{fontSize:12}}>{selectedTime?`${selectedDate} · ${selectedTime}`:'Escolha seu horário'}</div></div><button className="button button-primary" disabled={!selectedTime||busy} onClick={startClient}>Continuar <Icon name="arrow" size={16}/></button></div></div>}</div>
}
function BookingHeader({salon}){return <header className="booking-header"><div className="container"><Brand/><span className="booking-salon">{salon?.nome||'Agendamento'}</span></div></header>}

