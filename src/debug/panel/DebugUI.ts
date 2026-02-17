import { EventBus, GardenEvents } from '../../core/EventBus';
import { FlowerStage } from '../../garden/flowers/Flower';
import { config } from '../../config';
import { generateDebugHTML } from './DebugTemplate';
import { PersistenceManager } from '../../core/PersistenceManager';

interface DebugUIOptions {
    garden: any;
    particleManager: any;
    windSway: any;
    danceEffect: any;
    streamerbotClient: any;
    ticker: any;
}

export class DebugUI {
    private container: HTMLDivElement;
    private options: DebugUIOptions;
    private isVisible: boolean = false;
    private fps: number = 0;
    private lastUpdate: number = 0;
    private frameCount: number = 0;
    private lastFpsUpdate: number = 0;
    private activeTimeouts: number[] = [];
    private statusRefreshTimeout: number | null = null;
    private readonly onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'F9') {
            this.toggle();
        }
    };

    constructor(options: DebugUIOptions) {
        this.options = options;
        this.container = document.createElement('div');
        this.container.id = 'debug-ui';
        this.setupContainer();
        this.render();
        this.setupListeners();
        this.updateStatus();

        // Check initial visibility from localStorage
        const savedVisibility = localStorage.getItem('garden_debug_visible');
        if (savedVisibility === 'true') {
            this.show();
        }
    }

    private setupContainer(): void {
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            width: '340px',
            maxHeight: 'calc(100vh - 40px)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '12px',
            zIndex: '999999',
            overflowY: 'auto',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            border: '1px solid #334155',
            display: 'none',
            backdropFilter: 'blur(8px)',
        });
        document.body.appendChild(this.container);
    }

    private render(): void {
        this.container.innerHTML = generateDebugHTML();
        this.restorePanelStates();
    }

    private setupListeners(): void {
        // F9 Toggle
        window.addEventListener('keydown', this.onKeyDown);

        // Button actions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Handle collapsible panels
            if (target.tagName === 'H2') {
                const panel = target.closest('.panel');
                if (panel) {
                    panel.classList.toggle('collapsed');
                    target.classList.toggle('collapsed');
                    this.savePanelStates();
                }
                return;
            }

            // Improved delegation using closest() to catch clicks on children (icons, etc)
            const btn = (e.target as HTMLElement).closest('[data-action]');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const value = btn.getAttribute('data-value') || undefined;

            if (action) {
                // console.log(`[DebugUI] Action: ${action}, Value: ${value}`);
                this.handleAction(action, value);
            }

            // Handle copy-to-console
            const copyText = target.getAttribute('data-copy');
            if (copyText) {
                navigator.clipboard.writeText(copyText);
                const originalText = target.innerText;
                target.innerText = 'COPIED!';
                target.style.background = '#16a34a';
                setTimeout(() => {
                    target.innerText = originalText;
                    target.style.background = '#0f172a';
                }, 1000);
            }
        });

        // Real-time slider updates
        const sliders = ['wind-speed', 'gust-intensity', 'dance-intensity', 'dance-duration', 'vine-growth', 'global-scale'];
        sliders.forEach(id => {
            const slider = this.container.querySelector(`#${id}`) as HTMLInputElement;
            if (slider) {
                slider.addEventListener('input', () => {
                    const valDisplay = this.container.querySelector(`#${id.replace('intensity', 'value').replace('speed', 'value').replace('duration', 'duration-value').replace('growth', 'value').replace('scale', 'value')}`);
                    if (valDisplay) valDisplay.textContent = slider.value;

                    // Live apply for some sliders
                    if (id === 'wind-speed') {
                        const speed = parseFloat(slider.value);
                        this.options.windSway?.setBaseSpeed?.(speed);
                    } else if (id === 'vine-growth') {
                        this.options.garden?.getVine()?.setGrowth?.(parseFloat(slider.value));
                    }
                });
            }
        });

        // Toggles
        const toggles = ['toggle-shadows', 'toggle-particles', 'toggle-glow', 'toggle-crown', 'toggle-crown-glow'];
        toggles.forEach(id => {
            const checkbox = this.container.querySelector(`#${id}`) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    const checked = checkbox.checked;
                    if (id === 'toggle-particles') {
                        if (this.options.particleManager) this.options.particleManager.visible = checked;
                    } else if (id === 'toggle-crown') {
                        const crown = this.options.garden.getVine()?.getCrownFlower();
                        if (crown) crown.visible = checked;
                    } else {
                        console.warn(`[DebugUI] Toggle ${id} not fully implemented yet.`);
                    }
                });
            }
        });
    }

    private savePanelStates(): void {
        const states: Record<string, boolean> = {};
        this.container.querySelectorAll('h2').forEach((h2, i) => {
            states[`panel_${i}`] = h2.classList.contains('collapsed');
        });
        localStorage.setItem('garden_debug_panels', JSON.stringify(states));
    }

    private restorePanelStates(): void {
        const saved = localStorage.getItem('garden_debug_panels');
        if (!saved) return;
        try {
            const states = JSON.parse(saved);
            this.container.querySelectorAll('h2').forEach((h2, i) => {
                if (states[`panel_${i}`]) {
                    h2.classList.add('collapsed');
                    h2.closest('.panel')?.classList.add('collapsed');
                }
            });
        } catch {
            // Ignore malformed persisted panel state.
        }
    }

    public show(): void {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;
        localStorage.setItem('garden_debug_visible', 'true');
        this.updateStatus();
    }

    public hide(): void {
        this.container.style.display = 'none';
        this.isVisible = false;
        localStorage.setItem('garden_debug_visible', 'false');
    }

    public toggle(): void {
        if (this.isVisible) this.hide();
        else this.show();
    }

    public update(): void {
        if (!this.isVisible) return;

        const now = performance.now();

        // --- High Precision Independent FPS Calculation ---
        this.frameCount++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
        // --------------------------------------------------

        // Update UI every 500ms
        if (now - this.lastUpdate > 500) {
            this.lastUpdate = now;
            this.updateStatus();
        }
    }

    private updateStatus(): void {
        const fpsEl = this.container.querySelector('#fps-display');
        const statusEl = this.container.querySelector('#debug-status');

        if (fpsEl) {
            fpsEl.textContent = `FPS: ${this.fps}`;
            // Color coding
            if (this.fps >= 55) fpsEl.setAttribute('style', 'font-family: monospace; font-size: 14px; margin-bottom: 8px; color: #10b981;');
            else if (this.fps >= 40) fpsEl.setAttribute('style', 'font-family: monospace; font-size: 14px; margin-bottom: 8px; color: #f59e0b;');
            else fpsEl.setAttribute('style', 'font-family: monospace; font-size: 14px; margin-bottom: 8px; color: #ef4444;');
        }

        if (statusEl) {
            const flowerCount = this.options.garden?.getFlowerManager()?.getFlowerCount() ?? 0;
            const heartCount = this.options.garden?.getFlowerManager()?.getHeartCount() ?? 0;
            const isDancing = this.options.garden?.isDancing ?? false;
            const isSBCConnected = this.options.streamerbotClient?.isConnected() ?? false;

            statusEl.innerHTML = `
              <span>🌸 <b>${flowerCount}</b> Flowers</span>
              <span>🩷 <b>${heartCount}</b> Hearts</span>
              <span>💃 <b>${isDancing ? 'ON' : 'OFF'}</b></span>
              <span>🔌 <b>${isSBCConnected ? 'LIVE' : 'DOWN'}</b></span>
            `;
        }
    }

    private handleAction(action: string, value?: string): void {
        const getVal = (id: string) => (this.container.querySelector(`#${id}`) as HTMLInputElement)?.value;
        const getNum = (id: string, def = 0) => parseFloat(getVal(id)) || def;
        const getColor = (id: string) => parseInt(getVal(id).replace('#', ''), 16);

        // Grid Button Active State Helper
        const updateActiveGrid = (btnAction: string, btnValue: string) => {
            const btns = this.container.querySelectorAll(`button[data-action="${btnAction}"]`);
            btns.forEach(b => {
                if (b.getAttribute('data-value') === btnValue) b.classList.add('active');
                else b.classList.remove('active');
            });
        };

        // Unique ID helper
        const testId = () => `debug_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        switch (action) {
            case 'close': this.hide(); break;
            case 'refresh-status': this.updateStatus(); break;
            case 'reconnect':
                this.options.streamerbotClient?.disconnect();
                this.options.streamerbotClient?.connect();
                this.updateStatus();
                break;
            case 'disconnect':
                this.options.streamerbotClient?.disconnect();
                this.updateStatus();
                break;
            case 'hard-reset': {
                console.log('[DebugUI] Hard Reset triggered directly.');
                this.options.garden?.getFlowerManager()?.clear({
                    archiveRemovedFlowers: false,
                    clearArchivedFlowers: true,
                    clearIgnoredUsers: true,
                });
                this.options.garden?.setGrowth(config.vine.defaultGrowth);
                PersistenceManager.clear();
                this.updateStatus();
                // Optional: visual feedback that it happened?
                const btn = this.container.querySelector('button[data-action="hard-reset"]') as HTMLElement;
                if (btn) {
                    const originalText = btn.innerText;
                    btn.innerText = 'RESETTING...';
                    setTimeout(() => btn.innerText = originalText, 1000);
                }
                break;
            }

            // Flowers
            case 'spawn-flower':
                EventBus.emit(GardenEvents.CHATTER, {
                    userId: testId(),
                    userName: 'DebugUser',
                    displayName: 'DebugUser',
                    messageCount: 1,
                    color: getVal('flower-color'),
                    milestones: config.milestones,
                });
                break;
            case 'spawn-heart':
                EventBus.emit(GardenEvents.SUBSCRIPTION, {
                    userId: testId(),
                    userName: 'DebugSub',
                    displayName: 'DebugSub',
                    tier: '1000',
                });
                break;
            case 'bulk-spawn': {
                const count = getNum('bulk-count', 10);
                console.log(`[DebugUI] Spawning ${count} flowers...`);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => this.handleAction('spawn-flower'), i * 50);
                }
                break;
            }
            case 'clear-flowers':
                this.options.garden?.getFlowerManager()?.clear();
                this.activeTimeouts.forEach(t => clearTimeout(t));
                this.activeTimeouts = [];
                console.log('[DebugUI] Garden cleared');
                break;
            case 'force-stage':
                if (value !== undefined) {
                    const stage = parseInt(value) as FlowerStage;
                    const manager = this.options.garden?.getFlowerManager();
                    if (manager) {
                        // UX Fix: If garden is empty, spawn a flower so the user sees something happen
                        if (manager.getFlowerCount() === 0) {
                            console.log('[DebugUI] Force Stage clicked on empty garden. Spawning debug flower first...');
                            this.handleAction('spawn-flower');
                        }

                        manager.forceStage(stage);
                        updateActiveGrid('force-stage', value);
                    }
                }
                break;

            // Particles
            case 'emit-sparkles':
                this.options.particleManager?.emitSparkles(getNum('particle-x'), getNum('particle-y'), getNum('particle-count'));
                break;
            case 'emit-hearts':
                this.options.particleManager?.emitHearts(getNum('particle-x'), getNum('particle-y'), getNum('particle-count'));
                break;
            case 'emit-petals':
                this.options.particleManager?.emitPetals(getNum('particle-x'), getNum('particle-y'), getNum('particle-count'));
                break;
            case 'emit-sparkles-burst':
                this.options.particleManager?.emitSparkles(window.innerWidth / 2, window.innerHeight / 2, 100);
                break;
            case 'emit-hearts-burst':
                this.options.particleManager?.emitHearts(window.innerWidth / 2, window.innerHeight / 2, 100);
                break;
            case 'clear-particles':
                this.options.particleManager?.clear();
                this.activeTimeouts.forEach(t => clearTimeout(t));
                this.activeTimeouts = [];
                break;

            // Wind
            case 'force-gust':
                this.options.windSway?.forceGust(performance.now() * 0.001, getNum('gust-intensity', 1));
                break;
            case 'gentle-breeze': this.options.windSway?.forceGust(performance.now() * 0.001, 0.5); break;
            case 'strong-gust': this.options.windSway?.forceGust(performance.now() * 0.001, 2.5); break;
            case 'hurricane': this.options.windSway?.forceGust(performance.now() * 0.001, 5.0); break;
            case 'toggle-wind': {
                const speed = parseFloat(getVal('wind-speed'));
                this.options.windSway?.setBaseSpeed(speed > 0 ? 0 : 1);
                (this.container.querySelector('#wind-speed') as HTMLInputElement).value = speed > 0 ? '0' : '1';
                break;
            }

            // Events
            case 'event-chatter':
                EventBus.emit(GardenEvents.CHATTER, {
                    userId: testId(),
                    userName: 'NewChatter',
                    displayName: 'NewChatter',
                    messageCount: 1,
                    milestones: config.milestones,
                });
                break;
            case 'event-subscription':
                EventBus.emit(GardenEvents.SUBSCRIPTION, {
                    userId: testId(),
                    userName: 'NewSub',
                    displayName: 'NewSub',
                    tier: '1000',
                });
                break;
            case 'event-follow':
                EventBus.emit(GardenEvents.FOLLOW, {
                    userId: testId(),
                    userName: 'NewFollower',
                    displayName: 'NewFollower',
                });
                break;
            case 'event-channel-points':
                console.warn('[DebugUI] Channel points simulation is not implemented.');
                break;
            case 'event-gift-bomb':
                EventBus.emit(GardenEvents.GIFT_BOMB, {
                    userId: testId(),
                    userName: 'Gifter',
                    displayName: 'Gifter',
                    count: getNum('gift-count', 5),
                });
                break;
            case 'event-raid':
                EventBus.emit(GardenEvents.RAID, {
                    userId: 'raider',
                    viewers: getNum('raid-viewers', 50),
                    displayName: 'Raider',
                });
                break;
            case 'mass-event':
                this.handleAction('event-chatter');
                this.handleAction('event-subscription');
                this.handleAction('event-gift-bomb');
                this.handleAction('event-raid');
                break;

            // Dance
            case 'start-dance':
                config.dance.intensity = getNum('dance-intensity', 1);
                config.dance.duration = getNum('dance-duration', 10) * 1000;
                this.options.garden?.startDance();
                break;
            case 'stop-dance':
                this.options.garden?.stopDance();
                break;

            // Vine
            case 'set-growth':
                this.options.garden?.setGrowth(getNum('vine-growth', 1));
                break;
            case 'grow-vine':
                this.options.garden?.setGrowth(config.vine.maxGrowth);
                break;
            case 'reset-vine':
                this.options.garden?.setGrowth(0.1);
                this.options.garden?.getFlowerManager()?.clear();
                break;
            case 'set-crown-color':
                this.options.garden?.getVine()?.setCrownColor(getColor('crown-color'));
                break;
            case 'set-crown-type':
                if (value) {
                    this.options.garden?.getVine()?.getCrownFlower?.()?.setType?.(value);
                    updateActiveGrid('set-crown-type', value);
                }
                break;
            case 'toggle-crown': {
                const crown = this.options.garden?.getVine()?.getCrownFlower?.();
                if (crown) crown.visible = !crown.visible;
                break;
            }

            // Commands
            case 'cmd-wiggle': EventBus.emit(GardenEvents.COMMAND, { command: 'wiggle' }); break;
            case 'cmd-shake': EventBus.emit(GardenEvents.COMMAND, { command: 'shake' }); break;
            case 'cmd-pulse': EventBus.emit(GardenEvents.COMMAND, { command: 'pulse' }); break;
            case 'cmd-wave': EventBus.emit(GardenEvents.COMMAND, { command: 'wave' }); break;
            case 'cmd-bloom': EventBus.emit(GardenEvents.COMMAND, { command: 'bloom' }); break;
            case 'cmd-sparkle': EventBus.emit(GardenEvents.COMMAND, { command: 'sparkle' }); break;
            case 'cmd-dance': EventBus.emit(GardenEvents.COMMAND, { command: 'dance' }); break;
            case 'cmd-grow': EventBus.emit(GardenEvents.COMMAND, { command: 'grow' }); break;
            case 'run-custom-command': {
                const customCmd = (this.container.querySelector('#custom-command') as HTMLInputElement)?.value;
                if (customCmd) EventBus.emit(GardenEvents.COMMAND, { command: customCmd });
                break;
            }

            // Display
            case 'apply-scale': {
                const scale = getNum('global-scale', 1);
                this.options.garden.scale.set(scale);
                break;
            }

            // Stress
            case 'stress-flowers':
                for (let i = 0; i < 100; i++) {
                    const t = window.setTimeout(() => this.handleAction('spawn-flower'), i * 10);
                    this.activeTimeouts.push(t);
                }
                break;
            case 'stress-particles':
                for (let i = 0; i < 10; i++) {
                    const t = window.setTimeout(() => this.handleAction('emit-sparkles-burst'), i * 100);
                    this.activeTimeouts.push(t);
                }
                break;
            case 'stress-all':
                this.handleAction('stress-flowers');
                this.handleAction('stress-particles');
                this.handleAction('event-raid');
                this.handleAction('start-dance');
                break;

            // Presets
            case 'preset-calm':
                this.handleAction('clear-flowers');
                setTimeout(() => {
                    for (let i = 0; i < 5; i++) this.handleAction('spawn-flower');
                }, 100);
                break;
            case 'preset-party':
                this.handleAction('bulk-spawn');
                setTimeout(() => this.handleAction('start-dance'), 500);
                break;
            case 'preset-romantic':
                this.handleAction('clear-flowers');
                setTimeout(() => {
                    for (let i = 0; i < 10; i++) this.handleAction('spawn-heart');
                    this.handleAction('set-crown-color'); // Uses color from picker
                }, 100);
                break;
            case 'preset-storm':
                this.handleAction('hurricane');
                this.handleAction('cmd-shake');
                break;
            case 'preset-empty':
                this.handleAction('clear-flowers');
                this.handleAction('clear-particles');
                this.handleAction('grow-vine'); // This actually sets growth to 1, maybe reset-vine is better
                this.options.garden?.getVine()?.setGrowth(0);
                break;

            default:
                console.log(`[DebugUI] Unknown action: ${action}`);
        }

        this.queueStatusUpdate();
    }

    private queueStatusUpdate(): void {
        if (this.statusRefreshTimeout !== null) {
            clearTimeout(this.statusRefreshTimeout);
        }
        this.statusRefreshTimeout = window.setTimeout(() => {
            this.statusRefreshTimeout = null;
            this.updateStatus();
        }, 100);
    }

    destroy(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        this.activeTimeouts.forEach(t => clearTimeout(t));
        this.activeTimeouts = [];
        if (this.statusRefreshTimeout !== null) {
            clearTimeout(this.statusRefreshTimeout);
            this.statusRefreshTimeout = null;
        }
        this.container.remove();
    }
}
