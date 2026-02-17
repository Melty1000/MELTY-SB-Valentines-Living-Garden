import { Container, Sprite, Graphics } from 'pixi.js';
import { Flower, FlowerStage } from './Flower';
import { GlowingHeart } from './GlowingHeart';
import { Vine } from '../Vine';
import { AttachmentPoint } from '../vine/VineTypes';
import { FlowerCache, CacheType } from './FlowerCache';
import { EventBus, GardenEvents } from '../../core/EventBus';
import { userIdToColor, parseTwitchColor } from '../../utils/colors';
import { config } from '../../config';
import { stringToSeed } from '../../utils/math';
import { PersistenceManager, PersistentEntity } from '../../core/PersistenceManager';
import type { StreamerbotClient } from '../../connection/StreamerbotClient';
import type { ChatterEventData, SubscriptionEventData, GiftBombEventData, FollowEventData } from '../../connection/types';

interface FlowerRenderState {
  main: Sprite;
  glow: Sprite;
  graphics: Graphics;
}

export class FlowerManager extends Container {
  private flowers: Map<string, Flower & { attachT: number, strandIdx: number }> = new Map();
  private hearts: Map<string, GlowingHeart & { attachT: number, strandIdx: number }> = new Map();
  private archivedFlowers: Map<string, PersistentEntity> = new Map(); // Stored data for pruned users
  private ignoredUsers: Set<string> = new Set();
  private entityRenderMap: Map<string, FlowerRenderState> = new Map();

  private vine: Vine;
  private renderer: any = null;
  private occupiedPoints: AttachmentPoint[] = [];
  private lastPruneTime: number = 0; // Throttle forced pruning
  private lastPeriodicPruneBucket: number = -1;

  // High-performance layers
  private mainLayer: Container;
  private glowLayer: Container;
  private proceduralLayer: Container;

  private tracker = EventBus.createTracker();

  constructor(vine: Vine) {
    super();
    this.vine = vine;

    // Initialize optimized containers (PIXI v8 standard containers are highly optimized)
    this.mainLayer = new Container();
    this.glowLayer = new Container();
    this.glowLayer.blendMode = 'add';

    this.proceduralLayer = new Container();

    this.addChild(this.glowLayer);
    this.addChild(this.mainLayer);
    this.addChild(this.proceduralLayer);

    this.setupEventListeners();
  }

  public setRenderer(renderer: any): void {
    this.renderer = renderer;
  }

  private streamerbotClient: StreamerbotClient | null = null;
  public setStreamerbotClient(client: StreamerbotClient): void {
    this.streamerbotClient = client;
  }

  private setupEventListeners(): void {
    const { on } = this.tracker;

    on<ChatterEventData>(GardenEvents.CHATTER, (data) => {
      this.handleChatter(data);
    });

    on<SubscriptionEventData>(GardenEvents.SUBSCRIPTION, (data) => {
      this.handleSubscription(data);
    });

    on<{ color: string }>(GardenEvents.BROADCASTER_COLOR, (data) => {
      this.handleBroadcasterColor(data.color);
    });

    on<GiftBombEventData>(GardenEvents.GIFT_BOMB, (data) => {
      this.handleGiftBomb(data);
    });

    on<FollowEventData>(GardenEvents.FOLLOW, (data) => {
      this.handleFollow(data);
    });
  }

  private handleBroadcasterColor(colorHex: string): void {
    const color = parseInt(colorHex.replace('#', ''), 16);
    if (!isNaN(color)) {
      this.vine.setCrownColor(color);
    }
  }

