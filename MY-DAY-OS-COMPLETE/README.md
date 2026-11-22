# MY DAY OS — Personal Daily Life Operating System
**Minimalist Liquid Glass Productivity App**

MY DAY OS combines the calm simplicity of iOS, the power of a complete daily productivity workspace, and authentic Liquid Glass aesthetics.

---

## 🌟 Key Features

1. **Today Dashboard**: Live productivity scoring, daily timeline, next routine block, and hydration rings.
2. **Routine & Timetable**: Recurring daily blocks (Morning, Afternoon, Evening, Night) with conflict alerts.
3. **Tasks & Categories**: One-click filters for **Personal**, **Work**, **Study**, **Health**, and **Projects**.
4. **Apple Journal Diary**:
   - ✍️ **Daily Journal**: 1-click Mood Selector pills, gratitude prompts, auto-saved local draft, and Gujarati/English voice dictation.
   - ⏱️ **Time Activity Log**: Hourly chronological logging of what you did throughout the day.
   - 🔒 **4-Digit Privacy PIN**: Lock your diary reflections from prying eyes.
5. **AURAA AI**: Built-in intelligent assistant supporting natural Gujarati and English with safe one-click database actions (`create_task`, `create_alarm`, `log_water`, `log_diary`).
6. **Smart Alarms & Water Chimes**: Procedural Web Audio API sound generator (no missing MP3 files).
7. **Pomodoro Focus Timer**: 25/5/15 minute presets with focus streak tracking.
8. **Official Liquid Glass (`liquidglass.dev`)**: Self-hosted `<lg-switch>`, `<lg-slider>`, `<lg-segmented>`, and `<lg-button>` Web Components.

---

## 🚀 Quick Start (Local Development)

### Prerequisites:
- Node.js 18+ installed

### Installation & Run:
```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript checks and automated tests
npm test

# 3. Start local development server (Express backend + Vite frontend)
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## ☁️ Deployment Instructions (Render / Cloud)

1. Upload the files or push the repository to GitHub: `https://github.com/Mr-Raa/Raa-s-diary-`.
2. In your **Render Dashboard** (`dashboard.render.com`):
   - Set **Root Directory** to repository root (or subfolder if packed).
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Click **Manual Deploy > Deploy latest commit**.

### 💡 Keep-Alive Tip (100% Free Instant Start):
On Render's free tier, the instance spins down after 15 minutes of inactivity. To keep your app starting in **1 second directly without waiting**:
1. Go to [cron-job.org](https://cron-job.org) (Free).
2. Create a job hitting your health URL: `https://your-app.onrender.com/api/health` every 10 minutes.
3. Render will stay awake 24/7!
