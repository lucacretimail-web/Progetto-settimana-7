// Campi — lettura dei dati che arrivano da fuori (API e localStorage), parte del Modello.
// Si controlla una volta sola, qui al bordo: dentro l'app i dati sono già validi.
// Funzioni pure e senza log: il log lo scrivono le factory quando scartano un dato.

// Id: solo cifre, perché finisce negli URL dell'API e negli attributi data-*; altrimenti null
export function readId(value) {
  const id = String(value ?? '').trim();
  return /^\d+$/.test(id) ? id : null;
}

// Testo: la stringa senza spazi in testa e in coda; tutto il resto diventa ''
export const readText = (value) => (typeof value === 'string' ? value.trim() : '');

// URL: solo indirizzi https validi, perché finiscono in src e srcset; altrimenti null
export function readHttpsUrl(value) {
  const url = typeof value === 'string' ? URL.parse(value.trim()) : null;
  return url?.protocol === 'https:' ? url.href : null;
}