  private async handleChatter(data: ChatterEventData): Promise<void> {

    // --- 1. Command Handling (!hideflower / !showflower) ---
    const msg = String(data.message || '').trim();
    if (msg.startsWith('!')) {
      const parts = msg.split(' ');
      const command = parts[0].toLowerCase();

      console.log(`[FlowerManager] Received Command: ${command} from ${data.userName} (Mod: ${data.isMod}, BC: ${data.isBroadcaster})`);
      const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : ''; // Normalize target

      if (data.isMod || data.isBroadcaster) {
        if (command === '!hideflower' && targetUser) {
          console.log(`[FlowerManager] Ignoring user: ${targetUser} (Requested by ${data.userName})`);
          this.ignoredUsers.add(targetUser);

          // Remove if they exist (Active or Archive)
          let existingUserId: string | undefined;

          // Check active (Search by UserName)
          for (const [key, f] of this.flowers.entries()) {
            if (f.data.userName.toLowerCase() === targetUser) existingUserId = key;
          }
          if (existingUserId) this.removeFlower(existingUserId);

          existingUserId = undefined;

          // Check archive (remove even from archive to "ban" fully)
          for (const [key, f] of this.archivedFlowers.entries()) {
            if (f.data.userName.toLowerCase() === targetUser) existingUserId = key;
          }
          if (existingUserId) {
            this.archivedFlowers.delete(existingUserId);
          }

          this.saveState();
          return;
        }

        if (command === '!showflower' && targetUser) {
          console.log(`[FlowerManager] Un-ignoring user: ${targetUser} (Requested by ${data.userName})`);
          this.ignoredUsers.delete(targetUser);
          this.saveState();
          return;
        }
      }
    }

    // --- 2. Ignore Check ---
    if (this.ignoredUsers.has(data.userName.toLowerCase()) || this.ignoredUsers.has(data.userId)) {
      // console.log(`[FlowerManager] Skipped ignored user: ${data.userName}`); // Verbose
      return;
    }


    let flower = this.flowers.get(data.userId);

    if (flower) {
      const oldStage = flower.stage;
      flower.data.messageCount += (data.messageCount || 1);

      // Actual growth trigger!
      flower.updateFromMessageCount(flower.data.messageCount, config.milestones);

      const newStage = flower.stage;

      // 1. Notify if stage changed (to trigger growth sparkles)
      if (newStage !== oldStage) {
        EventBus.emit(GardenEvents.FLOWER_GROW, { flower, stage: newStage });
      }
      // 2. Radiant Interaction: Spew light sparkles on every message
      else if (newStage === FlowerStage.Radiant) {
        EventBus.emit(GardenEvents.FLOWER_GROW, { flower, stage: newStage, interaction: true });
      }
    } else {
      // 1. Check Archive First
      if (this.archivedFlowers.has(data.userId)) {
        console.log(`[FlowerManager] Restoring archived flower for ${data.userName}`);
        const archived = this.archivedFlowers.get(data.userId)!;

        // Merge latest data with archived data (preserve progress)
        data.messageCount = (archived.data.messageCount || 0) + (data.messageCount || 1);

        // Re-spawn using archived stats logic
        const restored = this.spawnFlower(data);
        if (restored) {
          flower = restored as any;
          this.archivedFlowers.delete(data.userId); // Remove from archive once active
          EventBus.emit(GardenEvents.FLOWER_GROW, { flower, data });
        }
      } else {
        // 2. New Chatter: Trigger Quick Prune to free space if needed
        await this.reapZombies(performance.now() * 0.001, true);

        // Pre-emptively grow vine to ensure space
        this.updateVineGrowth(1);

        const newFlower = this.spawnFlower(data);
        if (newFlower) {
          flower = newFlower as any;
          EventBus.emit(GardenEvents.FLOWER_GROW, { flower, data });
          // Recalculate without extra, now that it's added
          this.updateVineGrowth();
        }
      }
    }

    this.saveState();
  }

  private updateVineGrowth(extraCount: number = 0): void {
    const flowerCount = this.flowers.size + this.hearts.size + extraCount;
    const threshold = config.vine.growthThreshold || 0;

    let growthTarget = config.vine.defaultGrowth;

    if (flowerCount >= threshold) {
      const flowersPerStep = config.vine.flowersPerStep || 5;
      const growthPerStep = config.vine.growthPerStep || 0.1;

      // Smooth linear scaling instead of stepped +1 jumps
      const excess = flowerCount - threshold;
      const progress = excess / flowersPerStep;

      growthTarget = Math.min(
        config.vine.maxGrowth,
        config.vine.defaultGrowth + (progress * growthPerStep)
      );
    }

    // console.log(`[FlowerManager] Growth Update: Entities=${flowerCount}, Target=${growthTarget.toFixed(3)}`);
    EventBus.emit(GardenEvents.VINE_GROWTH, growthTarget);
  }

