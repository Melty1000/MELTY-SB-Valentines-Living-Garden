# 🌿 Melty's SB Valentines Living Garden

**A gorgeous, procedural, living bouquet for your Twitch stream!**

![Version](https://img.shields.io/badge/version-1.1.0-FF69B4)
![PIXI.js](https://img.shields.io/badge/PIXI.js-v8-orange)

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
7. Set the **FPS** to match your stream framerate (30 or 60)
8. ✅ Check **"Shutdown source when not visible"**
9. ✅ Check **"Refresh browser when scene becomes active"**
10. Click **OK**

### Interacting with the Garden

Once the browser source is added, you can test or tweak settings while off stream:

1. Right-click on your Living Garden source in OBS
2. Click **"Interact"**
3. Press **F9** to toggle the Debug Panel
4. Use the panel to spawn test flowers, hearts, or trigger the Garden Dance!

---

## ✨ Features

- 🌸 **Procedural Growth** - The garden grows as viewers chat. Seed -> Bud -> Rose.
🩷 **Heart Spawning** - Subscriptions and Gifts spawn glowing hearts on the vine!
- ✨ **Garden Dance** - Gift Bombs trigger a synchronized celebratory movement.
- 💾 **Persistence** - Garden state survives page refreshes until the stream ends.
- 📊 **Detailed Stats** - Separate tracking for Flowers and Hearts in the debug panel.
- 🍃 **Independent Sway** - Organic, fluid movement for كل strand of the vine.
- 🖥️ **OBS Ready** - Optimized for performance with texture caching and minimal draw calls.

---

## 🔧 Technical Details

- **Built with**: Vite + TypeScript + PIXI.js (v8)
- **Performance**: High-fidelity procedural rendering with texture aggregation.
- **Persistence**: LocalStorage state management with Streamer.bot event integration.

---

## 📜 Usage Terms

**© 2025 Melty. All Rights Reserved.**

This is for **personal use only**!

**You CAN:**
- ✅ Use it on your stream
- ✅ Share the GitHub link with others
- ✅ Customize the colors in `config.ts` for your own aesthetic

**Please DON'T:**
- ❌ Redistribute without permission
- ❌ Claim it as your own
- ❌ Sell it or include in paid stuff

---

## 💝 Show Me Your Garden!

I LOVE seeing people use this project! If you set up a cool garden on your stream:

**Discord: @Melty1000**

### Where to Find Me

[![Discord](https://img.shields.io/badge/Discord-@Melty1000-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/8EfuxXgVyT)
[![Twitch](https://img.shields.io/badge/Twitch-melty1000-9146FF?style=for-the-badge&logo=twitch&logoColor=white)](https://www.twitch.tv/melty1000)
[![GitHub](https://img.shields.io/badge/GitHub-Melty1000-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Melty1000)

---

### 🌸 Happy Valentine's Day!

*Made with ❤️ by Melty*
