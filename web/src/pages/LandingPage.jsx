import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon, Loading } from '../components/UI.jsx'
import LandingHeader from '../components/LandingHeader.jsx'
import ShapeHero from '../components/kokonutui/shape-hero.tsx'
import { salonToolShapes } from '../components/FallingSalonTools.jsx'
import CarouselCards from '../components/kokonutui/carousel-cards.tsx'
import { messageFromError, salonApi } from '../services/api.js'

const platformInstagram = import.meta.env.VITE_PLATFORM_INSTAGRAM || ''
const platformContactEmail = import.meta.env.VITE_PLATFORM_CONTACT_EMAIL || ''
const categories = ['Beleza', 'Bem-estar', 'Saúde', 'Serviços']
export default function LandingPage() {
  const navigate = useNavigate()
  const [salons, setSalons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSalons() {
    setLoading(true)
    setError('')
    try {
      const result = await salonApi.list()
      setSalons(result.saloes || [])
    } catch (cause) {
      setError(cause?.response?.status === 404 ? 'A listagem pública de estabelecimentos ainda não está conectada ao backend.' : messageFromError(cause))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSalons() }, [])

  const carouselItems = useMemo(() => salons.map(salon => ({
    id: String(salon._id),
    title: salon.nome || 'Estabelecimento',
    location: [salon.endereco?.cidade, salon.endereco?.uf].filter(Boolean).join(' · ') || 'Agendamento online',
    image: salon.capa || salon.foto || undefined,
    imageAlt: `Foto de ${salon.nome || 'estabelecimento'}`,
    scene: 'city',
    href: `/salao/${salon._id}`,
  })), [salons])

  return <div className="landing-page">
    <LandingHeader />

    <main>
      <ShapeHero
        className="landing-shape-hero"
        as="h1"
        fill={0.2}
        shapes={salonToolShapes}
        title={<>O próximo compromisso começa <span className="landing-hero-accent">no seu horário.</span></>}
        description="Encontre profissionais e estabelecimentos perto de você. Escolha o serviço, veja os horários e agende em poucos toques."
        actions={<><a className="landing-button landing-button-primary" href="#estabelecimentos">Encontrar um horário <Icon name="arrow" size={18}/></a></>}
      />

      <section className="landing-categories" aria-label="Tipos de estabelecimento">
                <div className="landing-container landing-category-row">
          <div className="landing-category-marquee" aria-label="Beleza, bem-estar, saúde , serviços">
            <div className="landing-category-track">
              {Array.from({ length: 4 }, (_, group) => <div className="landing-category-group" aria-hidden={group > 0} key={group}>{categories.map((item,index)=><span className="landing-category" key={`${group}-${item}`}><i className={`category-dot category-dot-${index}`}/>{item}</span>)}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-directory" id="estabelecimentos">
        <div className="landing-container">
          <div className="landing-directory-heading"><div><span className="landing-eyebrow">GENTE BOA, PERTO DE VOCÊ</span><h2>Encontre seu próximo lugar.</h2><p>Explore os estabelecimentos que já estão no Agenda Fácil.</p></div><Link className="landing-view-all" to="/saloes">Ver todos <Icon name="arrow" size={16}/></Link></div>
          {loading ? <Loading label="Buscando estabelecimentos"/> : error ? <div className="landing-empty"><span className="landing-empty-icon"><Icon name="grid" size={22}/></span><h3>Não conseguimos carregar agora.</h3><p>{error}</p><button className="landing-button landing-button-secondary" onClick={loadSalons}>Tentar novamente</button></div> : carouselItems.length ? <CarouselCards items={carouselItems} title="" eyebrow="" autoPlay autoPlayInterval={4200} onSelect={item=>item.href&&navigate(item.href)} className="landing-salon-carousel"/> : <div className="landing-empty"><span className="landing-empty-icon"><Icon name="search" size={22}/></span><h3>Estamos abrindo espaço para novos negócios.</h3><p>Em breve, você poderá descobrir e agendar com estabelecimentos da sua região.</p></div>}
        </div>
      </section>

      <section className="landing-how landing-container" id="como-funciona">
        <div className="landing-section-intro"><span className="landing-eyebrow">SEM TROCA DE MENSAGENS</span><h2>Seu tempo merece<br/>uma forma mais fácil.</h2><p>Do primeiro toque à confirmação, você resolve tudo online.</p></div>
        <div className="landing-steps"><article><span className="landing-step-number">01</span><span className="landing-step-icon"><Icon name="search" size={20}/></span><h3>Encontre</h3><p>Descubra negócios e profissionais por nome ou cidade.</p></article><article><span className="landing-step-number">02</span><span className="landing-step-icon landing-step-icon-purple"><Icon name="calendar" size={20}/></span><h3>Escolha</h3><p>Compare serviços e encontre um horário que funciona para você.</p></article><article><span className="landing-step-number">03</span><span className="landing-step-icon landing-step-icon-red"><Icon name="check" size={20}/></span><h3>Agende</h3><p>Confirme sua reserva online e deixe o resto com a gente.</p></article></div>
      </section>

      <section className="landing-business"><div className="landing-container landing-business-inner"><div><span className="landing-eyebrow">PARA QUEM FAZ ACONTECER</span><h2>Menos tempo organizando.<br/><em>Mais tempo atendendo.</em></h2><p>Organize serviços, equipe e horários em uma plataforma pensada para negócios com hora marcada.</p></div><Link className="landing-button landing-button-light" to="/acesso/cadastro/salao">Conheça o espaço do negócio <Icon name="arrow" size={17}/></Link><span className="landing-business-decoration" aria-hidden="true">✳</span></div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-main"><Link to="/" className="landing-footer-brand"><img src="/brand/logo-agenda-facil.png" alt="Agenda Fácil"/><span>Seu próximo horário começa aqui.</span></Link><div className="landing-footer-links"><div><strong>Explore</strong><a href="#estabelecimentos">Estabelecimentos</a><a href="#como-funciona">Como funciona</a></div><div><strong>Para negócios</strong><Link to="/acesso/entrar">Acesso do negócio</Link><Link to="/acesso/cadastro/salao">Cadastre seu espaço</Link></div><div><strong>Fale com a gente</strong>{platformInstagram?<a href={platformInstagram} target="_blank" rel="noreferrer">Instagram</a>:<span className="landing-link-placeholder">Instagram da plataforma</span>}{platformContactEmail ? <a href={"mailto:" + platformContactEmail}>Contato</a> : <span className="landing-link-placeholder">Contato da plataforma</span>}</div></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Agenda Fácil. Todos os direitos reservados.</span><span>Feito para deixar seu tempo mais leve <i>♥</i></span></div></div></footer>
  </div>
}
