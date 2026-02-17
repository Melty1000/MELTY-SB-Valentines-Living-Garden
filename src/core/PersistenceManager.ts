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
    crownColor?: number; // Added: Persistent crown color
    streamSeed?: number; // Added: Seed salt for per-stream procedural variation
    archivedFlowers?: PersistentEntity[]; // Added: Flowers preserved after pruning
    ignoredUsers?: string[]; // Added: Banned/Hidden users
}

const STORAGE_KEY = 'living_garden_state';

export class PersistenceManager {
    static save(state: GardenState): void {
        try {
            console.log('[PersistenceManager] Saving state:', {
                flowers: state.flowers.length,
                hearts: state.hearts.length,
                archived: state.archivedFlowers?.length || 0,
                growth: state.growth.toFixed(3),
                crownColor: state.crownColor ? state.crownColor.toString(16) : 'default',
                streamSeed: state.streamSeed
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
                hearts: state.hearts?.length,
                archived: state.archivedFlowers?.length,
                ignored: state.ignoredUsers?.length,
                crownColor: state.crownColor,
                streamSeed: state.streamSeed
            });
            return state;
        } catch (e) {
            console.warn('[PersistenceManager] Load failed:', e);
            return null;
        }
    }

    static clear(): void {
        // User Requirement: Preserve Crown Color even on hard reset/clear
        console.log(`[PersistenceManager] Clearing state...`);

        try {
            const current = this.load();
            const preservedColor = current?.crownColor;
            const nextStreamSeed = Math.floor(Date.now() + Math.random() * 1_000_000);

            localStorage.removeItem(STORAGE_KEY);

            if (preservedColor !== undefined) {
                console.log(`[PersistenceManager] Preserving crown color: ${preservedColor.toString(16)}`);
                // Re-save immediately with JUST the color and empty state
                this.save({
                    flowers: [],
                    hearts: [],
                    archivedFlowers: [],
                    ignoredUsers: [],
                    growth: 0.05, // Reset to default minimum
                    crownColor: preservedColor,
                    streamSeed: nextStreamSeed
                });
            } else {
                console.log('[PersistenceManager] State wiped completely (No crown color to preserve)');
            }
        } catch (e) {
            console.error('[PersistenceManager] Error during clear/preserve:', e);
            localStorage.removeItem(STORAGE_KEY); // Failsafe
        }
    }
}
