/**
 * Financial Calculations & Life-Energy Conversions Engine
 * Full Multi-Currency Support with Indian Rupee (INR) and Global Currencies
 */

(function(global) {
  'use strict';

  const Calculations = {
    /**
     * Format numbers to localized currency (e.g., ₹1,25,000.00 for INR, $125,000.00 for USD)
     */
    formatCurrency(amount, currencyCode = 'INR') {
      const num = Number(amount) || 0;
      const CURRENCIES = global.LedgerCurrencies || {};
      const cur = CURRENCIES[currencyCode] || CURRENCIES.INR || { code: 'INR', symbol: '₹', locale: 'en-IN' };

      try {
        return new Intl.NumberFormat(cur.locale, {
          style: 'currency',
          currency: cur.code,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
      } catch (e) {
        // Fallback for environments lacking specific currency formatting
        return `${cur.symbol}${num.toLocaleString(cur.locale || 'en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    },

    /**
     * Convert an amount between currencies using benchmark exchange rates
     */
    convertAmount(amount, fromCode = 'INR', toCode = 'INR') {
      const num = Number(amount) || 0;
      if (fromCode === toCode) return num;

      const CURRENCIES = global.LedgerCurrencies || {};
      const fromCur = CURRENCIES[fromCode] || { rate: 83.5 };
      const toCur = CURRENCIES[toCode] || { rate: 83.5 };

      // Convert from source to USD base, then USD to target
      const inUSD = num / (fromCur.rate || 1.0);
      const converted = inUSD * (toCur.rate || 1.0);
      return Number(converted.toFixed(2));
    },

    /**
     * Convert financial value into Life-Energy (Hours of Life worked)
     * Formula: Total Life Hours = Amount / Hourly Wage
     * Universal across all currencies (₹, $, €, etc.)
     */
    calculateLifeEnergy(amount, hourlyWage = 500.00) {
      const safeWage = Math.max(1, Number(hourlyWage) || 500.00);
      const totalHours = (Number(amount) || 0) / safeWage;
      
      const wholeHours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - wholeHours) * 60);

      let formatted = '';
      if (totalHours < 1) {
        formatted = `${minutes}m`;
      } else if (minutes === 0) {
        formatted = `${wholeHours}h`;
      } else {
        formatted = `${wholeHours}h ${minutes}m`;
      }

      return {
        totalHours: Number(totalHours.toFixed(1)),
        wholeHours,
        minutes,
        formatted,
        displayBadge: `⏱️ ${formatted}`
      };
    },

    /**
     * Get days in month & days elapsed for accurate burn rate pacing
     */
    getMonthTimeframe(targetDate = new Date()) {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const currentDay = Math.min(targetDate.getDate(), totalDays);
      const remainingDays = totalDays - currentDay;

      return { year, month, totalDays, currentDay, remainingDays };
    },

    /**
     * Calculate complete financial summary metrics
     */
    calculateSummary(transactions, monthlyBudget = 65000, hourlyWage = 500) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Filter transactions for current month
      const monthTx = (transactions || []).filter(tx => {
        if (!tx.date) return false;
        const [y, m] = tx.date.split('-').map(Number);
        return y === currentYear && (m - 1) === currentMonth;
      });

      let totalExpenses = 0;
      let totalIncome = 0;
      let needsTotal = 0;
      let wantsTotal = 0;

      monthTx.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'expense') {
          totalExpenses += amt;
          if (tx.nature === 'want') {
            wantsTotal += amt;
          } else {
            needsTotal += amt;
          }
        } else if (tx.type === 'income') {
          totalIncome += amt;
        }
      });

      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
      
      const { totalDays, currentDay, remainingDays } = this.getMonthTimeframe(now);
      const dailyBurnRate = currentDay > 0 ? (totalExpenses / currentDay) : 0;
      const projectedMonthEnd = dailyBurnRate * totalDays;
      const budgetRemaining = monthlyBudget - totalExpenses;
      const budgetPace = (monthlyBudget / totalDays) * currentDay;
      const budgetPaceDiff = totalExpenses - budgetPace; // positive means over-pacing

      const lifeHoursSpent = this.calculateLifeEnergy(totalExpenses, hourlyWage);
      const lifeHoursBudget = this.calculateLifeEnergy(monthlyBudget, hourlyWage);

      const needsRatio = totalExpenses > 0 ? Math.round((needsTotal / totalExpenses) * 100) : 50;
      const wantsRatio = totalExpenses > 0 ? Math.round((wantsTotal / totalExpenses) * 100) : 50;

      return {
        totalExpenses,
        totalIncome,
        netSavings,
        savingsRate,
        monthlyBudget,
        budgetRemaining,
        dailyBurnRate,
        projectedMonthEnd,
        budgetPaceDiff,
        needsTotal,
        wantsTotal,
        needsRatio,
        wantsRatio,
        lifeHoursSpent,
        lifeHoursBudget,
        totalDays,
        currentDay,
        remainingDays
      };
    },

    /**
     * Group and aggregate expenses by category
     */
    calculateCategoryBreakdown(transactions) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const CATEGORIES = global.LedgerCategories || [];

      const categoryMap = {};
      CATEGORIES.forEach(c => {
        if (c.id !== 'income') {
          categoryMap[c.id] = {
            ...c,
            total: 0,
            count: 0
          };
        }
      });

      let totalExpense = 0;

      (transactions || []).forEach(tx => {
        if (tx.type === 'expense' && tx.date) {
          const [y, m] = tx.date.split('-').map(Number);
          if (y === currentYear && (m - 1) === currentMonth) {
            const amt = Number(tx.amount) || 0;
            totalExpense += amt;
            const cat = categoryMap[tx.category] || categoryMap['other'];
            if (cat) {
              cat.total += amt;
              cat.count += 1;
            }
          }
        }
      });

      const list = Object.values(categoryMap)
        .filter(item => item.total > 0)
        .map(item => ({
          ...item,
          percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);

      return {
        items: list,
        totalExpense
      };
    },

    /**
     * Cumulative daily spending pace vs ideal straight-line budget pace
     */
    calculateDailyCumulative(transactions, monthlyBudget = 65000) {
      const now = new Date();
      const { totalDays, currentDay } = this.getMonthTimeframe(now);
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Map spend per day
      const dailySpend = Array(totalDays + 1).fill(0);

      (transactions || []).forEach(tx => {
        if (tx.type === 'expense' && tx.date) {
          const [y, m, d] = tx.date.split('-').map(Number);
          if (y === currentYear && (m - 1) === currentMonth && d >= 1 && d <= totalDays) {
            dailySpend[d] += (Number(tx.amount) || 0);
          }
        }
      });

      const labels = [];
      const actualCumulative = [];
      const idealBudgetPace = [];
      let runningTotal = 0;

      const dailyBudgetStep = monthlyBudget / totalDays;

      for (let day = 1; day <= totalDays; day++) {
        labels.push(`Day ${day}`);
        idealBudgetPace.push(Number((dailyBudgetStep * day).toFixed(2)));

        if (day <= currentDay) {
          runningTotal += dailySpend[day];
          actualCumulative.push(Number(runningTotal.toFixed(2)));
        } else {
          actualCumulative.push(null); // future days
        }
      }

      return {
        labels,
        actualCumulative,
        idealBudgetPace,
        currentDay
      };
    },

    /**
     * Standout Feature: "What-If" Scenario Simulation Engine
     * Calculates real-time savings & life-hours gained from category cutbacks
     */
    simulateWhatIf(transactions, reductions = {}, hourlyWage = 500, monthlyBudget = 65000) {
      const { items: categoryItems } = this.calculateCategoryBreakdown(transactions);
      
      let monthlySavings = 0;
      const categoryDeltas = [];

      categoryItems.forEach(item => {
        const cutPercent = (reductions[item.id] || 0) / 100;
        if (cutPercent > 0) {
          const savedAmount = item.total * cutPercent;
          monthlySavings += savedAmount;
          categoryDeltas.push({
            id: item.id,
            name: item.name,
            color: item.color,
            original: item.total,
            cutPercent: Math.round(cutPercent * 100),
            savedAmount,
            newAmount: item.total - savedAmount
          });
        }
      });

      const annualDirectSavings = monthlySavings * 12;

      // Compounded growth if monthly savings are invested (e.g. 7% historical index/mutual fund return)
      const r = 0.07;
      const monthlyRate = r / 12;
      const monthsIn1Yr = 12;
      const compounded1Yr = monthlySavings > 0
        ? monthlySavings * ((Math.pow(1 + monthlyRate, monthsIn1Yr) - 1) / monthlyRate)
        : 0;

      const reclaimedLifeEnergy = this.calculateLifeEnergy(monthlySavings, hourlyWage);

      return {
        monthlySavings,
        annualDirectSavings,
        compounded1Yr: Math.round(compounded1Yr),
        reclaimedLifeEnergy,
        categoryDeltas
      };
    }
  };

  global.LedgerCalculations = Calculations;
})(window);
