import { DEBUG_STYLES } from './DebugStyles';

export function generateDebugHTML(): string {
  return `
    <style>
      ${DEBUG_STYLES}
    </style>

    <button class="close-btn" data-action="close">×</button>

    <div class="header">
      <h1>🌿 Debug Panel</h1>
      <p>F9 to toggle</p>
    </div>

    <!-- STATUS -->
    <div class="panel">
      <h2>📊 Status</h2>
      <div id="fps-display" style="font-family: monospace; font-size: 14px; margin-bottom: 8px; color: #10b981;">FPS: --</div>
      <div id="debug-status">Loading...</div>
      <div class="btn-row" style="margin-top: 12px;">
        <button data-action="refresh-status">Refresh Status</button>
        <button data-action="hard-reset" class="danger">HARD RESET GARDEN</button>
      </div>
      <div class="btn-row" style="margin-top: 8px;">
        <button data-action="reconnect" class="success">Reconnect</button>
        <button data-action="disconnect" class="danger">Disconnect</button>
      </div>
    </div>

    <!-- FLOWERS -->
    <div class="panel">
      <h2>🌸 Flowers</h2>
      <div class="btn-row">
        <button data-action="spawn-flower">Spawn Flower</button>
        <button data-action="spawn-heart" class="pink">Spawn Heart</button>
      </div>
      <label>
        Bulk Spawn:
        <input type="number" id="bulk-count" value="10" min="1" max="200">
        <button data-action="bulk-spawn" class="success">Go!</button>
      </label>
      <div class="btn-row">
        <button data-action="clear-flowers" class="danger">Clear All Flowers</button>
      </div>
      <label>Force Stage:</label>
      <div class="grid-buttons">
        <button data-action="force-stage" data-value="0">Seed</button>
        <button data-action="force-stage" data-value="1">Bud</button>
        <button data-action="force-stage" data-value="2">Bloom</button>
        <button data-action="force-stage" data-value="3">Full</button>
        <button data-action="force-stage" data-value="4">Mega</button>
        <button data-action="force-stage" data-value="5">Radiant</button>
      </div>
      <label>
        Flower Color:
        <input type="color" id="flower-color" value="#ff6b9d">
      </label>
    </div>

    <!-- PARTICLES -->
    <div class="panel">
      <h2>✨ Particles</h2>
      <label>
        Position X: <input type="number" id="particle-x" value="500" min="0" max="2000">
        Y: <input type="number" id="particle-y" value="300" min="0" max="2000">
      </label>
      <label>
        Count: <input type="number" id="particle-count" value="20" min="1" max="200">
      </label>
      <div class="btn-row">
        <button data-action="emit-sparkles" class="warning">Sparkles</button>
        <button data-action="emit-hearts" class="pink">Hearts</button>
        <button data-action="emit-petals" class="purple">Petals</button>
      </div>
      <div class="btn-row">
        <button data-action="emit-sparkles-burst" class="warning">Sparkle Burst (100)</button>
        <button data-action="emit-hearts-burst" class="pink">Heart Burst (100)</button>
      </div>
      <div class="btn-row">
        <button data-action="clear-particles" class="danger">Clear All Particles</button>
      </div>
    </div>

    <!-- WIND -->
    <div class="panel">
      <h2>💨 Wind & Gusts</h2>
      <label>
        <span class="slider-label"><span>Gust Intensity</span><span id="gust-value">1.0</span></span>
        <input type="range" id="gust-intensity" min="0" max="5" step="0.1" value="1">
      </label>
      <div class="btn-row">
        <button data-action="force-gust">Force Gust</button>
        <button data-action="gentle-breeze" class="success">Gentle Breeze</button>
        <button data-action="strong-gust" class="warning">Strong Gust</button>
        <button data-action="hurricane" class="danger">Hurricane!</button>
      </div>
      <label>
        <span class="slider-label"><span>Base Wind Speed</span><span id="wind-value">1.0</span></span>
        <input type="range" id="wind-speed" min="0" max="3" step="0.1" value="1">
      </label>
      <div class="btn-row">
        <button data-action="toggle-wind">Toggle Wind</button>
      </div>
    </div>

    <!-- EVENTS -->
    <div class="panel">
      <h2>📡 Streamer Events</h2>
      <div class="btn-row">
        <button data-action="event-chatter">Chatter</button>
        <button data-action="event-subscription" class="purple">Subscription</button>
        <button data-action="event-gift-bomb" class="pink">Gift Bomb</button>
      </div>
      <div class="btn-row">
        <button data-action="event-raid" class="warning">Raid</button>
        <button data-action="event-follow" class="success">Follow</button>
        <button data-action="event-channel-points">Channel Points</button>
      </div>
      <label>
        Raid Viewers: <input type="number" id="raid-viewers" value="50" min="1" max="10000">
      </label>
      <label>
        Gift Bomb Count: <input type="number" id="gift-count" value="5" min="1" max="100">
      </label>
      <div class="btn-row">
        <button data-action="mass-event" class="danger">MASS EVENT (All at once!)</button>
      </div>
    </div>

    <!-- DANCE -->
    <div class="panel">
      <h2>💃 Dance Mode</h2>
      <div class="btn-row">
        <button data-action="start-dance" class="success">Start Dance</button>
        <button data-action="stop-dance" class="danger">Stop Dance</button>
      </div>
      <label>
        <span class="slider-label"><span>Dance Intensity</span><span id="dance-value">1.0</span></span>
        <input type="range" id="dance-intensity" min="0.1" max="3" step="0.1" value="1">
      </label>
      <label>
        <span class="slider-label"><span>Dance Duration (seconds)</span><span id="dance-duration-value">10</span></span>
        <input type="range" id="dance-duration" min="1" max="60" step="1" value="10">
      </label>
    </div>

    <!-- VINE & CROWN -->
    <div class="panel">
      <h2>🌿 Vine & Crown</h2>
      <label>
        <span class="slider-label"><span>Vine Growth</span><span id="growth-value">1.0</span></span>
        <input type="range" id="vine-growth" min="0" max="1" step="0.01" value="1">
      </label>
      <div class="btn-row">
        <button data-action="set-growth">Set Growth</button>
        <button data-action="grow-vine" class="success">Grow to Full</button>
        <button data-action="reset-vine" class="danger">Reset Vine</button>
      </div>
      <label>
        Crown Color:
        <input type="color" id="crown-color" value="#ff4444">
        <button data-action="set-crown-color">Apply</button>
      </label>
      <label>Crown Type:</label>
      <div class="grid-buttons" style="grid-template-columns: 1fr 1fr;">
        <button data-action="set-crown-type" data-value="rose">Rose</button>
        <button data-action="set-crown-type" data-value="heart">Heart</button>
      </div>
      <div class="btn-row">
        <button data-action="toggle-crown">Toggle Crown Visibility</button>
      </div>
    </div>

    <!-- COMMANDS -->
    <div class="panel">
      <h2>⚡ Commands</h2>
      <div class="btn-row">
        <button data-action="cmd-wiggle">Wiggle</button>
        <button data-action="cmd-shake" class="warning">Shake</button>
        <button data-action="cmd-pulse" class="purple">Pulse</button>
        <button data-action="cmd-wave" class="success">Wave</button>
      </div>
      <div class="btn-row">
        <button data-action="cmd-bloom" class="pink">Bloom</button>
        <button data-action="cmd-sparkle" class="warning">Sparkle</button>
        <button data-action="cmd-dance">Dance</button>
        <button data-action="cmd-grow" class="success">Grow</button>
      </div>
      <label>
        Custom Command:
        <input type="text" id="custom-command" placeholder="e.g. wiggle" style="flex: 1; padding: 6px; background: #0f172a; border: 1px solid #475569; border-radius: 4px; color: white;">
      </label>
      <button data-action="run-custom-command" style="width: 100%;">Execute Command</button>
    </div>

    <!-- DISPLAY -->
    <div class="panel">
      <h2>🎨 Display Options</h2>
      <label>
        <input type="checkbox" id="toggle-shadows" checked> Show Flower Shadows
      </label>
      <label>
        <input type="checkbox" id="toggle-particles" checked> Show Particles
      </label>
      <label>
        <input type="checkbox" id="toggle-glow" checked> Show Radiant Glow
      </label>
      <label>
        <input type="checkbox" id="toggle-crown-glow" checked> Show Crown Glow
      </label>
      <label>
        <span class="slider-label"><span>Global Scale</span><span id="scale-value">1.0</span></span>
        <input type="range" id="global-scale" min="0.5" max="2" step="0.1" value="1">
      </label>
      <button data-action="apply-scale">Apply Scale</button>
    </div>

    <!-- STRESS TEST -->
    <div class="panel">
      <h2>🔥 Stress Test</h2>
      <div class="btn-row">
        <button data-action="stress-flowers" class="danger">Spawn 100 Flowers</button>
        <button data-action="stress-particles" class="warning">1000 Particles</button>
      </div>
      <div class="btn-row">
        <button data-action="stress-all" class="danger">MAXIMUM CHAOS</button>
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 8px;">
        Warning: Stress tests may impact performance!
      </p>
    </div>

    <!-- PRESETS -->
    <div class="panel">
      <h2>📦 Presets</h2>
      <div class="btn-row">
        <button data-action="preset-calm" class="success">Calm Garden</button>
        <button data-action="preset-party" class="purple">Party Mode</button>
      </div>
      <div class="btn-row">
        <button data-action="preset-romantic" class="pink">Romantic</button>
        <button data-action="preset-storm" class="warning">Storm</button>
      </div>
      <div class="btn-row">
        <button data-action="preset-empty" class="danger">Clear Everything</button>
      </div>
    </div>

    <!-- CONSOLE -->
    <div class="panel" style="min-width: 100%; max-width: 100%;">
      <h2>📟 Quick Console</h2>
      <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">
        Copy-paste commands for browser console (F12):
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px;">
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="gardenDebug.bulkSpawn(50)">gardenDebug.bulkSpawn(50)</code>
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="gardenDebug.spawnTestHeart()">gardenDebug.spawnTestHeart()</code>
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="gardenDebug.startDance()">gardenDebug.startDance()</code>
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="gardenDebug.forceGust(3)">gardenDebug.forceGust(3)</code>
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="EventBus.emit(GardenEvents.RAID, { viewers: 100 })">EventBus.emit(GardenEvents.RAID, { viewers: 100 })</code>
        <code style="background: #0f172a; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Click to copy" data-copy="EventBus.emit(GardenEvents.GIFT_BOMB, { count: 10 })">EventBus.emit(GardenEvents.GIFT_BOMB, { count: 10 })</code>
      </div>
    </div>
      </div>
    </div>
    
    <!-- MODAL OVERLAY -->
    <div id="debug-modal-overlay" style="display: none;">
      <div id="debug-modal">
        <h3 id="modal-title">Confirm Action</h3>
        <p id="modal-message">Are you sure?</p>
        <div class="modal-actions">
          <button id="modal-confirm" class="confirm-btn">Yes, Do It</button>
          <button id="modal-cancel" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
}
