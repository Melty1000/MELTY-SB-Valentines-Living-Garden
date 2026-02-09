import { Container, Graphics, Sprite } from 'pixi.js';
import { randomRange } from '../utils/math.js';
import { EffectColors, lighten } from '../utils/colors.js';
import { config } from '../config.js';

const POOL_SIZE = 200;

export class Sparkles extends Container {
  particles = [];
  pool = [];
  sharedTexture: Sprite['texture'] | null = null;

  constructor(renderer) {
    super();
    this.blendMode = 'add';
    this.initPool(renderer);
  }
  initPool(renderer) {
    // 1. Create a "Master" sparkle graphics to bake into a texture
    const graphics = new Graphics();
    const size = 10; // Max size for texture
    graphics.star(0, 0, 4, size, size * 0.4);
    graphics.fill({ color: 0xFFFFFF }); // Use white so we can tint

    // 2. Generate the shared texture
    this.sharedTexture = renderer.generateTexture({
      target,
      resolution,
    });
    graphics.destroy();

    // 3. Create pool of real Sprites
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new Sprite(this.sharedTexture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      sprite.tint = Math.random() > 0.5 ? EffectColors.sparkleGold : lighten(EffectColors.sparkleGold, 0.3);
      this.addChild(sprite);

      const particle = {
        sprite,
        x, y, vx, vy,
        life, maxLife,
        scale, rotation, rotationSpeed,
        active,
      };
      this.pool.push(particle);
    }
  }

  spawn(x, y, count = config.particles.sparkleCount) {
    for (let i = 0; i < count; i++) {
      this.activateParticle(x, y);
    }
  }
  activateParticle(x, y) {
    // Find inactive particle from pool
    let particle = this.pool.find(p => !p.active);
    if (!particle) {
      // Pool exhausted - reuse oldest active particle
      particle = this.particles[0];
      if (!particle) return;
    }

    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(1, 4);

    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = config.particles.lifetime;
    particle.maxLife = config.particles.lifetime;
    particle.scale = randomRange(0.5, 1.5);
    particle.rotation = randomRange(0, Math.PI * 2);
    particle.rotationSpeed = randomRange(-0.1, 0.1);
    particle.active = true;
    particle.sprite.visible = true;

    if (!this.particles.includes(particle)) {
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        // Return to pool instead of destroying
        p.active = false;
        p.sprite.visible = false;
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.rotation += p.rotationSpeed;

      const lifeRatio = p.life / p.maxLife;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.rotation = p.rotation;
      p.sprite.scale.set(p.scale * (0.8 + lifeRatio * 0.2));
      // Faster alpha fade-out for softer look
      p.sprite.alpha = Math.min(1.0, lifeRatio * 1.5);
    }
  }

  clear() {
    for (const p of this.particles) {
      p.active = false;
      p.sprite.visible = false;
    }
    this.particles = [];
  }

  override destroy() {
    this.clear();
    super.destroy();
  }
}
