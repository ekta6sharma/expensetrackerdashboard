/**
 * UI Renderer & DOM Controllers
 * Supports Indian Rupee (INR) and Global Currencies
 */

(function(global) {
  'use strict';

  const UI = {
    /**
     * Display toast notification
     */
    showToast(message, type = 'info') {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span>${message}</span>
        </div>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        toast.style.transition = 'all 200ms ease';
        setTimeout(() => toast.remove(), 250);
      }, 3200);
    },

    /**
     * Render Top KPI Metric Cards
     */
    renderMetrics(summary, settings) {
      const Calculations = global.LedgerCalculations;
      const { 
        totalExpenses, 
        budgetRemaining, 
        dailyBurnRate, 
        projectedMonthEnd, 
        lifeHoursSpent,
        totalDays,
        currentDay,
        remainingDays
      } = summary;

      const totalSpendEl = document.getElementById('metricTotalSpend');
      const totalSpendSubEl = document.getElementById('metricTotalSpendSub');
      const lifeEnergyEl = document.getElementById('metricLifeEnergy');
      const lifeEnergySubEl = document.getElementById('metricLifeEnergySub');
      const burnRateEl = document.getElementById('metricBurnRate');
      const burnRateSubEl = document.getElementById('metricBurnRateSub');
      const budgetRemainingEl = document.getElementById('metricBudgetRemaining');
      const budgetRemainingSubEl = document.getElementById('metricBudgetRemainingSub');

      // 1. Total Spend
      if (totalSpendEl) {
        if (settings.lifeEnergyMode) {
          totalSpendEl.textContent = lifeHoursSpent.formatted;
          if (totalSpendSubEl) {
            totalSpendSubEl.textContent = `${Calculations.formatCurrency(totalExpenses, settings.currency)} spent this month`;
          }
        } else {
          totalSpendEl.textContent = Calculations.formatCurrency(totalExpenses, settings.currency);
          if (totalSpendSubEl) {
            totalSpendSubEl.textContent = `${lifeHoursSpent.formatted} of life spent`;
          }
        }
      }

      // 2. Standout: Life Energy Metric Card
      if (lifeEnergyEl) {
        lifeEnergyEl.textContent = lifeHoursSpent.formatted;
        if (lifeEnergySubEl) {
          const hourlyRateStr = Calculations.formatCurrency(settings.hourlyWage, settings.currency);
          lifeEnergySubEl.textContent = `Based on your ${hourlyRateStr}/hr wage`;
        }
      }

      // 3. Daily Burn Rate
      if (burnRateEl) {
        if (settings.lifeEnergyMode) {
          const burnHrs = Calculations.calculateLifeEnergy(dailyBurnRate, settings.hourlyWage).formatted;
          burnRateEl.textContent = `${burnHrs}/day`;
        } else {
          burnRateEl.textContent = `${Calculations.formatCurrency(dailyBurnRate, settings.currency)}/day`;
        }
        if (burnRateSubEl) {
          const projStr = settings.lifeEnergyMode
            ? Calculations.calculateLifeEnergy(projectedMonthEnd, settings.hourlyWage).formatted
            : Calculations.formatCurrency(projectedMonthEnd, settings.currency);
          burnRateSubEl.textContent = `Pacing to ${projStr} at month-end`;
        }
      }

      // 4. Budget Cushion / Remaining
      if (budgetRemainingEl) {
        const isUnder = budgetRemaining >= 0;
        if (settings.lifeEnergyMode) {
          const cushionHrs = Calculations.calculateLifeEnergy(Math.abs(budgetRemaining), settings.hourlyWage).formatted;
          budgetRemainingEl.textContent = isUnder ? `+${cushionHrs}` : `-${cushionHrs}`;
        } else {
          budgetRemainingEl.textContent = Calculations.formatCurrency(budgetRemaining, settings.currency);
        }
        budgetRemainingEl.style.color = isUnder ? 'var(--accent-income)' : 'var(--accent-expense)';

        if (budgetRemainingSubEl) {
          budgetRemainingSubEl.textContent = `${remainingDays} days left in ${new Date().toLocaleString('default', { month: 'short' })}`;
        }
      }
    },

    /**
     * Render Conscious Spending Split (Needs vs Wants)
     */
    renderConsciousSpending(summary, settings) {
      const Calculations = global.LedgerCalculations;
      const fillNeeds = document.getElementById('splitFillNeeds');
      const fillWants = document.getElementById('splitFillWants');
      const labelNeeds = document.getElementById('splitLabelNeeds');
      const labelWants = document.getElementById('splitLabelWants');

      if (!fillNeeds || !fillWants) return;

      const { needsTotal, wantsTotal, needsRatio, wantsRatio } = summary;

      fillNeeds.style.width = `${needsRatio}%`;
      fillWants.style.width = `${wantsRatio}%`;

      const needsDisplay = settings.lifeEnergyMode
        ? Calculations.calculateLifeEnergy(needsTotal, settings.hourlyWage).formatted
        : Calculations.formatCurrency(needsTotal, settings.currency);

      const wantsDisplay = settings.lifeEnergyMode
        ? Calculations.calculateLifeEnergy(wantsTotal, settings.hourlyWage).formatted
        : Calculations.formatCurrency(wantsTotal, settings.currency);

      if (labelNeeds) {
        labelNeeds.innerHTML = `<strong>Essentials (Needs):</strong> ${needsDisplay} <span>(${needsRatio}%)</span>`;
      }
      if (labelWants) {
        labelWants.innerHTML = `<strong>Discretionary (Wants):</strong> ${wantsDisplay} <span>(${wantsRatio}%)</span>`;
      }
    },

    /**
     * Render Transaction Table
     */
    renderTransactionTable(transactions, settings, onEdit, onDelete) {
      const Calculations = global.LedgerCalculations;
      const CATEGORIES = global.LedgerCategories || [];
      const tbody = document.getElementById('transactionsTableBody');
      const emptyState = document.getElementById('emptyTransactionsState');
      if (!tbody) return;

      tbody.innerHTML = '';

      if (!transactions || transactions.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      // Sort newest first
      const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

      sorted.forEach(tx => {
        const tr = document.createElement('tr');
        const cat = CATEGORIES.find(c => c.id === tx.category) || { name: tx.category, color: '#64748b' };
        const isExpense = tx.type === 'expense';
        const lifeTime = Calculations.calculateLifeEnergy(tx.amount, settings.hourlyWage).formatted;

        const mainAmountDisplay = settings.lifeEnergyMode
          ? (isExpense ? `-${lifeTime}` : `+${lifeTime}`)
          : (isExpense 
              ? `-${Calculations.formatCurrency(tx.amount, settings.currency)}` 
              : `+${Calculations.formatCurrency(tx.amount, settings.currency)}`);

        const secondaryAmountDisplay = settings.lifeEnergyMode
          ? Calculations.formatCurrency(tx.amount, settings.currency)
          : `⏱️ ${lifeTime} of work`;

        tr.innerHTML = `
          <td class="tx-date">${tx.date}</td>
          <td>
            <div class="tx-description">
              <span class="tx-title">${this.escapeHtml(tx.title)}</span>
              ${isExpense 
                ? `<span class="badge ${tx.nature === 'want' ? 'badge-want' : 'badge-need'}">
                    <span class="badge-dot"></span>${tx.nature === 'want' ? 'Want' : 'Need'}
                   </span>`
                : `<span class="badge badge-income">Income</span>`
              }
            </div>
            ${tx.notes ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${this.escapeHtml(tx.notes)}</div>` : ''}
          </td>
          <td>
            <span class="badge badge-category" style="border-left: 3px solid ${cat.color};">
              ${cat.name}
            </span>
          </td>
          <td style="text-align: right;">
            <span class="tx-amount ${isExpense ? 'expense' : 'income'}">${mainAmountDisplay}</span>
            <span class="tx-life-hours">${secondaryAmountDisplay}</span>
          </td>
          <td style="text-align: right;">
            <div class="tx-actions" style="justify-content: flex-end;">
              <button class="btn btn-icon btn-ghost btn-sm btn-edit" title="Edit entry" data-id="${tx.id}">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:0.95rem;height:0.95rem;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button class="btn btn-icon btn-ghost btn-sm btn-delete" title="Delete entry" data-id="${tx.id}" style="color:var(--accent-expense);">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:0.95rem;height:0.95rem;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        `;

        tr.querySelector('.btn-edit').addEventListener('click', () => onEdit(tx.id));
        tr.querySelector('.btn-delete').addEventListener('click', () => onDelete(tx.id));

        tbody.appendChild(tr);
      });
    },

    /**
     * Populate Category Dropdowns
     */
    populateCategorySelects() {
      const CATEGORIES = global.LedgerCategories || [];
      const select = document.getElementById('txCategory');
      const filterSelect = document.getElementById('filterCategory');

      const optionsHtml = CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      if (select) {
        select.innerHTML = optionsHtml;
      }
      if (filterSelect) {
        filterSelect.innerHTML = `<option value="all">All Categories</option>${optionsHtml}`;
      }
    },

    /**
     * Populate Currency Selectors (Topbar & Settings)
     */
    populateCurrencySelects(selectedCurrency = 'INR') {
      const CURRENCIES = global.LedgerCurrencies || {};
      const topbarSelect = document.getElementById('topbarCurrencySelect');
      const settingsSelect = document.getElementById('settingCurrencySelect');

      const optionsHtml = Object.values(CURRENCIES).map(c => `
        <option value="${c.code}" ${c.code === selectedCurrency ? 'selected' : ''}>
          ${c.flag} ${c.code} (${c.symbol})
        </option>
      `).join('');

      if (topbarSelect) {
        topbarSelect.innerHTML = optionsHtml;
        topbarSelect.value = selectedCurrency;
      }
      if (settingsSelect) {
        settingsSelect.innerHTML = Object.values(CURRENCIES).map(c => `
          <option value="${c.code}" ${c.code === selectedCurrency ? 'selected' : ''}>
            ${c.flag} ${c.name}
          </option>
        `).join('');
        settingsSelect.value = selectedCurrency;
      }
    },

    /**
     * Render Standout "What-If" Sandbox Sliders & Live Results
     */
    renderWhatIfSandbox(transactions, settings, reductions, onSliderChange) {
      const Calculations = global.LedgerCalculations;
      const container = document.getElementById('whatIfSlidersContainer');
      if (!container) return;

      const { items: categories } = Calculations.calculateCategoryBreakdown(transactions);
      const simulation = Calculations.simulateWhatIf(transactions, reductions, settings.hourlyWage, settings.monthlyBudget);

      // Update Result Counters
      const monthlySavedEl = document.getElementById('simMonthlySaved');
      const annualSavedEl = document.getElementById('simAnnualSaved');
      const lifeReclaimedEl = document.getElementById('simLifeReclaimed');
      const compoundGrowthEl = document.getElementById('simCompoundGrowth');

      if (monthlySavedEl) {
        monthlySavedEl.textContent = Calculations.formatCurrency(simulation.monthlySavings, settings.currency);
      }
      if (annualSavedEl) {
        annualSavedEl.textContent = Calculations.formatCurrency(simulation.annualDirectSavings, settings.currency);
      }
      if (lifeReclaimedEl) {
        lifeReclaimedEl.textContent = simulation.reclaimedLifeEnergy.formatted;
      }
      if (compoundGrowthEl) {
        compoundGrowthEl.textContent = Calculations.formatCurrency(simulation.compounded1Yr, settings.currency);
      }

      // Render Sliders for discretionary / top categories
      container.innerHTML = categories.map(cat => {
        const currentCut = reductions[cat.id] || 0;
        const originalAmt = Calculations.formatCurrency(cat.total, settings.currency);
        const savedDollar = (cat.total * (currentCut / 100));
        const savedStr = savedDollar > 0 ? `-${Calculations.formatCurrency(savedDollar, settings.currency)}` : `${((global.LedgerCurrencies || {})[settings.currency] || {symbol:'₹'}).symbol}0`;

        return `
          <div class="range-slider-group">
            <div class="range-slider-header">
              <span class="range-slider-name">
                <span class="legend-color-dot" style="background-color: ${cat.color}"></span>
                ${cat.name} (${originalAmt})
              </span>
              <span class="range-slider-value" id="val_${cat.id}">${currentCut}% (${savedStr})</span>
            </div>
            <input 
              type="range" 
              class="range-slider" 
              data-category="${cat.id}" 
              min="0" 
              max="60" 
              step="5" 
              value="${currentCut}"
            />
          </div>
        `;
      }).join('');

      // Attach slider listeners
      container.querySelectorAll('.range-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
          const catId = e.target.dataset.category;
          const val = Number(e.target.value);
          onSliderChange(catId, val);
        });
      });
    },

    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  global.LedgerUI = UI;
})(window);
