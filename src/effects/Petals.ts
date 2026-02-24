import { Container, Graphics, Sprite, type Renderer } from 'pixi.js';
import { randomRange } from '../utils/math';
import { FlowerColors } from '../utils/colors';
import { drawPetal } from '../utils/procedural';

interface PetalParticle {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  scale: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  active: boolean;
}

const POOL_SIZE = 100;

export class Petals extends Container {
  private particles: PetalParticle[] = [];
  private pool: PetalParticle[] = [];
  private sharedTexture: Sprite['texture'] | null = null;

  constructor(renderer: Renderer) {
    super();
    this.initPool(renderer);
  }

  private initPool(renderer: Renderer): void {

    // 1. Create a "Master" petal graphics
    const graphics = new Graphics();
    drawPetal(graphics, 0, 0, 12, 0xFFFFFF); // White for tinting

    // 2. Generate the shared texture
    this.sharedTexture = renderer.generateTexture({
      target: graphics,
      resolution: 1,
    });
    graphics.destroy();

    for (let i = 0; i < POOL_SIZE; i++) {
      this.createParticle();
    }
  }

  private createParticle(): void {
    if (!this.sharedTexture) return;

    const colors = [FlowerColors.rose, FlowerColors.blush, FlowerColors.peach];
    const sprite = new Sprite(this.sharedTexture);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    sprite.tint = colors[Math.floor(Math.random() * colors.length)];
    this.addChild(sprite);

    const particle: PetalParticle = {
      sprite: sprite,
      x: 0, y: 0, vx: 0, vy: 0,
      rotation: 0, rotationSpeed: 0,
      life: 0, maxLife: 0, scale: 1,
      wobbleOffset: 0, wobbleSpeed: 0,
      active: false,
    };
    this.pool.push(particle);
  }

  spawn(x: number, y: number, count: number = 10, palette?: number[], mode: 'burst' | 'rain' = 'burst'): void {
    // Ensure enough particles are in the pool
    if (this.pool.length < count) {
      const needed = count - this.pool.length;
      for (let i = 0; i < needed; i++) {
        this.createParticle();
      }
    }

    for (let i = 0; i < count; i++) {
      const p = this.pool.pop(); // Get a particle from the pool
      if (p) {
        this.activateParticle(p, x, y, palette, mode);
        this.particles.push(p); // Add to active particles
        p.sprite.visible = true; // Make sprite visible
      }
    }
  }

  private activateParticle(particle: PetalParticle, x: number, y: number, palette?: number[], mode: 'burst' | 'rain' = 'burst'): void {
    particle.x = x;
    particle.y = y;

    if (mode === 'rain') {
      // Rain Mode: Fall from top
      particle.x = Math.random() * window.innerWidth;
      particle.y = -50 - Math.random() * 200; // Staggered start above screen
      particle.vx = randomRange(-0.5, 0.5); // Gentle drift
      particle.vy = randomRange(2, 4);      // Falling down
      particle.life = (window.innerHeight + 100) / particle.vy; // Ensure it reaches bottom, life in seconds
      particle.maxLife = particle.life;
      particle.wobbleSpeed = randomRange(0.1, 0.3);
    } else {
      // Burst Mode: Explode outwards
      particle.vx = randomRange(-0.6, 0.6);
      particle.vy = randomRange(-0.3, 0.6);
      particle.life = randomRange(4.0, 6.0); // Life in seconds
      particle.maxLife = particle.life;
      particle.wobbleSpeed = randomRange(0.2, 0.5);
    }

    // Common properties
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = randomRange(-0.03, 0.03);
    particle.scale = randomRange(0.4, 0.8);
    particle.wobbleOffset = Math.random() * Math.PI * 2; // Use PI * 2 for full circle
    particle.active = true;

    // Apply color
    if (palette && palette.length > 0) {
      particle.sprite.tint = palette[Math.floor(Math.random() * palette.length)];
    } else {
      const colors = [FlowerColors.rose, FlowerColors.blush, FlowerColors.peach];
      particle.sprite.tint = colors[Math.floor(Math.random() * colors.length)];
    }

    particle.sprite.position.set(particle.x, particle.y);
    particle.sprite.rotation = particle.rotation;
    particle.sprite.scale.set(particle.scale);
    particle.sprite.alpha = 1;
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
        this.pool.push(p);
        continue;
      }

      // Update physics
      if (p.vy > 0 && p.vy < 2) { // Rain or slow falling
        p.vy += 0.005; // Gravity
      } else {
        p.vy += 0.01;
        p.vy *= 0.99;
        p.vx *= 0.99;
      }

      p.x += p.vx;
      p.y += p.vy;

      const drift = Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * 0.5;
      p.x += drift;

      p.rotation += p.rotationSpeed;

      const lifeRatio = p.life / p.maxLife;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.rotation = p.rotation;
      p.sprite.scale.set(p.scale * (0.3 + lifeRatio * 0.7));
      // Dissipate alpha gently at the end
      p.sprite.alpha = Math.min(1.0, lifeRatio * 1.5);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
      p.sprite.visible = false;
      this.pool.push(p);
    }
    this.particles = [];
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}
