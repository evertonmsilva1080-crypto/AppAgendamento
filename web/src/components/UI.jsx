import { Link } from 'react-router-dom'

export function Brand({ inverse = false }) {
  return <Link className={`brand app-brand ${inverse ? 'brand-inverse' : ''}`} to="/" aria-label="Agenda Fácil, início"><img src="/brand/logo-agenda-facil.png" alt="Agenda Fácil" /></Link>
}

const paths = {
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  scissors: <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.1 8.1 12 12M14 6l-4 4m-2 4 6-6m1 1 5-5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  grid: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
}
export function Icon({ name, size = 20, ...props }) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name] || paths.grid}</svg> }

export function Avatar({ src, name, size = 'md' }) {
  return <span className={`avatar avatar-${size}`}>{src ? <img src={src} alt="" /> : <span aria-hidden="true">{name?.trim()?.charAt(0)?.toUpperCase() || '?'}</span>}</span>
}

export function PageState({ error, onRetry }) {
  return <div className="page-state"><span className="state-symbol">!</span><h2>{error ? 'Não foi possível carregar agora' : 'Estamos preparando tudo'}</h2><p>{error || 'Aguarde um instante e tente novamente.'}</p>{onRetry && <button className="button button-dark" onClick={onRetry}>Tentar novamente</button>}</div>
}

export function Loading({ label = 'Carregando' }) { return <div className="loading" role="status"><span className="spinner"/><span>{label}</span></div> }
