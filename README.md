# 💗 Melty's SB Valentines Living Garden

**A gorgeous, procedural, living bouquet for your Twitch stream!**

![Version](https://img.shields.io/badge/version-1.0.0-FF69B4)
![PIXI.js](https://img.shields.io/badge/PIXI.js-v8-orange)
![Streamer.bot](https://img.shields.io/badge/Streamer.bot-v1.0.4+-blue)

---

## 📺 OBS Browser Source Setup

This overlay is designed to be used as an **OBS Browser Source**. It grows dynamically based on your stream activity (chat, subs, gifts).

### Step-by-Step Setup

1. In OBS, click the **+** button under Sources
2. Select **Browser**
3. Give it a name (like "Living Garden" or "Valentines Bouquet" 🩷)
4. Set the **URL** to:
   ```
   https://melty1000.github.io/MELTY-SB-Valentines-Living-Garden/
   ```
5. Set **Width** to your stream width (e.g., 1920)
6. Set **Height** to your stream height (e.g., 1080)
   - *Note: The garden is responsive, but 1920x1080 is recommended for best scaling.*
7. Set the **FPS** to match your stream framerate (30 or 60)
8. ✅ Check **"Shutdown source when not visible"** (saves resources when hidden)
9. ✅ Check **"Refresh browser when scene becomes active"** (keeps the connection fresh)
10. Click **OK**

---

## 🤖 Streamer.bot Setup

There are no actions required for this overlay to operate! **Just ensure that your websocket server is turned on**.

---

### 🎨 Test Your Garden (Debug Mode)

You can test the garden and tweak visual settings using the built-in Debug Panel:

1. Right-click on your Living Garden source in OBS
2. Click **"Interact"**
3. Press **F9** on your keyboard to toggle the Debug Panel
4. Use the controls to:
   - Spawn test flowers and hearts
   - Trigger the "Garden Dance"
   - Adjust wind and physics settings
   - Force specific flower stages (Seed -> Radiant)
5. **Pro Tip:** Toggle the debug panel OFF before closing the interact window!

---

## ✨ Features

- 🌸 **Procedural Growth** - Watch your garden evolve from seeds to radiant blooms as chat flows.
- 🩷 **Heart Spawning** - Subscriptions and Gifts drop glowing hearts onto the vine.
- ✨ **Garden Dance** - Gift Bombs trigger a synchronized, bouncy celebration animation!
- 💾 **Persistence** - The garden remembers every flower even if you refresh the page.
- 🍃 **Organic Physics** - Each vine strand sways independently with simulated wind and weight.
- 🎨 **Theme Support** - Recognizes Broadcaster colors and adapts the crown flower automatically.
- 📊 **Detailed Stats** - Track your garden's density and growth progress in real-time.
- 🚀 **High Performance** - Built with PIXI.js v8 for silky smooth 60fps rendering.

---

## 📴 Local/Offline Version

Want to run this without an internet connection or modify the code?

### How to Run Locally

1. **Download the Source Code** via the green "Code" button > "Download ZIP".
2. Extract the files to a folder.
3. Open a terminal in the folder and run:
   ```bash
   npm install
   npm run dev
   ```
4. Use the local URL (usually `http://localhost:5173`) in OBS.

> **Note:** Browsers block local file access (`file:///`) for modern web apps. You must use a local server or the GitHub Pages URL.

### Development Quality Gates

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run check
```

`npm run check` runs all required release checks in order.

### Debug Controls In Production Builds

The F9 debug panel is disabled by default in production builds.
To explicitly enable the panel in production:

```bash
VITE_ENABLE_DEBUG_UI=true npm run build
```

Window debug globals are now controlled separately for security hardening.
To enable globals like `window.garden`/`window.gardenDebug` in production too:

```bash
VITE_ENABLE_DEBUG_UI=true VITE_ENABLE_DEBUG_GLOBALS=true npm run build
```

### Runtime Config (Optional Env Vars)

These are optional. If omitted, safe defaults are used.

- `VITE_STREAMERBOT_HOST` default: `127.0.0.1`
- `VITE_STREAMERBOT_PORT` default: `8080` (must be `1-65535`)
- `VITE_STREAMERBOT_ENDPOINT` default: `/`
- `VITE_STREAMERBOT_BROADCASTER_NAME` default: `Melty1000`
- `VITE_MAX_FPS` default: `60` (must be `1-240`)
- `VITE_ENABLE_DEBUG_UI` default: `true` in dev, `false` in production
- `VITE_ENABLE_DEBUG_GLOBALS` default: `true` in dev, `false` in production

---

## 🛠️ Browser Support

- ✅ **OBS Browser Source** - Primary target, fully supported.
- ✅ **Chrome** - Recommended for testing and development.
- ⚠️ **Firefox/Safari** - Should work, but optimized for Chromium-based rendering.

---

## 📜 Usage Terms

**© 2026 Melty. All Rights Reserved.**

This is for **personal use only**!

**You CAN:**
- ✅ Use it on your stream
- ✅ Share the GitHub link with others
- ✅ Customize the code for your own personal channel
- ✅ Send screenshots of your massive gardens!

**Please DON'T:**
- ❌ Redistribute changed versions without permission
- ❌ Selling this overlay or including it in paid packages
- ❌ Claim the code/artwork as your own

---

## 💝 Show Me Your Garden!

I LOVE seeing people use my projects! If you grow a massive garden on your stream:

**Take a screenshot and share it!**

Seriousy - I put a lot of love into all of my projects and nothing makes me happier than seeing people enjoy them! 💗

### Where to Find Me

[![Discord](https://img.shields.io/badge/Discord-@Melty1000-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/8EfuxXgVyT)
[![Twitch](https://img.shields.io/badge/Twitch-melty1000-9146FF?style=for-the-badge&logo=twitch&logoColor=white)](https://www.twitch.tv/melty1000)
[![YouTube](https://img.shields.io/badge/YouTube-@melty__1000-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@melty_1000)
[![GitHub](https://img.shields.io/badge/GitHub-Melty1000-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Melty1000)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support_Me-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/melty1000)

---

## 🐛 Found a Bug?

Things acting weird? Let me know!

Hit me up on **Discord: @Melty1000** with:
- What went wrong
- A screenshot of the F9 Debug Panel if possible

---

## 🌸 Happy Valentine's Day!

*Made with ❤️, caffeine, and pixel dust by Melty*
