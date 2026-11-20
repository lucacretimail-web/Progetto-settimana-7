// API (Modello, OOP): tutte le chiamate a TheSportsDB. Percorso: indirizzo → cache → tetto → fetch con timeout e annullamento
// → lista → oggetti del modello. Endpoint, risposte ed errori: sezione «API» di Docs/Piano integrale.md
import { Team } from './squadra.js';
import { Match } from './partita.js';

// Chiave gratuita «123»: è pubblica, scritta nella documentazione
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123/';
// Risposta tipica in 0,17 s (misurata il 20/11/2026): oltre 8 s è persa
const REQUEST_TIMEOUT_MS = 8000;
// Partite e risultati cambiano solo dopo una gara: 5 minuti evitano richieste doppie senza dati vecchi
const CACHE_TTL_MS = 5 * 60 * 1000;
// Ne passano 10 al minuto, poi Cloudflare blocca per 120 s (misurato due volte il 20/11/2026): ci si ferma a 9
const RATE_LIMIT = { max: 9, windowMs: 60 * 1000 };
const STORAGE_KEYS = { cache: 'sportshub-api-cache', sentAt: 'sportshub-api-sent' };

// Le tre chiamate: file, parametro, chiave della lista (eventslast usa «results») e factory del modello
const ENDPOINTS = {
  searchTeams: { file: 'searchteams.php', param: 't', listKey: 'teams', toModel: Team.fromApi },
  nextMatches: { file: 'eventsnext.php', param: 'id', listKey: 'events', toModel: Match.fromApi },
  lastMatches: { file: 'eventslast.php', param: 'id', listKey: 'results', toModel: Match.fromApi },
};

// Errore con un codice (offline, network, timeout, rate-limit, http, format): il testo lo sceglie la vista
const apiError = (code, details = {}) => Object.assign(new Error(`TheSportsDB: ${code}`), { code, ...details });

// Errori del browser → codici: l'annullamento passa com'è (lo ignora il controller); il 429 di Cloudflare arriva
// senza CORS e il browser lo vede come rete assente (TypeError)
function toApiError(error) {
  if (error.name === 'AbortError') return error;
  if (error.name === 'TimeoutError') return apiError('timeout');
  return apiError(navigator.onLine ? 'network' : 'offline');
}

// Fetch che si ferma dopo 8 s o quando il controller annulla (AbortSignal.any unisce i due segnali)
async function fetchJson(url, signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    .catch((error) => { throw toApiError(error); });
  if (!response.ok) throw apiError('http', { status: response.status });
  return response.json().catch(() => { throw apiError('format'); });
}

// Lista dalla risposta: null vuol dire nessun risultato; se la chiave manca, la risposta non è quella attesa
function readList(data, endpoint) {
  const list = data?.[endpoint.listKey];
  if (list === null) return [];
  if (!Array.isArray(list)) throw apiError('format');
  return list;
}

// Voci → oggetti del modello, senza quelle che le factory scartano
const toModels = (endpoint, list) => list.map((raw) => endpoint.toModel(raw)).filter(Boolean);

// sessionStorage: cache e registro delle richieste sopravvivono ai ricaricamenti di Live Server; se è negato, si lavora in memoria
function readSession(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch (error) {
    console.warn('[api] sessionStorage non leggibile:', key, error.message);
    return null;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[api] sessionStorage non scrivibile, si continua in memoria:', error.message);
  }
}

export class SportsDbApi {
  #cache;
  #sentAt;

  // Riprende cache e registro delle richieste dal sessionStorage, se hanno la forma giusta
  constructor() {
    const entries = readSession(STORAGE_KEYS.cache);
    const sentAt = readSession(STORAGE_KEYS.sentAt);
    this.#cache = new Map(Array.isArray(entries) ? entries : []);
    this.#sentAt = Array.isArray(sentAt) ? sentAt.filter(Number.isFinite) : [];
  }

  // Le tre chiamate (signal annulla la richiesta): Team[] (al massimo una squadra), Match[], Match[] di solito PlayedMatch
  searchTeams(query, { signal } = {}) { return this.#request(ENDPOINTS.searchTeams, query.toLowerCase(), signal); }
  getNextMatches(teamId, { signal } = {}) { return this.#request(ENDPOINTS.nextMatches, teamId, signal); }
  getLastMatches(teamId, { signal } = {}) { return this.#request(ENDPOINTS.lastMatches, teamId, signal); }

  // Una chiamata: prima la cache, poi il tetto, poi la rete; una richiesta già annullata non parte e non occupa il tetto.
  // In cache va la lista grezza: le factory girano a ogni lettura
  async #request(endpoint, value, signal) {
    signal?.throwIfAborted();
    const url = new URL(endpoint.file, BASE_URL);
    url.searchParams.set(endpoint.param, value);
    const now = Date.now();
    const cached = this.#cache.get(url.href);
    if (cached?.expiresAt > now && Array.isArray(cached.list)) {
      console.log('[api] dalla cache:', url.href);
      return toModels(endpoint, cached.list);
    }
    this.#reserveRequest(now);
    const list = readList(await fetchJson(url, signal), endpoint);
    console.log('[api]', url.href, '→', list.length, 'voci in', Date.now() - now, 'ms');
    this.#remember(url.href, list, now);
    return toModels(endpoint, list);
  }

  // Tetto: con 9 richieste negli ultimi 60 s la rete non si chiama; la richiesta si segna subito, perché conta anche se fallisce
  #reserveRequest(now) {
    this.#sentAt = this.#sentAt.filter((time) => now - time < RATE_LIMIT.windowMs);
    if (this.#sentAt.length >= RATE_LIMIT.max) {
      const retryIn = Math.ceil((this.#sentAt[0] + RATE_LIMIT.windowMs - now) / 1000);
      console.warn('[api] tetto di', RATE_LIMIT.max, 'richieste al minuto: riprova tra', retryIn, 's');
      throw apiError('rate-limit', { retryIn });
    }
    this.#sentAt.push(now);
    writeSession(STORAGE_KEYS.sentAt, this.#sentAt);
  }

  // Cache: la lista con la sua scadenza; le voci scadute si tolgono, così il sessionStorage non cresce
  #remember(key, list, now) {
    for (const [cachedKey, entry] of this.#cache) {
      if (!(entry?.expiresAt > now)) this.#cache.delete(cachedKey);
    }
    this.#cache.set(key, { expiresAt: now + CACHE_TTL_MS, list });
    writeSession(STORAGE_KEYS.cache, [...this.#cache]);
  }
}