  private spawnFlower(data: ChatterEventData, forcedPoint?: { t: number, strandIdx: number }): Flower | null {
    // preferredSlotType: 0 for Flower
    const point = forcedPoint ? { ...forcedPoint, occupied: true, slotIdx: -1 } : this.vine.getAvailableAttachmentPoint(this.occupiedPoints, 0);
    if (!point) return null;

    const twitchColor = parseTwitchColor(data.color);
    const color = twitchColor !== null ? twitchColor : userIdToColor(data.userId);
    const seed = stringToSeed(data.userId);

    const flower = new Flower(
      {
        userId: data.userId,
        userName: data.userName,
        displayName: data.displayName,
        messageCount: data.messageCount || 1,
        color: data.color,
      },
      color,
      seed
    );

    // Ensure these are assigned!
    flower.attachT = point.t;
    flower.strandIdx = point.strandIdx;

    // Always calculate stage from message count (ensures consistency with persistence)
    flower.updateFromMessageCount(data.messageCount, data.milestones || config.milestones, true);

    // Create render state for this flower
    const mainSprite = new Sprite();
    mainSprite.anchor.set(0.5);
    const glowSprite = new Sprite();
    glowSprite.anchor.set(0.5);
    const graphics = new Graphics();

    this.mainLayer.addChild(mainSprite);
    this.glowLayer.addChild(glowSprite);
    this.proceduralLayer.addChild(graphics);

    this.entityRenderMap.set(data.userId, { main: mainSprite, glow: glowSprite, graphics });
    this.flowers.set(data.userId, flower);
    this.occupiedPoints.push({ t: point.t, strandIdx: point.strandIdx, occupied: true, slotIdx: point.slotIdx });

    return flower;
  }

  private handleSubscription(data: SubscriptionEventData): void {
    if (this.hearts.has(data.userId)) return;

    // Force growth check before spawning (add 1 for the potential heart)
    this.updateVineGrowth(1);

    this.spawnHeart(data);

    // Only trigger burst for direct subs. Use generic GIFT_BOMB event for mass gifting to avoid spam.
    if (!data.isGift) {
      this.triggerPetalBurst();
    }

    this.saveState();
  }

  private handleGiftBomb(data: GiftBombEventData): void {
    // Pre-grow the vine for ALL incoming gifts at once
    this.updateVineGrowth(data.count);

    const timestamp = Date.now();
    let spawnedCount = 0;
    for (let i = 0; i < data.count; i++) {
      const syntheticData: SubscriptionEventData = {
        userId: `gift-bomb-${timestamp}-${i}`,
        userName: 'Gift',
        displayName: 'Gift',
        tier: data.tier || '1000',
        isGift: true,
        gifterName: data.displayName,
      };
      const heart = this.spawnHeart(syntheticData);
      if (heart) spawnedCount++;
    }

    console.log(`[FlowerManager] Gift Bomb Trace: Requested ${data.count}, Spawned ${spawnedCount}`);
    this.triggerPetalBurst();
    this.saveState();
  }

  private handleFollow(_data: FollowEventData): void {
    // 1. Full-width Rain (User Request: "The entire width")
    // Increased count to 100 for better density
    EventBus.emit(GardenEvents.PETAL_RAIN, { count: 100 });

    // 2. Spin all flowers (User Request)
    for (const flower of this.flowers.values()) {
      flower.startSpin();
    }
  }

  private triggerPetalBurst(): void {
    // Valentine's Palette for petals (Pinks/Reds/White)
    const VALENTINE_PALETTE = [0xE91E63, 0xFF4081, 0xF50057, 0xFF80AB, 0xFFFFFF];

    for (const flower of this.flowers.values()) {
      if (flower.stage > FlowerStage.Seed) {
        EventBus.emit(GardenEvents.PETAL_SPAWN, {
          x: flower.x,
          y: flower.y,
          count: 5,
          palette: VALENTINE_PALETTE
        });
      }
    }
  }

  private spawnHeart(data: SubscriptionEventData, forcedPoint?: { t: number, strandIdx: number }): GlowingHeart | null {
    // preferredSlotType: 1 for Heart
    const point = forcedPoint ? { ...forcedPoint, occupied: true, slotIdx: -1 } : this.vine.getAvailableAttachmentPoint(this.occupiedPoints, 1);

    if (!point) return null;

    // Reduced size by 3x (was 1.5, now 0.5)
    const heart = new GlowingHeart({
      userId: data.userId,
      userName: data.userName,
      tier: data.tier,
    }, config.heart.size * 0.5) as any;

    const time = performance.now() * 0.001;
    const pos = this.vine.getStrandPosition(point.t, point.strandIdx, time, 0);
    if (!pos) return null;

    heart.attachToPosition(pos.x, pos.y);
    heart.attachT = point.t;
    heart.strandIdx = point.strandIdx;
    point.occupied = true;

    this.hearts.set(data.userId, heart);
    this.occupiedPoints.push({ t: point.t, strandIdx: point.strandIdx, occupied: true, slotIdx: point.slotIdx });
    this.addChild(heart);

    return heart;
  }

