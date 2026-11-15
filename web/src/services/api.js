import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 12000,
})

function unwrap(response) {
  const data = response.data
  if (data?.error || data?.erro) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}

export const salonApi = {
  get: async (id) => unwrap(await api.get(`/salao/${id}`)),
  updateSalonProfile: async (id, body) => unwrap(await api.put(`/salao/${id}`, body)),
  services: async (id) => unwrap(await api.get(`/servico/salao/${id}`)),
  createService: async (salaoId, servico) => unwrap(await api.post('/servico', { salaoId, servico })),
  updateService: async (id, salaoId, servico) => unwrap(await api.put(`/servico/${id}`, { salaoId, servico })),
  deleteService: async (id) => unwrap(await api.delete(`/servico/${id}`)),
  staff: async (id) => unwrap(await api.get(`/colaborador/salao/${id}`)),
  createCollaborator: async (salaoId, colaborador) => unwrap(await api.post('/colaborador', { salaoId, colaborador })),
  updateCollaborator: async (id, body) => unwrap(await api.put(`/colaborador/${id}`, body)),
  removeCollaboratorLink: async (vinculoId) => unwrap(await api.delete(`/colaborador/vinculo/${vinculoId}`)),
  hours: async (id) => unwrap(await api.get(`/horario/salao/${id}`)),
  createHours: async (body) => unwrap(await api.post('/horario', body)),
  updateHours: async (id, body) => unwrap(await api.put(`/horario/${id}`, body)),
  deleteHours: async (id, salaoId) => unwrap(await api.delete(`/horario/${id}`, { data: { salaoId } })),
  availability: async (body) => unwrap(await api.post('/agendamento/dias-disponiveis', body)),
  appointments: async (body) => unwrap(await api.post('/agendamento/filter', body)),
  clients: async (id) => unwrap(await api.get(`/cliente/salao/${id}`)),
  createClient: async (body) => unwrap(await api.post('/cliente', body)),
  book: async (body) => unwrap(await api.post('/agendamento', body)),
}

export function messageFromError(error) {
  return error?.response?.data?.message || error?.message || 'Ocorreu um erro. Tente novamente.'
}
