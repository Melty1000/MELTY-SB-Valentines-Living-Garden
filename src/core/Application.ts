import { Application as PixiApplication, Container } from 'pixi.js';
import { EventBus } from './EventBus';

export class Application {
  private app: PixiApplication;
  private resizeObserver: ResizeObserver | null = null;
  public stage: Container;
  public width: number = 0;
  public height: number = 0;

  constructor() {
    this.app = new PixiApplication();
    this.stage = this.app.stage;
  }

  async init(container: HTMLElement): Promise<void> {
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

  private setupResizeHandler(container: HTMLElement): void {
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

  addChild(child: Container): void {
    this.stage.addChild(child);
  }

  removeChild(child: Container): void {
    this.stage.removeChild(child);
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.app.destroy(true, { children: true, texture: true });
  }
}
