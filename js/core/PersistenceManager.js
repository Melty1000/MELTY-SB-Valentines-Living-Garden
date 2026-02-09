const STORAGE_KEY = 'living_garden_state';

export class PersistenceManager {
    static save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[PersistenceManager] Save failed:', e);
        }
    }

    static load() | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (e) {
            console.warn('[PersistenceManager] Load failed:', e);
            return null;
        }
    }

    static clear() {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[PersistenceManager] State cleared');
    }
}
