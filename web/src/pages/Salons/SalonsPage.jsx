import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, Loading } from '../../components/UI.jsx'
import { messageFromError, salonApi } from '../../services/api.js'
import './salons.css'

export default function SalonsPage() {
  const [salons, setSalons] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSalons() {
    setLoading(true)
    setError('')
    try {
      const result = await salonApi.list()
      setSalons(result.saloes || [])
    } catch (cause) {
      setError(messageFromError(cause))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSalons() }, [])

  const filteredSalons = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return salons
    return salons.filter(salon => [salon.nome, salon.endereco?.cidade, salon.endereco?.uf]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized))
  }, [salons, query])

  return <main className="salons-page">
    <header className="salons-header">
      <div className="salons-container salons-nav">
        <Link to="/" className="salons-brand" aria-label="Agenda Fácil, início">
          <img src="/brand/logo-agenda-facil.png" alt="Agenda Fácil" />
        </Link>
        <Link className="salons-back" to="/">Voltar ao início</Link>
      </div>
    </header>

    <section className="salons-container salons-main" aria-labelledby="salons-title">
      <span className="salons-eyebrow">AGENDE PERTO DE VOCÊ</span>
      <div className="salons-heading">
        <div>
          <h1 id="salons-title">Todos os salões.</h1>
          <p>Encontre um lugar e escolha seu próximo horário.</p>
        </div>
        <label className="salons-search">
          <Icon name="search" size={18}/>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome ou cidade" aria-label="Buscar salão por nome ou cidade" />
        </label>
      </div>

      {loading ? <Loading label="Carregando salões"/> : error ? <div className="salons-state" role="alert">
        <h2>Não conseguimos carregar os salões.</h2>
        <p>{error}</p>
        <button className="salons-retry" onClick={loadSalons}>Tentar novamente</button>
      </div> : filteredSalons.length ? <>
        <p className="salons-count">{filteredSalons.length} {filteredSalons.length === 1 ? 'salão encontrado' : 'salões encontrados'}</p>
        <div className="salons-list">
          {filteredSalons.map(salon => {
            const location = [salon.endereco?.cidade, salon.endereco?.uf].filter(Boolean).join(' · ')
            const photo = salon.capa || salon.foto
            return <Link className="salons-card" to={`/salao/${salon._id}`} key={salon._id}>
              <span className="salons-card-image">
                {photo ? <img src={photo} alt={`Foto de ${salon.nome || 'salão'}`} loading="lazy"/> : <span aria-hidden="true"><Icon name="scissors" size={28}/></span>}
              </span>
              <span className="salons-card-copy">
                <strong>{salon.nome || 'Salão'}</strong>
                <span className="salons-card-location"><Icon name="pin" size={15}/>{location || 'Agendamento online'}</span>
                <span className="salons-card-link">Ver serviços <Icon name="arrow" size={15}/></span>
              </span>
            </Link>
          })}
        </div>
      </> : <div className="salons-state">
        <h2>{query ? 'Nenhum salão encontrado.' : 'Ainda não há salões cadastrados.'}</h2>
        <p>{query ? 'Tente buscar por outro nome ou cidade.' : 'Quando novos salões entrarem na plataforma, eles aparecerão aqui.'}</p>
        {query && <button className="salons-retry" onClick={() => setQuery('')}>Limpar busca</button>}
      </div>}
    </section>
  </main>
}
