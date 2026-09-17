# Axiom Ledger — Bespoke Expense & Life-Energy Dashboard

A modern, editorial fintech web application built with pure **HTML5, CSS3, and JavaScript**. Designed from the ground up to avoid cliché "AI-generated" templates (no oversaturated purple neon blur gradients or generic cards). Instead, it adopts the restrained, typographic precision of modern fintech tools like Mercury, Stripe, and Linear.

---

## 🌟 The Standout Differentiator: Life-Energy Engine & What-If Runway Sandbox

Standard expense dashboards only show raw currency amounts and basic pie charts. **Axiom Ledger introduces two psychological and analytical breakthrough features:**

### 1. The "Life-Energy" Conversion Engine
Inspired by Vicki Robin's *Your Money or Your Life* framework:
- Configure your hourly wage in Settings (e.g. `$32.00/hr`).
- Click the **Life-Energy Mode** toggle in the top header.
- Instantly, every metric, chart, and transaction converts into the **hours and minutes of life worked** to earn that money (e.g. a `$96` dinner becomes `⏱️ 3h 0m of your life`).
- Reframes money from abstract numbers into irreversible human time spent.

### 2. Interactive "What-If" Runway Sandbox
Click the **"What-If Sandbox"** button to open a real-time simulation drawer:
- Adjust dynamic cutback sliders across top spending categories (e.g., `-25% Dining`, `-15% Shopping`).
- **Live Output**:
  - Exact monthly cashflow surplus generated.
  - Life-hours reclaimed every month.
  - **1-Year Compounded Wealth Growth**: Calculates how much your savings would grow if invested at an annualized 7% market return.
  - One-click **"Apply as Budget Target"** to update your monthly budget based on your simulation.

---

## 📊 Core Features & Capabilities

- **Native Indian Rupee (₹ INR) & Multi-Currency Engine**:
  - Boots natively with Indian Rupees (₹ INR) and Indian numbering system (Lakhs & Crores via `en-IN` locale formatting).
  - Pre-seeded with realistic Indian metropolitan transactions (Rent ₹24,000, Airtel Broadband ₹1,099, Blue Tokai Coffee ₹280, Cult.fit ₹1,850, Salary ₹92,000).
  - Quick-switch header dropdown supporting **INR (₹)**, **USD ($)**, **EUR (€)**, **GBP (£)**, **JPY (¥)**, **AED (AED)**, **CAD (CA$)**, **AUD (AU$)**, and **SGD (S$)** with live dynamic exchange rate conversion!
- **Conscious Spending Framework (50/30 Rule)**:
  - Categorizes every expense as either **Essential (Need)** or **Discretionary (Want)**.
  - Visual split progress bar tracking your needs vs. wants balance in real time.
- **Spending Velocity Curve (Chart.js Area Chart)**:
  - Tracks cumulative daily spending across the month against an ideal straight-line budget pace.
  - Custom tooltips showing day, cumulative spend, and life-hours spent.
- **Category Allocation Donut Chart**:
  - High-resolution donut breakdown with custom center callout and responsive interactive legend.
- **Daily Burn Rate & Month-End Projector**:
  - Dynamically calculates daily burn pace based on days elapsed and projects month-end total outflow.
- **Full Transaction Management (CRUD)**:
  - Add, edit, and delete transactions with merchant, amount, category, date, type (expense/income), and nature (need/want).
  - Pre-seeded with realistic, dynamic sample data anchored to your current month.
- **Live Search & Multi-Pill Filtering**:
  - Search by keyword across titles and notes.
  - Filter by Essentials (Needs), Discretionary (Wants), Expenses Only, Income Only, or specific categories.
- **Data Portability & Backup**:
  - One-click **Export to CSV** for spreadsheets (Excel, Google Sheets).
  - **Export JSON Backup** and **Reset to Demo Data**.
  - All modifications persist in `localStorage`.
- **Bespoke Theme System**:
  - Dark Mode (Obsidian / Slate-900) and Light Mode (Paper White / Clean Slate) with smooth theme persistence.
  - Tabular numerals (`font-variant-numeric: tabular-nums`) for jitter-free financial readability.
- **Keyboard Shortcuts**:
  - Press `N` anywhere to quickly log a new transaction.
  - Press `Escape` to close any modal or drawer.

---

## 🚀 How to Run

Zero build step or server setup required:
1. Double-click `start_dashboard.bat` (on Windows) or directly open `index.html` in any web browser (Chrome, Edge, Firefox, Safari).
2. Alternatively, you can run a local server:
   ```bash
   python -m http.server 8080
   ```
   Then open `http://localhost:8080` in your browser.

---

## 📁 Project Architecture

```
expensetrackerdashboard/
├── index.html              # Clean semantic markup with modals & drawers
├── start_dashboard.bat     # Windows 1-click launcher
├── css/
│   ├── main.css            # Design tokens, typography, dark/light themes
│   ├── components.css      # Handcrafted buttons, cards, sliders, badges, toasts
│   └── dashboard.css       # Layout grid, KPI metrics, charts container
├── js/
│   ├── storage.js          # LocalStorage persistence, seed data generator, CSV/JSON export
│   ├── calculations.js     # Financial math, Life-Energy conversions, What-If simulation
│   ├── charts.js           # Chart.js renderers with custom palettes & tooltips
│   ├── ui.js               # DOM manipulation, metric cards, table rendering, drawer
│   └── app.js              # Application lifecycle & event coordination
└── README.md               # Documentation and feature guide
```
