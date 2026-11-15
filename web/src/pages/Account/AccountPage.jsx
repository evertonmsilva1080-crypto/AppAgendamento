import { useEffect,useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'
import { Avatar,Brand,Icon,Loading } from '../../components/UI.jsx'
import { messageFromError,salonApi } from '../../services/api.js'
import { clearAuth,getAuth } from '../../services/auth.js'
import './account.css'
const dateTime=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export default function AccountPage(){const session=getAuth(),navigate=useNavigate(),[items,setItems]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState('')
 useEffect(()=>{salonApi.myAppointments().then(result=>setItems(result.agendamentos||[])).catch(e=>setError(messageFromError(e))).finally(()=>setBusy(false))},[])
 function logout(){clearAuth();navigate('/acesso/entrar',{replace:true})}
 return <main className="account-page"><header className="account-header"><Link to="/"><Brand/></Link><div><span>{session?.usuario?.nome}</span><button className="service-action" onClick={logout}>Sair</button></div></header><section className="account-main"><span className="eyebrow">ÁREA DO CLIENTE</span><h1>Suas reservas.</h1><p className="section-description">Acompanhe os agendamentos feitos com a sua conta.</p>{error&&<div className="error-banner" role="alert">{error}</div>}{busy?<Loading label="Buscando suas reservas"/>:items.length?<div className="account-bookings">{items.map(item=><article className="account-booking" key={item._id}><div className="account-booking-salon"><Avatar name={item.salaoId?.nome||'Salão'} src={item.salaoId?.foto}/><div><small>SALÃO</small><strong>{item.salaoId?.nome||'Salão'}</strong></div></div><div><small>SERVIÇO</small><strong>{item.servicoId?.titulo||'Serviço'}</strong></div><div><small>ESPECIALISTA</small><strong>{item.colaboradorId?.nome||'Equipe'}</strong></div><div><small>DATA E HORA</small><strong>{dateTime(item.data)}</strong></div><div className="account-booking-end"><strong>{money(item.valor)}</strong><Link className="choose-service" to={`/salao/${item.salaoId?._id}`} aria-label="Abrir salão"><Icon name="arrow" size={17}/></Link></div></article>)}</div>:<section className="panel-empty account-empty"><span className="mini-icon"><Icon name="calendar" size={20}/></span><strong>Você ainda não tem reservas</strong><p>Visite um salão para escolher um serviço e agendar.</p><Link className="button button-primary" to="/">Explorar salões</Link></section>}</section></main>
}
