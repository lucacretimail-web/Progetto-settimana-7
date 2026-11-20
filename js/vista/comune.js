// Comune (Vista): pezzi usati da più sezioni; ricevono un elemento e lo riempiono, i dati entrano come testo, mai come HTML
const announcer = document.getElementById('announcer');
// Pausa tra lo svuotamento e il nuovo annuncio: il lettore di schermo deve vedere un cambio per rileggere un testo uguale
const ANNOUNCE_DELAY_MS = 100;

// Testi degli errori dell'API, per codice (sezione «API» del piano)
const ERROR_MESSAGES = new Map([
  ['offline', () => 'Sei offline: controlla la connessione e riprova.'],
  ['network', () => 'Non riesco a contattare TheSportsDB. Se hai fatto molte ricerche di fila, riprova tra due minuti.'],
  ['timeout', () => 'TheSportsDB non risponde: riprova tra poco.'],
  ['rate-limit', ({ retryIn }) => `Troppe richieste in un minuto: riprova tra ${retryIn} secondi.`],
  ['http', ({ status }) => `TheSportsDB ha risposto con un errore (codice ${status}).`],
  ['format', () => 'TheSportsDB ha risposto in modo inatteso: riprova tra poco.'],
]);
const FALLBACK_ERROR = 'Qualcosa è andato storto: riprova tra poco.';

// Elemento nuovo con classe e testo
function newElement(tag, className, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// Template e campi: si clona il markup dell'HTML e si riempiono gli elementi [data-field] con il valore omonimo
export const cloneTemplate = (template) => template.content.firstElementChild.cloneNode(true);

export function fillFields(root, fields) {
  for (const element of root.querySelectorAll('[data-field]')) element.textContent = fields[element.dataset.field] ?? '';
}

// Stemma: /tiny (100 px, 13,6 KB) o /small sugli schermi ad alta densità (46 KB) invece dei 127 KB dell'originale;
// senza stemma, o se non si carica, un cerchio con l'iniziale (le classi dell'immagine più il modificatore --empty)
export function setBadge(img, url, name) {
  const placeholder = newElement('span', `${img.className} ${img.classList[0]}--empty`, name.charAt(0).toUpperCase());
  placeholder.setAttribute('aria-hidden', 'true');
  if (!url) return img.replaceWith(placeholder);
  img.addEventListener('error', () => {
    console.warn('[vista] stemma non caricato, al suo posto l\'iniziale:', url);
    img.replaceWith(placeholder);
  }, { once: true });
  img.srcset = `${url}/tiny 1x, ${url}/small 2x`;
  img.src = `${url}/tiny`;
}

// Stati nel contenitore role="status": spinner con il testo per i lettori di schermo, messaggio (uguale non si riscrive,
// così non viene riletto), avviso d'errore con il testo scelto dal codice
export function showLoading(status, label) {
  const spinner = newElement('div', 'spinner-border status__spinner');
  spinner.append(newElement('span', 'visually-hidden', label));
  status.replaceChildren(spinner);
}

export function showMessage(status, text) {
  if (status.querySelector('.status__message')?.textContent === text) return;
  status.replaceChildren(newElement('p', 'status__message', text));
}

export function showError(status, error) {
  status.replaceChildren(newElement('div', 'alert alert-danger', ERROR_MESSAGES.get(error.code)?.(error) ?? FALLBACK_ERROR));
}

// Annuncio per i lettori di schermo: si svuota e il testo arriva un attimo dopo, così anche un annuncio uguale si rilegge
export function announce(text) {
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = text; }, ANNOUNCE_DELAY_MS);
}
