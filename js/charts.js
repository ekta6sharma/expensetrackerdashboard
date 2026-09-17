/**
 * Chart.js Integration & Data Visualizations
 * Supports Indian Rupee (INR) and Global Currencies
 */

(function(global) {
  'use strict';

  let velocityChartInstance = null;
  let categoryChartInstance = null;

  const DashboardCharts = {
    /**
     * Determine chart theme tokens based on document theme
     */
    getThemeTokens() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      return {
        gridColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        tickColor: isLight ? '#64748b' : '#94a3b8',
        tooltipBg: isLight ? '#ffffff' : '#1e293b',
        tooltipText: isLight ? '#0f172a' : '#f8fafc',
        tooltipBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
        linePrimary: '#3b82f6',
        lineSecondary: isLight ? '#94a3b8' : '#475569',
        fillGradientStart: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.22)',
        fillGradientEnd: isLight ? 'rgba(59, 130, 246, 0.0)' : 'rgba(59, 130, 246, 0.0)'
      };
    },

    /**
     * Render or update Cumulative Spending Velocity Chart
     */
    renderVelocityChart(transactions, settings) {
      const canvas = document.getElementById('spendingVelocityChart');
      if (!canvas || typeof Chart === 'undefined') return;

      const Calculations = global.LedgerCalculations;
      const ctx = canvas.getContext('2d');
      const theme = this.getThemeTokens();
      const data = Calculations.calculateDailyCumulative(transactions, settings.monthlyBudget);

      if (velocityChartInstance) {
        velocityChartInstance.destroy();
      }

      // Subtle gradient for area fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 260);
      gradient.addColorStop(0, theme.fillGradientStart);
      gradient.addColorStop(1, theme.fillGradientEnd);

      velocityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Actual Spend',
              data: data.actualCumulative,
              borderColor: theme.linePrimary,
              backgroundColor: gradient,
              borderWidth: 2.2,
              tension: 0.35,
              fill: true,
              pointBackgroundColor: theme.linePrimary,
              pointBorderColor: '#ffffff',
              pointRadius: (ctx) => {
                const index = ctx.dataIndex;
                return index === data.currentDay - 1 ? 5 : 0;
              },
              pointHoverRadius: 6
            },
            {
              label: 'Budget Pace Target',
              data: data.idealBudgetPace,
              borderColor: theme.lineSecondary,
              borderWidth: 1.5,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: true,
                color: theme.tickColor,
                font: {
                  size: 11,
                  family: 'inherit'
                }
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 10,
              boxPadding: 4,
              usePointStyle: true,
              callbacks: {
                label: (context) => {
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return null;
                  const formattedCur = Calculations.formatCurrency(val, settings.currency);
                  const lifeTime = Calculations.calculateLifeEnergy(val, settings.hourlyWage).formatted;
                  
                  if (settings.lifeEnergyMode) {
                    return ` ${context.dataset.label}: ${lifeTime} (${formattedCur})`;
                  }
                  return ` ${context.dataset.label}: ${formattedCur} (${lifeTime})`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: theme.gridColor,
                drawBorder: false
              },
              ticks: {
                color: theme.tickColor,
                font: { size: 10 },
                maxTicksLimit: 10
              }
            },
            y: {
              grid: {
                color: theme.gridColor,
                drawBorder: false
              },
              ticks: {
                color: theme.tickColor,
                font: { size: 10 },
                callback: (val) => {
                  if (settings.lifeEnergyMode) {
                    const hrs = Math.round(val / Math.max(1, settings.hourlyWage));
                    return `${hrs}h`;
                  }
                  // Clean compact axis formatting
                  const cur = (global.LedgerCurrencies || {})[settings.currency] || { symbol: '₹' };
                  if (val >= 100000) {
                    return `${cur.symbol}${(val / 100000).toFixed(1)}L`; // Lakhs for Indian scale
                  }
                  if (val >= 1000) {
                    return `${cur.symbol}${(val / 1000).toFixed(0)}k`;
                  }
                  return `${cur.symbol}${val}`;
                }
              }
            }
          }
        }
      });
    },

    /**
     * Render or update Category Allocation Donut Chart
     */
    renderCategoryDonut(transactions, settings) {
      const canvas = document.getElementById('categoryDonutChart');
      const legendEl = document.getElementById('categoryDonutLegend');
      const centerValEl = document.getElementById('donutCenterVal');
      const centerLabelEl = document.getElementById('donutCenterLabel');
      if (!canvas || typeof Chart === 'undefined') return;

      const Calculations = global.LedgerCalculations;
      const ctx = canvas.getContext('2d');
      const theme = this.getThemeTokens();
      const { items, totalExpense } = Calculations.calculateCategoryBreakdown(transactions);

      if (categoryChartInstance) {
        categoryChartInstance.destroy();
      }

      // Update center callout
      if (centerValEl) {
        if (settings.lifeEnergyMode) {
          centerValEl.textContent = Calculations.calculateLifeEnergy(totalExpense, settings.hourlyWage).formatted;
          if (centerLabelEl) centerLabelEl.textContent = 'Total Life-Hours';
        } else {
          centerValEl.textContent = Calculations.formatCurrency(totalExpense, settings.currency);
          if (centerLabelEl) centerLabelEl.textContent = 'Total Outflow';
        }
      }

      // Fallback if no expenses
      if (items.length === 0) {
        if (legendEl) {
          legendEl.innerHTML = '<div class="legend-item" style="color:var(--text-muted);justify-content:center;">No expense records this month</div>';
        }
        return;
      }

      const labels = items.map(i => i.name);
      const amounts = items.map(i => i.total);
      const colors = items.map(i => i.color);

      categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: amounts,
            backgroundColor: colors,
            borderColor: theme.tooltipBg,
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (context) => {
                  const item = items[context.dataIndex];
                  const amt = Calculations.formatCurrency(item.total, settings.currency);
                  const life = Calculations.calculateLifeEnergy(item.total, settings.hourlyWage).formatted;
                  if (settings.lifeEnergyMode) {
                    return ` ${item.percentage}% • ${life} (${amt})`;
                  }
                  return ` ${item.percentage}% • ${amt} (${life})`;
                }
              }
            }
          }
        }
      });

      // Populate bespoke HTML legend
      if (legendEl) {
        legendEl.innerHTML = items.map(item => {
          const valDisplay = settings.lifeEnergyMode
            ? Calculations.calculateLifeEnergy(item.total, settings.hourlyWage).formatted
            : Calculations.formatCurrency(item.total, settings.currency);

          return `
            <div class="legend-item">
              <div class="legend-left">
                <span class="legend-color-dot" style="background-color: ${item.color}"></span>
                <span>${item.name}</span>
              </div>
              <div class="legend-right">
                ${valDisplay} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">(${item.percentage}%)</span>
              </div>
            </div>
          `;
        }).join('');
      }
    },

    /**
     * Refresh all dashboard charts
     */
    updateCharts(transactions, settings) {
      this.renderVelocityChart(transactions, settings);
      this.renderCategoryDonut(transactions, settings);
    }
  };

  global.LedgerCharts = DashboardCharts;
})(window);
