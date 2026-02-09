export interface PersistentEntity {
    userId: string;
    data: any;
    attachT: number;
    strandIdx: number;
    stage?: number;
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[PersistenceManager] Save failed:', e);
        }
    }

    static load(): GardenState | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (e) {
            console.warn('[PersistenceManager] Load failed:', e);
            return null;
        }
    }

    static clear(): void {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[PersistenceManager] State cleared');
    }
}
