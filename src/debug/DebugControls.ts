import { EventBus, GardenEvents } from '../core/EventBus';
import { config } from '../config';

export function setupDebugControls(context: {
    garden: any,
    particleManager: any,
    windSway: any,
    app: any
}): void {
    const { garden, particleManager, windSway, app } = context;

    const debug = {
        spawnTestFlower: () => {
            const testId = `test_${Date.now()}_${Math.floor(Math.random() * 999999)}`;
            console.log('[gardenDebug] Simulating chatter for unique ID:', testId);
            EventBus.emit(GardenEvents.CHATTER, {
                userId: testId,
                userName: `TestUser_${Math.floor(Math.random() * 1000)}`,
                displayName: `TestUser_${Math.floor(Math.random() * 1000)}`,
                messageCount: 1,
                milestones: config.milestones,
                color: '#ff00ff'
            });
        },

        bulkSpawn: (count: number = 10) => {
            console.log(`[gardenDebug] Spawning ${count} flowers...`);
            for (let i = 0; i < count; i++) {
                debug.spawnTestFlower();
            }
        },

        spawnTestHeart: () => {
            const testId = `heart_${Date.now()}`;
            EventBus.emit(GardenEvents.SUBSCRIPTION, {
                userId: testId,
                userName: `SubUser${Math.floor(Math.random() * 1000)}`,
                displayName: `SubUser${Math.floor(Math.random() * 1000)}`,
                tier: ['1000', '2000', '3000'][Math.floor(Math.random() * 3)] as '1000' | '2000' | '3000',
                isGift: false,
            });
        },

        triggerGiftBomb: () => {
            EventBus.emit(GardenEvents.GIFT_BOMB, {
                userId: `gifter_${Date.now()}`,
                userName: 'GenerousGifter',
                displayName: 'GenerousGifter',
                count: 10,
                tier: '1000',
            });
        },

        triggerCommand: (command: string, args: string[] = []) => {
            EventBus.emit(GardenEvents.COMMAND, {
                userId: 'debug_user',
                userName: 'DebugUser',
                displayName: 'DebugUser',
                command,
                args,
            });
        },

        emitSparkles: (x?: number, y?: number) => {
            particleManager.emitSparkles(
                x ?? app.width / 2,
                y ?? app.height / 2,
                30
            );
        },

        emitHearts: (x?: number, y?: number) => {
            particleManager.emitHearts(
                x ?? app.width / 2,
                y ?? app.height / 2,
                15
            );
        },

        forceGust: (intensity = 1) => {
            windSway.forceGust(performance.now() * 0.001, intensity);
        },

        startDance: () => {
            garden.startDance();
        },

        testChat: (userId: string, count: number) => {
            EventBus.emit(GardenEvents.CHATTER, {
                userId,
                userName: userId,
                displayName: userId,
                messageCount: count,
                milestones: config.milestones,
            });
        },

        clear: () => {
            garden.getFlowerManager().clear();
            console.log('[gardenDebug] Garden cleared');
        },

        setCrownColor: (color: number | string) => {
            const hexColor = typeof color === 'string'
                ? parseInt(color.replace('#', ''), 16)
                : color;

            if (isNaN(hexColor)) {
                console.error('[gardenDebug] Invalid color value:', color);
                return;
            }

            garden.getVine().setCrownColor(hexColor);
            console.log(`[gardenDebug] Crown color set to 0x${hexColor.toString(16)}`);
        },

        forceStage: (stage: number) => {
            garden.getFlowerManager().forceStage(stage);
        },
    };

    (window as any).gardenDebug = debug;

    console.log('[LivingGarden] Debug controls available via window.gardenDebug');
    console.log('  gardenDebug.spawnTestFlower()');
    console.log('  gardenDebug.bulkSpawn(50)');
    console.log('  gardenDebug.spawnTestHeart()');
    console.log('  gardenDebug.triggerGiftBomb()');
    console.log('  gardenDebug.triggerCommand("wiggle")');
    console.log('  gardenDebug.emitSparkles(500, 500)');
    console.log('  gardenDebug.emitHearts(500, 500)');
    console.log('  gardenDebug.forceGust(2.5)');
    console.log('  gardenDebug.startDance()');
}