  public getFlower(userId: string): Flower | undefined {
    return this.flowers.get(userId);
  }

  public getHeart(userId: string): GlowingHeart | undefined {
    return this.hearts.get(userId);
  }

  public getAllFlowers(): Flower[] {
    return Array.from(this.flowers.values());
  }

  public getFlowerCount(): number {
    return this.flowers.size;
  }

  public getHeartCount(): number {
    return this.hearts.size;
  }

  public forceStage(stage: FlowerStage): void {
    const flowers = Array.from(this.flowers.values());
    flowers.forEach(flower => {
      flower.setImmediateStage(stage);

      // Update message count to match the stage so it persists
      let requiredMessages = 1;
      switch (stage) {
        case FlowerStage.Bud: requiredMessages = config.milestones.bud; break;
        case FlowerStage.Blooming: requiredMessages = config.milestones.bloom; break;
        case FlowerStage.FullBloom: requiredMessages = config.milestones.full; break;
        case FlowerStage.MegaBloom: requiredMessages = config.milestones.mega || 50; break;
        case FlowerStage.Radiant: requiredMessages = config.milestones.radiant || 100; break;
      }
      // Only bump it up, don't downgrade if they have more? 
      // Actually, if we force a lower stage, we should probably lower the count too for consistency.
      flower.data.messageCount = requiredMessages;
    });
    this.saveState();
  }

  public update(deltaTime: number, windOffset: number = 0): void {
    const time = performance.now() * 0.001;

    // 1. Update Flowers (O(1) position lookup + Sprite Sync)
    for (const [userId, flower] of this.flowers.entries()) {
      const pos = this.vine.getStrandPosition(flower.attachT, flower.strandIdx, time, windOffset);
      if (pos) {
        flower.x = pos.x;
        flower.y = pos.y;
      }
      flower.update(deltaTime, windOffset);

      // Sync to optimized renderers
      const renderData = flower.getRenderData(this.renderer);
      const renderState = this.entityRenderMap.get(userId);

      if (renderState) {
        const { main, glow, graphics } = renderState;

        // Apex Predator Optimization: Use Cached Textures for Procedural Stages
        // Instead of drawing to Graphics every frame, we use a Sprite with a cached texture.
        if (renderData.isProcedural) {
          graphics.visible = false; // Disable the heavy graphics object
          main.visible = true;

          let cacheType = CacheType.Seed;
          if (renderData.stage === FlowerStage.Bud) cacheType = CacheType.Bud;
          else if (renderData.stage === FlowerStage.Blooming) {
            cacheType = renderData.openness < 0.3 ? CacheType.Bud : CacheType.Rose;
          } else if (renderData.stage > FlowerStage.Blooming) {
            cacheType = CacheType.Rose;
          }

          // So we fetch texture from cache:
          const tex = FlowerCache.getTexture(
            this.renderer,
            cacheType,
            renderData.size,
            renderData.color, // Passing actual color now
            renderData.openness
          );

          main.texture = tex;
          main.tint = 0xFFFFFF; // Reset Tint (Texture has colors baked in)
          main.position.set(flower.x, flower.y);
          main.rotation = flower.rotation;
          main.scale.set(renderData.scale);

          glow.visible = false;

        } else {
          graphics.visible = false;
          main.visible = true;
          main.tint = 0xFFFFFF; // Reset tint for full Roses
          main.texture = renderData.texture;
          main.position.set(flower.x, flower.y);
          main.rotation = flower.rotation;
          main.scale.set(renderData.scale);

          if (renderData.glowTexture) {
            glow.visible = true;
            glow.texture = renderData.glowTexture;
            glow.position.set(flower.x, flower.y);
            glow.rotation = flower.rotation;
            glow.scale.set(renderData.scale * renderData.radiantFactor);
            glow.alpha = renderData.radiantFactor;
          } else {
            glow.visible = false;
          }
        }
      }
    }

    // 2. Update Hearts
    for (const heart of this.hearts.values()) {
      const pos = this.vine.getStrandPosition(heart.attachT, heart.strandIdx, time, windOffset);
      if (pos) {
        heart.x = pos.x;
        heart.y = pos.y;
      }
      heart.update(deltaTime, windOffset);
    }

    // 3. The Reaper: periodic fallback prune check.
    // Run at most once per interval bucket to avoid multi-frame bursts.
    if (time > 60 && this.flowers.size > 20) {
      const pruneIntervalSeconds = 1800;
      const bucket = Math.floor(time / pruneIntervalSeconds);
      if (bucket > this.lastPeriodicPruneBucket) {
        this.lastPeriodicPruneBucket = bucket;
        this.reapZombies(time);
      }
    }
  }

