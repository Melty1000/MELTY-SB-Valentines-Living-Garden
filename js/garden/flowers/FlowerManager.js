import { Container, Sprite, Graphics } from 'pixi.js'; // Added Graphics back
import { Flower, FlowerStage } from './Flower.js';
import { GlowingHeart } from './GlowingHeart.js';
import { Vine } from '../Vine.js';
// @ts-ignore
import { StrandPoint, AttachmentPoint } from '../vine/VineTypes.js';
import { FlowerCache, CacheType } from './FlowerCache.js';
import { EventBus, GardenEvents } from '../../core/EventBus.js';
import { userIdToColor, parseTwitchColor } from '../../utils/colors.js';
import { config } from '../../config.js';
import { stringToSeed } from '../../utils/math.js';
import { PersistenceManager } from '../../core/PersistenceManager.js';
export class FlowerManager extends Container {
  flowers = new Map();
  hearts = new Map();
  entityRenderMap = new Map();
  vine;
  renderer = null;
  occupiedPoints = [];

  // High-performance layers
  mainLayer;
  glowLayer;
  proceduralLayer;
  tracker = EventBus.createTracker();

  constructor(vine) {
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
  setRenderer(renderer) {
    this.renderer = renderer;
  }
  setupEventListeners() {
    const { on } = this.tracker;

    on(GardenEvents.CHATTER, (data) => {
      this.handleChatter(data);
    });

    on(GardenEvents.SUBSCRIPTION, (data) => {
      this.handleSubscription(data);
    });

    on<{ color: string }>(GardenEvents.BROADCASTER_COLOR, (data) => {
      this.handleBroadcasterColor(data.color);
    });

    on(GardenEvents.GIFT_BOMB, (data) => {
      this.handleGiftBomb(data);
    });

    on(GardenEvents.FOLLOW, (data) => {
      this.handleFollow(data);
    });
  }
  handleBroadcasterColor(colorHex) {
    const color = parseInt(colorHex.replace('#', ''), 16);
    if (!isNaN(color)) {
      this.vine.setCrownColor(color);
    }
  }
  handleChatter(data) {
    let flower = this.flowers.get(data.userId);

    if (flower) {
      flower.data.messageCount += (data.messageCount || 1);
      // Actual growth trigger!
      flower.updateFromMessageCount(flower.data.messageCount, config.milestones);
    } else {
      // New Chatter: Pre-emptively grow vine to ensure space
      this.updateVineGrowth(1);

      const newFlower = this.spawnFlower(data);
      if (newFlower) {
        flower = newFlower;
        EventBus.emit(GardenEvents.FLOWER_GROW, { flower, data });
        // Recalculate without extra, now that it's added
        this.updateVineGrowth();
      }
    }

    this.saveState();
  }
  updateVineGrowth(extraCount = 0) {
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

    // console.log(`[FlowerManager] Growth Update =${flowerCount}, Target=${growthTarget.toFixed(3)}`);
    EventBus.emit(GardenEvents.VINE_GROWTH, growthTarget);
  }
  spawnFlower(data, forcedPoint?: { t, strandIdx: number }, stage?: FlowerStage) | null {
    // preferredSlotType: 0 for Flower
    const point = forcedPoint ? { ...forcedPoint, occupied, slotIdx: -1 } : this.vine.getAvailableAttachmentPoint(this.occupiedPoints, 0);
    if (!point) return null;

    const twitchColor = parseTwitchColor(data.color);
    const color = twitchColor !== null ? twitchColor : userIdToColor(data.userId);
    const seed = stringToSeed(data.userId);

    const flower = new Flower(
      {
        userId: data.userId,
        userName: data.userName,
        displayName: data.displayName,
        messageCount: data.messageCount,
        color: data.color,
      },
      color,
      seed
    );

    if (stage !== undefined) {
      flower.setImmediateStage(stage);
    }

    const time = performance.now() * 0.001;
    const pos = this.vine.getStrandPosition(point.t, point.strandIdx, time, 0);
    if (!pos) return null;

    flower.x = pos.x;
    flower.y = pos.y;
    flower.attachT = point.t;
    flower.strandIdx = point.strandIdx;
    point.occupied = true;

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

    this.entityRenderMap.set(data.userId, { main, glow, graphics });
    this.flowers.set(data.userId, flower);
    this.occupiedPoints.push({ t: point.t, strandIdx: point.strandIdx, occupied, slotIdx: point.slotIdx });

    return flower;
  }
  handleSubscription(data) {
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
  handleGiftBomb(data) {
    // Pre-grow the vine for ALL incoming gifts at once
    this.updateVineGrowth(data.count);

    const timestamp = Date.now();
    let spawnedCount = 0;
    for (let i = 0; i < data.count; i++) {
      const syntheticData = {
        userId: `gift-bomb-${timestamp}-${i}`,
        userName: 'Gift',
        displayName: 'Gift',
        tier: data.tier || '1000',
        isGift,
        gifterName: data.displayName,
      };
      const heart = this.spawnHeart(syntheticData);
      if (heart) spawnedCount++;
    }

    console.log(`[FlowerManager] Gift Bomb Trace: Requested ${data.count}, Spawned ${spawnedCount}`);
    this.triggerPetalBurst();
    this.saveState();
  }
  handleFollow(_data) {
    // Rain petals for follows (global effect)
    EventBus.emit(GardenEvents.PETAL_RAIN, { count: 60 });
  }
  triggerPetalBurst() {
    // Valentine's Palette for petals (Pinks/Reds/White)
    const VALENTINE_PALETTE = [0xE91E63, 0xFF4081, 0xF50057, 0xFF80AB, 0xFFFFFF];

    for (const flower of this.flowers.values()) {
      if (flower.stage > FlowerStage.Seed) {
        EventBus.emit(GardenEvents.PETAL_SPAWN, {
          x: flower.x,
          y: flower.y,
          count,
          palette: VALENTINE_PALETTE
        });
      }
    }
  }
  spawnHeart(data, forcedPoint?: { t, strandIdx: number }) | null {
    // preferredSlotType: 1 for Heart
    const point = forcedPoint ? { ...forcedPoint, occupied, slotIdx: -1 } : this.vine.getAvailableAttachmentPoint(this.occupiedPoints, 1);

    if (!point) return null;

    // Reduced size by 3x (was 1.5, now 0.5)
    const heart = new GlowingHeart({
      userId: data.userId,
      userName: data.userName,
      tier: data.tier,
    }, config.heart.size * 0.5);

    const time = performance.now() * 0.001;
    const pos = this.vine.getStrandPosition(point.t, point.strandIdx, time, 0);
    if (!pos) return null;

    heart.attachToPosition(pos.x, pos.y);
    heart.attachT = point.t;
    heart.strandIdx = point.strandIdx;
    point.occupied = true;

    this.hearts.set(data.userId, heart);
    this.occupiedPoints.push({ t: point.t, strandIdx: point.strandIdx, occupied, slotIdx: point.slotIdx });
    this.addChild(heart);

    return heart;
  }
  getFlower(userId) | undefined {
    return this.flowers.get(userId);
  }
  getHeart(userId) | undefined {
    return this.hearts.get(userId);
  }
  getAllFlowers() {
    return Array.from(this.flowers.values());
  }
  getFlowerCount() {
    return this.flowers.size;
  }
  getHeartCount() {
    return this.hearts.size;
  }
  forceStage(stage) {
    const flowers = Array.from(this.flowers.values());
    flowers.forEach(flower => {
      flower.setImmediateStage(stage);
    });
  }
  update(deltaTime, windOffset = 0) {
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
          if (renderData.stage === FlowerStage.Blooming && renderData.openness < 0.3) cacheType = CacheType.Bud;

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

    // 3. The Reaper: Check for inactive flowers every few seconds
    if (Math.floor(time) % 10 === 0 && this.flowers.size > 20) {
      this.reapZombies(time);
    }
  }
  reapZombies(now) {
    const timeout = config.flower.zombieTimeout || 3600;
    const toRemove = [];

    for (const [userId, flower] of this.flowers.entries()) {
      if (now - flower.getLastInteraction() > timeout) {
        toRemove.push(userId);
      }
    }

    if (toRemove.length > 0) {
      toRemove.forEach(uid => this.removeFlower(uid));
    }
  }
  removeFlower(userId) {
    const flower = this.flowers.get(userId);
    if (flower) {
      // Remove from occupancy list
      this.occupiedPoints = this.occupiedPoints.filter(p => p.t !== (flower).attachT || p.strandIdx !== (flower).strandIdx);

      const pts = this.vine.getAttachmentPoints();
      const pt = pts.find(p => p.t === (flower).attachT && p.strandIdx === (flower).strandIdx);
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
      this.saveState();
    }
  }

  triggerWiggle(userId?: string) {
    if (userId) {
      const flower = this.flowers.get(userId);
      if (flower) flower.startWobble(1);
    } else {
      for (const flower of this.flowers.values()) {
        flower.startWobble(0.5 + Math.random() * 0.5);
      }
    }
  }

  clear() {
    for (const userId of this.flowers.keys()) {
      this.removeFlower(userId);
    }
    for (const heart of this.hearts.values()) {
      heart.destroy();
      this.removeChild(heart);
    }
    this.hearts.clear();
    this.occupiedPoints = []; // CRITICAL: Reset spacing tracking
    this.vine.resetAttachmentPoints();
    this.saveState();
  }
  saveState() {
    const flowers = Array.from(this.flowers.entries()).map(([userId, f]) => ({
      userId,
      data: f.data,
      attachT: (f).attachT,
      strandIdx: (f).strandIdx,
      stage: f.stage
    }));

    const hearts = Array.from(this.hearts.entries()).map(([userId, h]) => ({
      userId,
      data: (h).data,
      attachT: (h).attachT,
      strandIdx: (h).strandIdx
    }));

    PersistenceManager.save({
      flowers,
      hearts,
      growth: this.vine.getGrowth()
    });
  }
  restoreState(state) {
    console.log('[FlowerManager] Restoring state...', state);
    if (state.flowers && state.flowers.length > 0) {
      console.log(`[FlowerManager] Spawning ${state.flowers.length} flowers from state...`);
      state.flowers.forEach((f) => {
        const flower = this.spawnFlower(f.data, { t: f.attachT, strandIdx: f.strandIdx }, f.stage);
        if (!flower) console.warn(`[FlowerManager] Failed to restore flower ${f.userId}`);
      });
    }
    if (state.hearts) {
      state.hearts.forEach((h) => {
        this.spawnHeart(h.data, { t: h.attachT, strandIdx: h.strandIdx });
      });
    }
  }

  destroy() {
    this.tracker.unsubscribeAll();
    this.flowers.forEach(f => f.destroy());
    this.hearts.forEach(h => h.destroy());
    super.destroy();
  }
}
