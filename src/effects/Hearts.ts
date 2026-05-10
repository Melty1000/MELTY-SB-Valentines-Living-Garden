import { Container, Graphics, Sprite } from 'pixi.js';
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
}

export class Hearts extends Container {
  private particles: HeartParticle[] = [];

  constructor() {
    super();
  }

  spawn(x: number, y: number, count: number = config.particles.heartCount): void {
    for (let i = 0; i < count; i++) {
      this.createParticle(x, y);
    }
  }

  private createParticle(x: number, y: number): void {
    const graphics = new Graphics();
    const size = randomRange(10, 20);
    const color = Math.random() > 0.5 ? EffectColors.heartRed : EffectColors.heartPink;

    drawHeart(graphics, 0, 0, size, color);

    const sprite = graphics as unknown as Sprite;
    sprite.x = x;
    sprite.y = y;

    const particle: HeartParticle = {
      sprite,
      x,
      y,
      vx: randomRange(-1, 1),
      vy: randomRange(-3, -1),
      life: config.particles.lifetime * 1.5,
      maxLife: config.particles.lifetime * 1.5,
      scale: randomRange(0.5, 1),
      wobbleOffset: randomRange(0, Math.PI * 2),
      wobbleSpeed: randomRange(2, 4),
    };

    this.particles.push(particle);
    this.addChild(graphics);
  }

  update(deltaTime: number): void {
    const time = performance.now() * 0.001;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.removeChild(p.sprite);
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
      this.removeChild(p.sprite);
    }
    this.particles = [];
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}