  /**
   * Prunes users who are no longer present in chat/viewer list.
   * @param now Current time in seconds.
   * @param force Forced check (e.g. on new chatter arrival). If false, runs on 30m interval.
   */
  private async reapZombies(now: number, force: boolean = false): Promise<void> {
    const timeout = config.flower.zombieTimeout || 1800; // Default 30 minutes

    // Throttle forced checks (minimum 15s between checks to save API)
    if (force && (now - this.lastPruneTime < 15)) {
      return;
    }
    this.lastPruneTime = now;

    const toRemove: string[] = [];

    // 1. Time-based fallback (Safety net) - Only run this on the long interval
    if (!force) {
      for (const [userId, flower] of this.flowers.entries()) {
        if (now - flower.getLastInteraction() > timeout) {
          console.log(`[FlowerManager] Pruning timed-out user (Fallback): ${flower.data.userName}`);
          toRemove.push(userId);
        }
      }
    }

    // 2. Presence-based pruning (Smart)
    if (this.streamerbotClient && this.streamerbotClient.isConnected()) {
      try {
        const viewers = await this.streamerbotClient.getViewers();

        // Only prune based on presence if we actually got a valid list
        if (viewers && viewers.length > 0) {
          // Create a Set for O(1) lookups. Normalize to lowercase for safety.
          const currentViewerIds = new Set(viewers.map(v => v.userId));
          const currentViewerNames = new Set(viewers.map(v => v.userName.toLowerCase()));

          // Check every flower owner
          for (const [userId, flower] of this.flowers.entries()) {
            // Skip if already marked for time-out
            if (toRemove.includes(userId)) continue;

            const isPresent = currentViewerIds.has(userId) || currentViewerNames.has(flower.data.userName.toLowerCase());

            // Strict Pruning: If they aren't here, they go to the archive. No strikes.
            if (!isPresent) {
              console.log(`[FlowerManager] Pruning absent user (Moving to Archive): ${flower.data.userName} (${userId})`);
              toRemove.push(userId);
            }
          }
        }
      } catch (err) {
        console.warn('[FlowerManager] Failed to prune by presence:', err);
      }
    }

    if (toRemove.length > 0) {
      toRemove.forEach(uid => this.removeFlower(uid, { save: false }));
      this.saveState();
    }
  }

  public removeFlower(
    userId: string,
    options: { archive?: boolean; save?: boolean } = {}
  ): void {
    const { archive = true, save = true } = options;
    const flower = this.flowers.get(userId);
    if (flower) {
      if (archive) {
        // Store exact state so we can restore it later.
        this.archivedFlowers.set(userId, {
          userId,
          data: flower.data,
          attachT: flower.attachT,
          strandIdx: flower.strandIdx
        });
      }

      // Remove from occupancy list
      this.occupiedPoints = this.occupiedPoints.filter(p => p.t !== flower.attachT || p.strandIdx !== flower.strandIdx);

      const pts = this.vine.getAttachmentPoints();
      const pt = pts.find(p => p.t === flower.attachT && p.strandIdx === flower.strandIdx);
      if (pt) pt.occupied = false;

      // Clean up sprites
      const renderState = this.entityRenderMap.get(userId);
      if (renderState) {
        this.mainLayer.removeChild(renderState.main);
        this.glowLayer.removeChild(renderState.glow);
        this.proceduralLayer.removeChild(renderState.graphics);
        renderState.main.destroy();
        renderState.glow.destroy();
        renderState.graphics.destroy();
        this.entityRenderMap.delete(userId);
      }

      flower.destroy();
      this.flowers.delete(userId);
      if (save) {
        this.saveState();
      }
    }
  }

