export interface PersistentEntity {
    userId: string;
    data: any;
    attachT: number;
    strandIdx: number;
}

export interface GardenState {
    flowers: PersistentEntity[];
    hearts: PersistentEntity[];
    growth: number;
}

const STORAGE_KEY = 'living_garden_state';

export class PersistenceManager {
    static save(state: GardenState): void {
        try {
            console.log('[PersistenceManager] Saving state:', {
                flowers: state.flowers.length,
                hearts: state.hearts.length,
                growth: state.growth.toFixed(3)
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[PersistenceManager] Save failed:', e);
        }
    }

    static load(): GardenState | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                console.log('[PersistenceManager] No saved state found.');
                return null;
            }
            const state = JSON.parse(saved);
            console.log('[PersistenceManager] Loaded state:', {
                flowers: state.flowers?.length,
                hearts: state.hearts?.length
            });
            return state;
        } catch (e) {
            console.warn('[PersistenceManager] Load failed:', e);
            return null;
        }
    }

    static clear(): void {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[PersistenceManager] State wiped via clear()');
    }
}
