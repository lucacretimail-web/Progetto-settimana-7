// Squadra (Modello, OOP): campi privati in sola lettura; nasce da fromApi, che controlla i dati al bordo,
// e con toJSON torna nella forma dell'API, che dal localStorage ripassa da fromApi
import { readId, readText, readHttpsUrl } from './campi.js';

export class Team {
  #id;
  #name;
  #badge;
  #league;
  #country;
  #sport;

  // Riceve un oggetto con i nomi dei campi (sono più di tre); lo chiama solo fromApi
  constructor({ id, name, badge, league, country, sport }) {
    this.#id = id;
    this.#name = name;
    this.#badge = badge;
    this.#league = league;
    this.#country = country;
    this.#sport = sport;
  }

  // Dalla risposta dell'API (idTeam, strTeam…): Team, oppure null se mancano id o nome
  static fromApi(raw) {
    const id = readId(raw?.idTeam);
    const name = readText(raw?.strTeam);
    if (!id || !name) {
      console.warn('[modello] squadra scartata, mancano id o nome:', raw?.idTeam, raw?.strTeam);
      return null;
    }
    return new Team({
      id,
      name,
      badge: readHttpsUrl(raw.strBadge),
      league: readText(raw.strLeague),
      country: readText(raw.strCountry),
      sport: readText(raw.strSport),
    });
  }

  // Per il localStorage: JSON.stringify non vede i campi privati, e senza toJSON darebbe {}
  toJSON() {
    return {
      idTeam: this.#id,
      strTeam: this.#name,
      strBadge: this.#badge,
      strLeague: this.#league,
      strCountry: this.#country,
      strSport: this.#sport,
    };
  }

  // Getter in sola lettura; badge è l'URL originale (o null): le misure le sceglie la vista
  get id() { return this.#id; }
  get name() { return this.#name; }
  get badge() { return this.#badge; }
  get league() { return this.#league; }
  get country() { return this.#country; }
  get sport() { return this.#sport; }
}