  triggerWiggle(userId?: string): void {
    if (userId) {
      const flower = this.flowers.get(userId);
      if (flower) flower.startWobble(1);
    } else {
      for (const flower of this.flowers.values()) {
        flower.startWobble(0.5 + Math.random() * 0.5);
      }
    }
  }

  clear(options: {
    archiveRemovedFlowers?: boolean;
    clearArchivedFlowers?: boolean;
    clearIgnoredUsers?: boolean;
  } = {}): void {
    const {
      archiveRemovedFlowers = true,
      clearArchivedFlowers = false,
      clearIgnoredUsers = false,
    } = options;

    for (const userId of Array.from(this.flowers.keys())) {
      this.removeFlower(userId, { archive: archiveRemovedFlowers, save: false });
    }
    for (const heart of this.hearts.values()) {
      heart.destroy();
      this.removeChild(heart);
    }
    this.hearts.clear();
    if (clearArchivedFlowers) {
      this.archivedFlowers.clear();
    }
    if (clearIgnoredUsers) {
      this.ignoredUsers.clear();
    }
    this.occupiedPoints = []; // CRITICAL: Reset spacing tracking
    this.vine.resetAttachmentPoints();
    this.saveState();
  }

  public saveState(): void {
    const flowers = Array.from(this.flowers.entries()).map(([userId, f]) => ({
      userId,
      data: f.data,
      attachT: f.attachT,
      strandIdx: f.strandIdx
      // Stage is intentionally NOT saved to force recalculation from messageCount
    }));

    const hearts = Array.from(this.hearts.entries()).map(([userId, h]) => ({
      userId,
      data: (h as any).data,
      attachT: (h as any).attachT,
      strandIdx: (h as any).strandIdx
    }));

    PersistenceManager.save({
      flowers,
      hearts,
      archivedFlowers: Array.from(this.archivedFlowers.values()),
      ignoredUsers: Array.from(this.ignoredUsers),
      growth: this.vine.getGrowth(),
      crownColor: this.vine.getCrownColor()
    });
  }

  public restoreState(state: any): void {
    console.log('[FlowerManager] Restoring state...', state);

    // Restore Crown Color if present
    if (state.crownColor !== undefined) {
      console.log(`[FlowerManager] Restoring crown color: ${state.crownColor.toString(16)}`);
      this.vine.setCrownColor(state.crownColor);
    }

    if (state.flowers && state.flowers.length > 0) {
      console.log(`[FlowerManager] Spawning ${state.flowers.length} flowers from state...`);
      state.flowers.forEach((f: any) => {
        // Validation: Ensure attachT and strandIdx are numbers
        let forcedPoint = undefined;
        if (typeof f.attachT === 'number' && typeof f.strandIdx === 'number') {
          forcedPoint = { t: f.attachT, strandIdx: f.strandIdx };
        }

        // Recalculate from messageCount to ensure visual state matches data
        const flower = this.spawnFlower(f.data, forcedPoint);
        if (!flower) console.warn(`[FlowerManager] Failed to restore flower ${f.userId}`);
      });
    }

    if (state.archivedFlowers) {
      console.log(`[FlowerManager] Restoring ${state.archivedFlowers.length} archived flowers...`);
      state.archivedFlowers.forEach((f: PersistentEntity) => {
        this.archivedFlowers.set(f.userId, f);
      });
    }

    if (state.ignoredUsers) {
      console.log(`[FlowerManager] Restoring ${state.ignoredUsers.length} ignored users...`);
      state.ignoredUsers.forEach((u: string) => this.ignoredUsers.add(u));
    }

    if (state.hearts) {
      state.hearts.forEach((h: any) => {
        let forcedPoint = undefined;
        if (typeof h.attachT === 'number' && typeof h.strandIdx === 'number') {
          forcedPoint = { t: h.attachT, strandIdx: h.strandIdx };
        }
        this.spawnHeart(h.data, forcedPoint);
      });
    }
  }

  destroy(): void {
    this.tracker.unsubscribeAll();
    this.flowers.forEach(f => f.destroy());
    this.hearts.forEach(h => h.destroy());
    super.destroy();
  }
}
