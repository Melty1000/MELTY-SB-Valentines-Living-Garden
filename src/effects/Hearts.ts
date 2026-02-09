import { Container, Graphics, Sprite, type Renderer } from 'pixi.js';
import { randomRange } from '../utils/math';
import { EffectColors } from '../utils/colors';
import { drawHeart } from '../utils/procedural';
import { config } from '../config';

interface HeartParticle {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  active: boolean;
}

const POOL_SIZE = 100;

export class Hearts extends Container {
  private particles: HeartParticle[] = [];
  private pool: HeartParticle[] = [];
  private sharedTexture: Sprite['texture'] | null = null;

  constructor(renderer: Renderer) {
    super();
    this.initPool(renderer);
  }

  private initPool(renderer: Renderer): void {
    // 1. Create a "Master" heart graphics
    const graphics = new Graphics();
    drawHeart(graphics, 0, 0, 15, 0xFFFFFF); // White for tinting

    // 2. Generate the shared texture
    this.sharedTexture = renderer.generateTexture({
      target: graphics,
      resolution: 1,
    });
    graphics.destroy();

    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new Sprite(this.sharedTexture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      sprite.tint = Math.random() > 0.5 ? EffectColors.heartRed : EffectColors.heartPink;
      this.addChild(sprite);

      const particle: HeartParticle = {
        sprite: sprite,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, scale: 1,
        wobbleOffset: 0, wobbleSpeed: 0,
        active: false,
      };
      this.pool.push(particle);
    }
  }

  spawn(x: number, y: number, count: number = config.particles.heartCount, palette?: number[]): void {
    for (let i = 0; i < count; i++) {
      this.activateParticle(x, y, palette);
    }
  }

  private activateParticle(x: number, y: number, palette?: number[]): void {
    let particle = this.pool.find(p => !p.active);
    if (!particle) {
      particle = this.particles[0];
      if (!particle) return;
    }

    particle.x = x;
    particle.y = y;
    particle.vx = randomRange(-1, 1);
    particle.vy = randomRange(-3, -1);
    particle.life = config.particles.lifetime * 1.5;
    particle.maxLife = config.particles.lifetime * 1.5;
    particle.scale = randomRange(0.5, 1);
    particle.wobbleOffset = randomRange(0, Math.PI * 2);
    particle.wobbleSpeed = randomRange(2, 4);
    particle.active = true;
    particle.sprite.visible = true;

    // Apply color from palette if provided, otherwise reset to default
    if (palette && palette.length > 0) {
      particle.sprite.tint = palette[Math.floor(Math.random() * palette.length)];
    } else {
      particle.sprite.tint = Math.random() > 0.5 ? EffectColors.heartRed : EffectColors.heartPink;
    }

    if (!this.particles.includes(particle)) {
      this.particles.push(particle);
    }
  }

  update(deltaTime: number): void {
    const time = performance.now() * 0.001;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      const wobble = Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * 0.5;
      p.vx += wobble * 0.1;

      const lifeRatio = p.life / p.maxLife;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.scale.set(p.scale * (0.5 + lifeRatio * 0.5));
      p.sprite.alpha = lifeRatio;
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
