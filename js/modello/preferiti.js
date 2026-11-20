// Preferiti (Modello, OOP): una Map id → Team (composizione, non ereditarietà) salvata nel localStorage a ogni modifica;
// la Map risponde subito a has(id), che chiede ogni card dei risultati, e tiene l'ordine di inserimento
import { Team } from './squadra.js';

const STORAGE_KEY = 'sportshub-favorites';

export class FavoriteTeams {
  #teams;

  constructor(teams = []) { this.#teams = new Map(teams.map((team) => [team.id, team])); }

  // Dal localStorage, un bordo come l'API: ogni voce ripassa da Team.fromApi; con dati rotti si parte senza preferiti
  static load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
      if (!Array.isArray(saved)) throw new Error('non è una lista');
      const teams = saved.map((raw) => Team.fromApi(raw)).filter(Boolean);
      console.log('[preferiti] caricati dal localStorage:', teams.length);
      return new FavoriteTeams(teams);
    } catch (error) {
      console.warn('[preferiti] salvataggio illeggibile, si parte senza preferiti:', error.message);
      return new FavoriteTeams();
    }
  }

  // Lettura: list è una copia, così da fuori la collezione non si cambia
  get list() { return [...this.#teams.values()]; }
  get size() { return this.#teams.size; }
  has(id) { return this.#teams.has(id); }
  get(id) { return this.#teams.get(id); }

  // Aggiungi e togli: true se la collezione cambia; una squadra già presente non si duplica
  add(team) {
    if (this.#teams.has(team.id)) return false;
    this.#teams.set(team.id, team);
    this.#save('aggiunta', team);
    return true;
  }

  remove(id) {
    const team = this.#teams.get(id);
    if (!team) return false;
    this.#teams.delete(id);
    this.#save('tolta', team);
    return true;
  }

  // Salvataggio dopo ogni modifica; senza spazio o permesso i preferiti valgono solo per questa visita
  #save(change, team) {
    console.log(`[preferiti] ${change}:`, team.name, '→', this.#teams.size, 'in tutto');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list));
    } catch (error) {
      console.warn('[preferiti] localStorage non scrivibile, valgono solo per questa visita:', error.message);
    }
  }
}
