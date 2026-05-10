import { Container, Graphics, Sprite } from 'pixi.js';
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
}

export class Sparkles extends Container {
  private particles: SparkleParticle[] = [];

  constructor() {
    super();
  }

  spawn(x: number, y: number, count: number = config.particles.sparkleCount): void {
    for (let i = 0; i < count; i++) {
      this.createParticle(x, y);
    }
  }

  private createParticle(x: number, y: number): void {
    const graphics = new Graphics();
    const size = randomRange(4, 10);

    graphics.star(0, 0, 4, size, size * 0.4);
    graphics.fill({
      color: Math.random() > 0.5 ? EffectColors.sparkleGold : lighten(EffectColors.sparkleGold, 0.3),
    });

    const sprite = graphics as unknown as Sprite;
    sprite.x = x;
    sprite.y = y;

    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(1, 4);

    const particle: SparkleParticle = {
      sprite,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: config.particles.lifetime,
      maxLife: config.particles.lifetime,
      scale: randomRange(0.5, 1.5),
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-0.1, 0.1),
    };

    this.particles.push(particle);
    this.addChild(graphics);
  }

  update(deltaTime: number): void {
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
      p.vy += 0.05;
      p.rotation += p.rotationSpeed;

      const lifeRatio = p.life / p.maxLife;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.rotation = p.rotation;
      p.sprite.scale.set(p.scale * lifeRatio);
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
