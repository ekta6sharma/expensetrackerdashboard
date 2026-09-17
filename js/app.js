/**
 * Main Application Controller - Ledgercraft Dashboard
 * Multi-Currency Support (INR Default + Global Currencies)
 */

(function(global) {
  'use strict';

  const Storage = global.LedgerStorage;
  const Calculations = global.LedgerCalculations;
  const DashboardCharts = global.LedgerCharts;
  const UI = global.LedgerUI;
  const CATEGORIES = global.LedgerCategories;
  const CURRENCIES = global.LedgerCurrencies;
  const DEFAULT_SETTINGS = global.LedgerDefaultSettings;

  // Application State
  const State = {
    transactions: [],
    settings: { ...DEFAULT_SETTINGS },
    activeFilter: 'all', // 'all' | 'need' | 'want' | 'expense' | 'income'
    selectedCategory: 'all',
    searchQuery: '',
    editingTxId: null,
    whatIfReductions: {} // { categoryId: cutPercentage }
  };

  /**
   * Initialize Dashboard
   */
  function init() {
    // 1. Load Data
    State.transactions = Storage.loadTransactions();
    State.settings = Storage.loadSettings();

    // Ensure currency setting is valid
    if (!State.settings.currency || !CURRENCIES[State.settings.currency]) {
      State.settings.currency = 'INR';
      State.settings.currencySymbol = '₹';
    }

    // Apply Theme
    document.documentElement.setAttribute('data-theme', State.settings.theme || 'dark');
    updateThemeIcon();

    // Update Life-Energy Toggle UI
    updateLifeToggleUI();

    // Populate Dropdowns
    UI.populateCategorySelects();
    UI.populateCurrencySelects(State.settings.currency);

    // Populate Settings Modal Inputs
    syncSettingsInputs();

    // Attach All Event Handlers
    setupEventHandlers();

    // Render Everything
    refreshDashboard();
  }

  /**
   * Refresh all metrics, charts, and table
   */
  function refreshDashboard() {
    const summary = Calculations.calculateSummary(
      State.transactions, 
      State.settings.monthlyBudget, 
      State.settings.hourlyWage
    );

    // 1. Render Top KPI Metrics
    UI.renderMetrics(summary, State.settings);

    // 2. Render Conscious Spending Split
    UI.renderConsciousSpending(summary, State.settings);

    // 3. Render Charts
    DashboardCharts.updateCharts(State.transactions, State.settings);

    // 4. Filter & Render Transactions Table
    const filtered = filterTransactions();
    UI.renderTransactionTable(
      filtered, 
      State.settings, 
      handleEditTransaction, 
      handleDeleteTransaction
    );
  }

  /**
   * Filter transactions based on active filter, category, and search query
   */
  function filterTransactions() {
    return State.transactions.filter(tx => {
      // Search query match
      if (State.searchQuery) {
        const q = State.searchQuery.toLowerCase();
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const notesMatch = (tx.notes || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        if (!titleMatch && !notesMatch && !catMatch) return false;
      }

      // Category filter
      if (State.selectedCategory !== 'all' && tx.category !== State.selectedCategory) {
        return false;
      }

      // Nature / Type Filter
      if (State.activeFilter === 'need' && (tx.type !== 'expense' || tx.nature !== 'need')) return false;
      if (State.activeFilter === 'want' && (tx.type !== 'expense' || tx.nature !== 'want')) return false;
      if (State.activeFilter === 'expense' && tx.type !== 'expense') return false;
      if (State.activeFilter === 'income' && tx.type !== 'income') return false;

      return true;
    });
  }

  /**
   * Handle dynamic currency change across entire application
   */
  function handleCurrencyChange(newCurrencyCode) {
    if (!CURRENCIES[newCurrencyCode] || newCurrencyCode === State.settings.currency) return;

    const oldCode = State.settings.currency;
    const newCur = CURRENCIES[newCurrencyCode];

    // Convert transaction values, budget, and wage to new currency
    State.transactions = State.transactions.map(tx => ({
      ...tx,
      amount: Calculations.convertAmount(tx.amount, oldCode, newCurrencyCode)
    }));

    State.settings.monthlyBudget = Calculations.convertAmount(State.settings.monthlyBudget, oldCode, newCurrencyCode);
    State.settings.hourlyWage = Calculations.convertAmount(State.settings.hourlyWage, oldCode, newCurrencyCode);
    State.settings.currency = newCurrencyCode;
    State.settings.currencySymbol = newCur.symbol;

    // Save changes
    Storage.saveTransactions(State.transactions);
    Storage.saveSettings(State.settings);

    // Sync UI elements
    UI.populateCurrencySelects(newCurrencyCode);
    syncSettingsInputs();
    refreshDashboard();

    UI.showToast(`Converted to ${newCur.name} (${newCur.symbol})`, 'info');
  }

  /**
   * Setup Event Listeners
   */
  function setupEventHandlers() {
    // Topbar Currency Selector
    const topbarCurSelect = document.getElementById('topbarCurrencySelect');
    if (topbarCurSelect) {
      topbarCurSelect.addEventListener('change', (e) => {
        handleCurrencyChange(e.target.value);
      });
    }

    // Life Energy Global Toggle
    const lifeToggle = document.getElementById('globalLifeToggle');
    if (lifeToggle) {
      lifeToggle.addEventListener('click', () => {
        State.settings.lifeEnergyMode = !State.settings.lifeEnergyMode;
        Storage.saveSettings(State.settings);
        updateLifeToggleUI();
        refreshDashboard();
        UI.showToast(
          State.settings.lifeEnergyMode 
            ? 'Life-Energy Mode Active: Amounts shown in hours of your life' 
            : `Standard Currency Mode (${State.settings.currency})`, 
          'info'
        );
      });
    }

    // Theme Toggle Button
    const themeToggle = document.getElementById('themeToggleBtn');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = State.settings.theme === 'dark' ? 'light' : 'dark';
        State.settings.theme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        Storage.saveSettings(State.settings);
        updateThemeIcon();
        DashboardCharts.updateCharts(State.transactions, State.settings);
      });
    }

    // Open "Add Expense" Modal
    const openAddModalBtn = document.getElementById('openAddExpenseBtn');
    if (openAddModalBtn) {
      openAddModalBtn.addEventListener('click', () => {
        openExpenseModal();
      });
    }

    // Close Modal Buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    // Modal Backdrop Click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeAllModals();
        }
      });
    });

    // Expense Form Submit
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
      expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    }

    // Type Selector inside Modal (Expense vs Income)
    const typeExpenseRadio = document.getElementById('typeExpense');
    const typeIncomeRadio = document.getElementById('typeIncome');
    const natureGroup = document.getElementById('natureFormGroup');

    if (typeExpenseRadio && typeIncomeRadio && natureGroup) {
      typeExpenseRadio.addEventListener('change', () => {
        natureGroup.style.display = 'block';
      });
      typeIncomeRadio.addEventListener('change', () => {
        natureGroup.style.display = 'none';
        const catSelect = document.getElementById('txCategory');
        if (catSelect) catSelect.value = 'income';
      });
    }

    // Standout Feature: Open What-If Sandbox Drawer
    const openSandboxBtn = document.getElementById('openSandboxBtn');
    const closeSandboxBtn = document.getElementById('closeSandboxBtn');
    const sandboxOverlay = document.getElementById('sandboxDrawerOverlay');

    if (openSandboxBtn) {
      openSandboxBtn.addEventListener('click', () => {
        openWhatIfSandbox();
      });
    }

    if (closeSandboxBtn) {
      closeSandboxBtn.addEventListener('click', () => {
        closeWhatIfSandbox();
      });
    }

    if (sandboxOverlay) {
      sandboxOverlay.addEventListener('click', () => {
        closeWhatIfSandbox();
      });
    }

    // Reset Sandbox Sliders
    const resetSandboxBtn = document.getElementById('resetSandboxBtn');
    if (resetSandboxBtn) {
      resetSandboxBtn.addEventListener('click', () => {
        State.whatIfReductions = {};
        UI.renderWhatIfSandbox(State.transactions, State.settings, State.whatIfReductions, handleSandboxSliderChange);
        UI.showToast('Sandbox sliders reset to baseline', 'info');
      });
    }

    // Apply Sandbox Targets as Budget
    const applySandboxBtn = document.getElementById('applySandboxBtn');
    if (applySandboxBtn) {
      applySandboxBtn.addEventListener('click', () => {
        const sim = Calculations.simulateWhatIf(State.transactions, State.whatIfReductions, State.settings.hourlyWage, State.settings.monthlyBudget);
        if (sim.monthlySavings > 0) {
          State.settings.monthlyBudget = Math.max(500, Math.round(State.settings.monthlyBudget - sim.monthlySavings));
          Storage.saveSettings(State.settings);
          syncSettingsInputs();
          refreshDashboard();
          closeWhatIfSandbox();
          UI.showToast(`Applied new budget target: ${Calculations.formatCurrency(State.settings.monthlyBudget, State.settings.currency)}!`, 'success');
        } else {
          UI.showToast('Please adjust at least one category slider to simulate savings first', 'warning');
        }
      });
    }

    // Search Input
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        State.searchQuery = e.target.value.trim();
        const filtered = filterTransactions();
        UI.renderTransactionTable(filtered, State.settings, handleEditTransaction, handleDeleteTransaction);
      });
    }

    // Filter Pills (All, Needs, Wants, Income)
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        State.activeFilter = e.currentTarget.dataset.filter;
        const filtered = filterTransactions();
        UI.renderTransactionTable(filtered, State.settings, handleEditTransaction, handleDeleteTransaction);
      });
    });

    // Category Dropdown Filter
    const filterCatSelect = document.getElementById('filterCategory');
    if (filterCatSelect) {
      filterCatSelect.addEventListener('change', (e) => {
        State.selectedCategory = e.target.value;
        const filtered = filterTransactions();
        UI.renderTransactionTable(filtered, State.settings, handleEditTransaction, handleDeleteTransaction);
      });
    }

    // Settings Modal Open
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        openSettingsModal();
      });
    }

    // Settings Form Submit
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedCur = document.getElementById('settingCurrencySelect').value;
        const wage = parseFloat(document.getElementById('settingWage').value) || 500;
        const budget = parseFloat(document.getElementById('settingBudget').value) || 65000;

        if (selectedCur !== State.settings.currency) {
          handleCurrencyChange(selectedCur);
        }

        State.settings.hourlyWage = wage;
        State.settings.monthlyBudget = budget;

        Storage.saveSettings(State.settings);
        closeAllModals();
        refreshDashboard();
        UI.showToast('Settings successfully updated', 'success');
      });
    }

    // Reset Demo Data
    const resetDemoBtn = document.getElementById('resetDemoDataBtn');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (confirm('Reset all transactions and settings to default Indian Rupee sample data?')) {
          const res = Storage.resetToDemo();
          State.transactions = res.transactions;
          State.settings = res.settings;
          syncSettingsInputs();
          updateLifeToggleUI();
          UI.populateCurrencySelects(State.settings.currency);
          closeAllModals();
          refreshDashboard();
          UI.showToast('Reset to demo sample data in Indian Rupees (₹)', 'success');
        }
      });
    }

    // Export CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        Storage.exportToCSV(State.transactions, State.settings.currency);
        UI.showToast(`CSV export downloaded (${State.settings.currency})`, 'success');
      });
    }

    // Export JSON
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        Storage.exportToJSON(State.transactions, State.settings);
        UI.showToast('JSON backup downloaded', 'success');
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
        closeWhatIfSandbox();
      }
      // Press 'n' to quickly add expense when not typing in an input
      if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openExpenseModal();
      }
    });
  }

  /**
   * Handle Add/Edit Expense Form Submission
   */
  function handleExpenseFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('txTitle').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const date = document.getElementById('txDate').value;
    const isExpense = document.getElementById('typeExpense').checked;
    const nature = isExpense 
      ? (document.getElementById('natureWant').checked ? 'want' : 'need')
      : 'need';
    const notes = document.getElementById('txNotes').value.trim();

    if (!title || isNaN(amount) || amount <= 0 || !date) {
      UI.showToast('Please fill out all required fields with a positive amount', 'warning');
      return;
    }

    if (State.editingTxId) {
      // Update existing transaction
      const index = State.transactions.findIndex(t => t.id === State.editingTxId);
      if (index !== -1) {
        State.transactions[index] = {
          ...State.transactions[index],
          title,
          amount,
          category,
          date,
          type: isExpense ? 'expense' : 'income',
          nature,
          notes
        };
        UI.showToast('Transaction updated', 'success');
      }
      State.editingTxId = null;
    } else {
      // Create new transaction
      const newTx = {
        id: 'tx_' + Date.now(),
        title,
        amount,
        category,
        date,
        type: isExpense ? 'expense' : 'income',
        nature,
        notes
      };
      State.transactions.unshift(newTx);
      UI.showToast('Transaction logged successfully', 'success');
    }

    Storage.saveTransactions(State.transactions);
    closeAllModals();
    refreshDashboard();
  }

  /**
   * Open Modal to Edit an Existing Transaction
   */
  function handleEditTransaction(id) {
    const tx = State.transactions.find(t => t.id === id);
    if (!tx) return;

    State.editingTxId = id;
    openExpenseModal(tx);
  }

  /**
   * Delete a Transaction
   */
  function handleDeleteTransaction(id) {
    const tx = State.transactions.find(t => t.id === id);
    if (!tx) return;

    if (confirm(`Delete "${tx.title}"?`)) {
      State.transactions = State.transactions.filter(t => t.id !== id);
      Storage.saveTransactions(State.transactions);
      refreshDashboard();
      UI.showToast('Transaction removed', 'info');
    }
  }

  /**
   * What-If Sandbox Controller
   */
  function openWhatIfSandbox() {
    const drawer = document.getElementById('sandboxDrawer');
    const overlay = document.getElementById('sandboxDrawerOverlay');
    if (drawer && overlay) {
      overlay.classList.add('open');
      drawer.classList.add('open');
      UI.renderWhatIfSandbox(State.transactions, State.settings, State.whatIfReductions, handleSandboxSliderChange);
    }
  }

  function closeWhatIfSandbox() {
    const drawer = document.getElementById('sandboxDrawer');
    const overlay = document.getElementById('sandboxDrawerOverlay');
    if (drawer && overlay) {
      overlay.classList.remove('open');
      drawer.classList.remove('open');
    }
  }

  function handleSandboxSliderChange(categoryId, cutPercent) {
    State.whatIfReductions[categoryId] = cutPercent;
    UI.renderWhatIfSandbox(State.transactions, State.settings, State.whatIfReductions, handleSandboxSliderChange);
  }

  /**
   * Open Modal for Adding / Editing Expense
   */
  function openExpenseModal(tx = null) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const titleEl = document.getElementById('modalExpenseTitle');
    const dateInput = document.getElementById('txDate');
    const natureGroup = document.getElementById('natureFormGroup');
    const curLabel = document.getElementById('txCurrencyBadge');

    if (!modal || !form) return;

    form.reset();

    if (curLabel) {
      curLabel.textContent = State.settings.currencySymbol || '₹';
    }

    if (tx) {
      titleEl.textContent = 'Edit Transaction';
      document.getElementById('txTitle').value = tx.title || '';
      document.getElementById('txAmount').value = tx.amount || '';
      document.getElementById('txCategory').value = tx.category || 'other';
      dateInput.value = tx.date || new Date().toISOString().slice(0, 10);
      document.getElementById('txNotes').value = tx.notes || '';

      if (tx.type === 'income') {
        document.getElementById('typeIncome').checked = true;
        if (natureGroup) natureGroup.style.display = 'none';
      } else {
        document.getElementById('typeExpense').checked = true;
        if (natureGroup) natureGroup.style.display = 'block';
        if (tx.nature === 'want') {
          document.getElementById('natureWant').checked = true;
        } else {
          document.getElementById('natureNeed').checked = true;
        }
      }
    } else {
      State.editingTxId = null;
      titleEl.textContent = 'Log New Transaction';
      dateInput.value = new Date().toISOString().slice(0, 10);
      document.getElementById('typeExpense').checked = true;
      document.getElementById('natureNeed').checked = true;
      if (natureGroup) natureGroup.style.display = 'block';
    }

    modal.classList.add('open');
    setTimeout(() => document.getElementById('txTitle').focus(), 150);
  }

  function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      syncSettingsInputs();
      UI.populateCurrencySelects(State.settings.currency);
      modal.classList.add('open');
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('open');
    });
    State.editingTxId = null;
  }

  function syncSettingsInputs() {
    const wageInput = document.getElementById('settingWage');
    const budgetInput = document.getElementById('settingBudget');
    const curSelect = document.getElementById('settingCurrencySelect');

    if (wageInput) wageInput.value = Math.round(State.settings.hourlyWage);
    if (budgetInput) budgetInput.value = Math.round(State.settings.monthlyBudget);
    if (curSelect) curSelect.value = State.settings.currency;
  }

  function updateLifeToggleUI() {
    const container = document.getElementById('globalLifeToggle');
    if (container) {
      if (State.settings.lifeEnergyMode) {
        container.classList.add('active');
      } else {
        container.classList.remove('active');
      }
    }
  }

  function updateThemeIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isLight = State.settings.theme === 'light';
    btn.innerHTML = isLight
      ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:1.15rem;height:1.15rem;">
           <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
         </svg>`
      : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:1.15rem;height:1.15rem;">
           <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
         </svg>`;
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
