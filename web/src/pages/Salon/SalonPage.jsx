import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, Brand, Icon, Loading, PageState } from '../../components/UI.jsx'
import { messageFromError, salonApi } from '../../services/api.js'
import './salon.css'

const configuredId = import.meta.env.VITE_SALON_ID
function formatMoney(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function formatDuration(raw) {
  if (!raw) return 'Duração a confirmar'
  const date = new Date(raw)
  if (Number.isNaN(+date)) return raw
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes()
  return minutes ? `${minutes} min` : '1 hora'
}

export default function SalonPage() {
  const { salaoId: routeId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [manualId, setManualId] = useState(search.get('salaoId') || localStorage.getItem('salonId') || configuredId || '')
  const salaoId = routeId || search.get('salaoId') || manualId.trim()
  const [salon, setSalon] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(Boolean(salaoId))
  const [error, setError] = useState('')

  async function load() {
    if (!salaoId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [salonData, serviceData, staffData] = await Promise.all([
        salonApi.get(salaoId), salonApi.services(salaoId), salonApi.staff(salaoId),
      ])
      setSalon(salonData.salao); setServices(serviceData.servicos || []); setStaff(staffData.colaboradores || [])
      localStorage.setItem('salonId', salaoId)
    } catch (e) { setError(messageFromError(e)); setSalon(null) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [salaoId])

  const cover = salon?.capa || '/images/salon-cover.png'
  const name = salon?.nome || 'Salão corte certo'
  const activeStaff = useMemo(() => staff.filter(person => person?.nome).slice(0, 5), [staff])
  if (loading) return <div className="salon-page"><header className="salon-header"><div className="container"><Brand /></div></header><Loading label="Preparando seu salão" /></div>
  if (error) return <div className="salon-page"><header className="salon-header"><div className="container"><Brand /></div></header><PageState error={error} onRetry={load} /></div>
  if (!salon) return <div className="salon-page"><header className="salon-header"><div className="container"><Brand /></div></header><section className="container salon-id-prompt"><span className="eyebrow">Corte certo começa aqui</span><h1>Encontre seu próximo horário.</h1><p>Informe o código do salão para ver os serviços e horários disponíveis.</p><form onSubmit={e => { e.preventDefault(); const id = manualId.trim(); if (id) navigate(`/salao/${id}`) }}><label htmlFor="salon-id">Código do salão</label><div className="input-action"><input id="salon-id" value={manualId} onChange={e => setManualId(e.target.value)} placeholder="Ex.: 6adddb45a9a9a09f4f816bc0" required /><button className="button button-primary" type="submit">Continuar <Icon name="arrow" size={17}/></button></div></form></section></div>

  return <div className="salon-page">
    <header className="salon-header"><div className="container header-inner"><Brand /><Link className="panel-link" to={`/painel/${salaoId}`}><Icon name="grid" size={17}/> Acesso do salão</Link></div></header>
    <main>
      <section className="container salon-hero"><img src={cover} alt="Interior do salão" onError={e => { e.currentTarget.src = '/images/salon-cover.png' }} /><div className="hero-scrim"/><div className="hero-copy">{salon.foto&&<img className="salon-profile-logo" src={salon.foto} alt={`Logo de ${name}`} onError={e=>{e.currentTarget.style.display="none"}}/>}<span className="hero-kicker"><span className="live-dot"/> AGENDE SEM COMPLICAÇÃO</span><h1>{name}</h1><p><Icon name="pin" size={17}/>{[salon.endereco?.cidade, salon.distancia ? `${Number(salon.distancia).toFixed(1)} km de você` : null].filter(Boolean).join(' · ') || 'Beleza e cuidado do seu jeito'}</p></div><div className="hero-count"><strong>{services.length.toString().padStart(2, '0')}</strong><span>serviços</span></div></section>
      <div className="container salon-content">
        <section className="service-section"><div className="section-heading"><div><span className="eyebrow">ESCOLHA O SEU MOMENTO</span><h2>Serviços</h2></div><span className="count-label">{services.length} opções</span></div>
          {services.length ? <div className="service-list">{services.map(service => <article className="service-row" key={service._id}><div className="service-icon"><Icon name="scissors" size={20}/></div><div className="service-main"><h3>{service.titulo}</h3><p><Icon name="clock" size={14}/>{formatDuration(service.duracao)} <span className="service-dot">·</span> {service.descricao || 'Um cuidado feito para você'}</p></div><div className="service-end"><strong>{formatMoney(service.preco)}</strong><Link className="choose-service" to={`/agendamento/${salaoId}/${service._id}`} aria-label={`Agendar ${service.titulo}`}><Icon name="arrow" size={18}/></Link></div></article>)}</div> : <div className="empty-services"><Icon name="scissors" size={24}/><strong>Os serviços aparecem aqui</strong><span>Este salão ainda não publicou serviços para agendamento.</span></div>}
        </section>
        <aside className="salon-aside"><div className="aside-card stylist-card"><span className="eyebrow">QUEM CUIDA DE VOCÊ</span><h2>Uma equipe que entende do assunto.</h2><div className="stylist-stack">{activeStaff.length ? activeStaff.map(person => <div className="stylist" key={person._id}><Avatar name={person.nome} src={person.foto}/><span>{person.nome}</span></div>) : <p className="muted">Especialistas disponíveis na hora de agendar.</p>}</div><div className="aside-rule"/><p className="aside-note">Escolha serviço, especialista e horário. Pronto.</p></div><div className="aside-card help-card"><span className="help-icon"><Icon name="calendar" size={20}/></span><div><strong>Seu tempo importa.</strong><p>Encontre horários que cabem na sua rotina.</p></div></div></aside>
      </div>
    </main>
    {services.length > 0 && <div className="mobile-bottom"><div className="bottom-inner"><div><span className="bottom-price">{services.length} serviços</span><div className="muted" style={{fontSize:12}}>Escolha e reserve</div></div><a className="button button-primary" href="#servicos" onClick={e => { e.preventDefault(); document.querySelector('.service-section')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver serviços <Icon name="arrow" size={17}/></a></div></div>}
  </div>
}
