import { Application as PixiApplication, Container } from 'pixi.js';
import { EventBus } from './EventBus.js';
import { config } from '../config.js';

export class Application {
  app;
  resizeObserver = null;
  stage;
  width = 0;
  height = 0;

  constructor() {
    this.app = new PixiApplication();
    this.stage = this.app.stage;
  }

  async init(container) {
    await this.app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    this.width = this.app.screen.width;
    this.height = this.app.screen.height;

    this.setupResizeHandler(container);
  }

  setupResizeHandler(container) {
    this.resizeObserver = new ResizeObserver(() => {
      this.width = this.app.screen.width;
      this.height = this.app.screen.height;
      EventBus.emit('app:resize', { width: this.width, height: this.height });
    });

    this.resizeObserver.observe(container);
  }

  get ticker() {
    return this.app.ticker;
  }

  get renderer() {
    return this.app.renderer;
  }

  get screen() {
    return this.app.screen;
  }

  addChild(child) {
    this.stage.addChild(child);
  }

  removeChild(child) {
    this.stage.removeChild(child);
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.app.destroy(true, { children: true, texture: true });
  }
}
