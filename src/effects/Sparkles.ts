import { Container, Graphics, Sprite, type Renderer } from 'pixi.js';
import { randomRange } from '../utils/math';
import { EffectColors, lighten } from '../utils/colors';
import { config } from '../config';

interface SparkleParticle {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
}

const POOL_SIZE = 200;

export class Sparkles extends Container {
  private particles: SparkleParticle[] = [];
  private pool: SparkleParticle[] = [];
  private sharedTexture: Sprite['texture'] | null = null;

  constructor(renderer: Renderer) {
    super();
    this.blendMode = 'add';
    this.initPool(renderer);
  }

  private initPool(renderer: Renderer): void {
    // 1. Create a "Master" sparkle graphics to bake into a texture
    const graphics = new Graphics();
    const size = 10; // Max size for texture
    graphics.star(0, 0, 4, size, size * 0.4);
    graphics.fill({ color: 0xFFFFFF }); // Use white so we can tint

    // 2. Generate the shared texture
    this.sharedTexture = renderer.generateTexture({
      target: graphics,
      resolution: 1,
    });
    graphics.destroy();

    // 3. Create pool of real Sprites
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new Sprite(this.sharedTexture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      sprite.tint = Math.random() > 0.5 ? EffectColors.sparkleGold : lighten(EffectColors.sparkleGold, 0.3);
      this.addChild(sprite);

      const particle: SparkleParticle = {
        sprite: sprite,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        scale: 1, rotation: 0, rotationSpeed: 0,
        active: false,
      };
      this.pool.push(particle);
    }
  }

  spawn(x: number, y: number, count: number = config.particles.sparkleCount): void {
    for (let i = 0; i < count; i++) {
      this.activateParticle(x, y);
    }
  }

  private activateParticle(x: number, y: number): void {
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

  update(deltaTime: number): void {
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

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
      p.sprite.visible = false;
    }
    this.particles = [];
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}
