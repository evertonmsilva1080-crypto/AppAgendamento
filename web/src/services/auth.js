const STORAGE_KEY='appagendamento.auth';
export function getAuth(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!value?.token||!value?.usuario?.role)return null;const payload=JSON.parse(atob(value.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.exp*1000<=Date.now()){clearAuth();return null}return value}catch{return null}}
export function saveAuth(value){localStorage.setItem(STORAGE_KEY,JSON.stringify(value));if(value.usuario?.role==='salao'&&value.salaoId)localStorage.setItem('salonId',value.salaoId)}
export function clearAuth(){localStorage.removeItem(STORAGE_KEY)}
