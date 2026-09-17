/**
 * Storage Module - LocalStorage synchronization, seed data & backup tools
 * Supports Indian Rupee (INR) as default along with major global currencies
 */

(function(global) {
  'use strict';

  const STORAGE_KEYS = {
    TRANSACTIONS: 'ledger_transactions_v2',
    SETTINGS: 'ledger_settings_v2'
  };

  // Supported Currencies with Locales and Standard Benchmark Exchange Rates (Base: USD = 1.0)
  const CURRENCIES = {
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹ INR)', locale: 'en-IN', rate: 83.50, flag: '🇮🇳' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar ($ USD)', locale: 'en-US', rate: 1.00, flag: '🇺🇸' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro (€ EUR)', locale: 'de-DE', rate: 0.92, flag: '🇪🇺' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£ GBP)', locale: 'en-GB', rate: 0.79, flag: '🇬🇧' },
    JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥ JPY)', locale: 'ja-JP', rate: 155.00, flag: '🇯🇵' },
    AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)', locale: 'en-AE', rate: 3.67, flag: '🇦🇪' },
    CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$ CAD)', locale: 'en-CA', rate: 1.36, flag: '🇨🇦' },
    AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$ AUD)', locale: 'en-AU', rate: 1.52, flag: '🇦🇺' },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$ SGD)', locale: 'en-SG', rate: 1.35, flag: '🇸🇬' }
  };

  const CATEGORIES = [
    { id: 'housing', name: 'Housing & Rent', color: '#6366f1', icon: 'home' },
    { id: 'groceries', name: 'Groceries & Food', color: '#10b981', icon: 'shopping-cart' },
    { id: 'dining', name: 'Dining & Cafes', color: '#f59e0b', icon: 'coffee' },
    { id: 'transport', name: 'Transport & Fuel', color: '#3b82f6', icon: 'car' },
    { id: 'utilities', name: 'Utilities & Bills', color: '#8b5cf6', icon: 'zap' },
    { id: 'entertainment', name: 'Entertainment & Outings', color: '#ec4899', icon: 'film' },
    { id: 'shopping', name: 'Shopping & Apparel', color: '#14b8a6', icon: 'tag' },
    { id: 'health', name: 'Health & Fitness', color: '#06b6d4', icon: 'activity' },
    { id: 'subscriptions', name: 'Subscriptions', color: '#f97316', icon: 'repeat' },
    { id: 'income', name: 'Income / Salary', color: '#22c55e', icon: 'dollar-sign' },
    { id: 'other', name: 'Miscellaneous', color: '#64748b', icon: 'more-horizontal' }
  ];

  // Default to Indian Rupee (INR)
  const DEFAULT_SETTINGS = {
    currency: 'INR',
    currencySymbol: '₹',
    hourlyWage: 500.00,          // ₹500/hr (realistic standard rate in India)
    monthlyBudget: 65000.00,     // ₹65,000 monthly target budget
    theme: 'dark',
    lifeEnergyMode: false
  };

  /**
   * Generate realistic seed transactions in Indian Rupees (INR)
   */
  function generateSeedTransactions() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    const pad = (n) => String(n).padStart(2, '0');
    const makeDate = (d) => `${year}-${pad(month + 1)}-${pad(Math.min(Math.max(1, d), 28))}`;

    return [
      {
        id: 'tx_seed_1',
        title: 'Apartment Rent & Society Maintenance',
        amount: 24000.00,
        category: 'housing',
        type: 'expense',
        nature: 'need',
        date: makeDate(1),
        notes: 'Monthly fixed flat rental & maintenance fee'
      },
      {
        id: 'tx_seed_2',
        title: 'High-Speed Fiber Broadband (Airtel)',
        amount: 1099.00,
        category: 'utilities',
        type: 'expense',
        nature: 'need',
        date: makeDate(2),
        notes: '200 Mbps unlimited fiber connection'
      },
      {
        id: 'tx_seed_3',
        title: 'Supermarket Grocery Restock',
        amount: 4850.00,
        category: 'groceries',
        type: 'expense',
        nature: 'need',
        date: makeDate(Math.max(1, day - 8)),
        notes: 'Monthly staples, organic oils & pulses'
      },
      {
        id: 'tx_seed_4',
        title: 'Specialty Pour-Over Coffee (Blue Tokai)',
        amount: 280.00,
        category: 'dining',
        type: 'expense',
        nature: 'want',
        date: makeDate(Math.max(1, day - 6)),
        notes: 'Single origin artisanal roast'
      },
      {
        id: 'tx_seed_5',
        title: 'Weekend Dinner & Drinks with Friends',
        amount: 2650.00,
        category: 'dining',
        type: 'expense',
        nature: 'want',
        date: makeDate(Math.max(1, day - 5)),
        notes: 'Dinner at microbrewery'
      },
      {
        id: 'tx_seed_6',
        title: 'Electricity & Gas Utility Statement',
        amount: 2340.00,
        category: 'utilities',
        type: 'expense',
        nature: 'need',
        date: makeDate(Math.max(1, day - 4)),
        notes: 'Monthly power board bill'
      },
      {
        id: 'tx_seed_7',
        title: 'Cult.fit / Gym Membership',
        amount: 1850.00,
        category: 'health',
        type: 'expense',
        nature: 'need',
        date: makeDate(Math.max(1, day - 4)),
        notes: 'Monthly fitness pass & yoga sessions'
      },
      {
        id: 'tx_seed_8',
        title: 'Spotify Premium + Netflix Subscription',
        amount: 799.00,
        category: 'subscriptions',
        type: 'expense',
        nature: 'want',
        date: makeDate(Math.max(1, day - 3)),
        notes: 'Entertainment streaming accounts'
      },
      {
        id: 'tx_seed_9',
        title: 'Metro Smart Card & Fuel Refill',
        amount: 1500.00,
        category: 'transport',
        type: 'expense',
        nature: 'need',
        date: makeDate(Math.max(1, day - 3)),
        notes: 'Commute reload & petrol'
      },
      {
        id: 'tx_seed_10',
        title: 'Fresh Vegetables & Organic Fruits (Blinkit)',
        amount: 1120.00,
        category: 'groceries',
        type: 'expense',
        nature: 'need',
        date: makeDate(Math.max(1, day - 2)),
        notes: 'Mid-week fresh produce'
      },
      {
        id: 'tx_seed_11',
        title: 'Apparel & Casual Footwear (Zara)',
        amount: 3490.00,
        category: 'shopping',
        type: 'expense',
        nature: 'want',
        date: makeDate(Math.max(1, day - 1)),
        notes: 'Season wardrobe addition'
      },
      {
        id: 'tx_seed_12',
        title: 'PVR IMAX Movie Tickets & Snacks',
        amount: 1150.00,
        category: 'entertainment',
        type: 'expense',
        nature: 'want',
        date: makeDate(day),
        notes: 'Weekend cinema screening'
      },
      {
        id: 'tx_seed_13',
        title: 'Consulting & Freelance Retainer',
        amount: 32000.00,
        category: 'income',
        type: 'income',
        nature: 'need',
        date: makeDate(Math.max(1, day - 7)),
        notes: 'Direct client project milestone payout'
      },
      {
        id: 'tx_seed_14',
        title: 'Primary Monthly Salary Credit',
        amount: 92000.00,
        category: 'income',
        type: 'income',
        nature: 'need',
        date: makeDate(1),
        notes: 'Net payroll bank deposit'
      }
    ];
  }

  const Storage = {
    loadTransactions() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        if (!raw) {
          const seed = generateSeedTransactions();
          this.saveTransactions(seed);
          return seed;
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read transactions from localStorage, using seeds', e);
        return generateSeedTransactions();
      }
    },

    saveTransactions(transactions) {
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      } catch (e) {
        console.error('Error saving transactions', e);
      }
    },

    loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return { ...DEFAULT_SETTINGS };
      }
    },

    saveSettings(settings) {
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } catch (e) {
        console.error('Error saving settings', e);
      }
    },

    resetToDemo() {
      const seed = generateSeedTransactions();
      this.saveTransactions(seed);
      this.saveSettings(DEFAULT_SETTINGS);
      return { transactions: seed, settings: DEFAULT_SETTINGS };
    },

    exportToCSV(transactions, currency = 'INR') {
      const cur = CURRENCIES[currency] || CURRENCIES.INR;
      const headers = ['Date', 'Title', 'Type', 'Category', 'Nature', `Amount (${cur.code})`, 'Notes'];
      const rows = transactions.map(tx => [
        `"${tx.date}"`,
        `"${(tx.title || '').replace(/"/g, '""')}"`,
        `"${tx.type}"`,
        `"${tx.category}"`,
        `"${tx.nature}"`,
        tx.amount,
        `"${(tx.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger_${cur.code.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    exportToJSON(transactions, settings) {
      const data = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        currency: settings.currency || 'INR',
        settings,
        transactions
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Expose to global namespace
  global.LedgerStorage = Storage;
  global.LedgerCategories = CATEGORIES;
  global.LedgerCurrencies = CURRENCIES;
  global.LedgerDefaultSettings = DEFAULT_SETTINGS;
})(window);
