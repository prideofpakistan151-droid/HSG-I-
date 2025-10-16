// Budget Management

class BudgetManager {
    constructor() {
        this.budgetChart = null;
        this.categoryBudgets = {};
        this.init();
    }

    init() {
        this.loadBudgetData();
        this.initializeChart();
        this.updateBudgetDisplay();
        this.loadCategoryBudgets();
        this.generateAlerts();
        this.generateTips();
    }

    loadBudgetData() {
        this.monthlyBudget = getMonthlyBudget();
        this.currentSpending = this.calculateCurrentSpending();
    }

    calculateCurrentSpending() {
        const bills = getBills();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        return bills
            .filter(bill => {
                const billDate = new Date(bill.date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            })
            .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    }

    calculateDailyAverage() {
        const today = new Date();
        const daysPassed = today.getDate();
        return this.currentSpending / daysPassed;
    }

    calculateRemainingDays() {
        const today = new Date();
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        return lastDay - today.getDate();
    }

    updateBudgetDisplay() {
        // Update main budget display
        document.getElementById('totalBudget').textContent = `₹${this.monthlyBudget.toFixed(2)}`;
        document.getElementById('spentAmount').textContent = `₹${this.currentSpending.toFixed(2)}`;
        
        const remaining = this.monthlyBudget - this.currentSpending;
        document.getElementById('remainingAmount').textContent = `₹${Math.max(0, remaining).toFixed(2)}`;
        
        // Update progress
        const progressPercentage = this.monthlyBudget > 0 ? 
            Math.min((this.currentSpending / this.monthlyBudget) * 100, 100) : 0;
        
        const progressFill = document.getElementById('budgetProgressFill');
        progressFill.style.width = `${progressPercentage}%`;
        
        // Update progress color and text
        if (progressPercentage < 70) {
            progressFill.className = 'progress-fill under-budget';
            document.getElementById('budgetProgressText').textContent = `${progressPercentage.toFixed(1)}% used`;
        } else if (progressPercentage < 90) {
            progressFill.className = 'progress-fill near-budget';
            document.getElementById('budgetProgressText').textContent = `${progressPercentage.toFixed(1)}% used - Getting close!`;
        } else {
            progressFill.className = 'progress-fill over-budget';
            document.getElementById('budgetProgressText').textContent = `${progressPercentage.toFixed(1)}% used - Over budget!`;
        }
        
        // Update daily average and remaining days
        document.getElementById('dailyAverage').textContent = `₹${this.calculateDailyAverage().toFixed(2)}/day`;
        document.getElementById('remainingDays').textContent = `${this.calculateRemainingDays()} days left`;
        
        // Update budget input
        document.getElementById('monthlyBudget').value = this.monthlyBudget;
    }

    initializeChart() {
        const ctx = document.getElementById('budgetChart').getContext('2d');
        
        this.budgetChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Spent', 'Remaining'],
                datasets: [{
                    data: [this.currentSpending, Math.max(0, this.monthlyBudget - this.currentSpending)],
                    backgroundColor: [
                        '#EF4444',
                        '#10B981'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `₹${context.parsed.toFixed(2)}`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    loadCategoryBudgets() {
        this.categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets') || '{}');
        this.renderCategoryBudgets();
    }

    renderCategoryBudgets() {
        const container = document.getElementById('categoryBudgets');
        const categories = this.getCategorySpending();
        
        if (Object.keys(this.categoryBudgets).length === 0) {
            container.innerHTML = `
                <div class="empty-budget">
                    <div class="empty-icon">🏷️</div>
                    <h4>No Category Budgets</h4>
                    <p>Set budgets for specific categories to track spending in detail</p>
                    <button class="btn-primary" onclick="showCategoryBudgetModal()">
                        ➕ Add Category Budget
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = Object.entries(this.categoryBudgets).map(([category, budget]) => {
            const spent = categories[category] || 0;
            const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const icon = getCategoryIcon(category);
            const color = getCategoryColor(category);
            
            return `
                <div class="category-budget-item">
                    <div class="category-budget-icon" style="background: ${this.getLighterColor(color)}">
                        ${icon}
                    </div>
                    <div class="category-budget-info">
                        <div class="category-budget-header">
                            <div class="category-budget-name">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                            <div class="category-budget-amount">₹${spent.toFixed(2)} / ₹${budget.toFixed(2)}</div>
                        </div>
                        <div class="category-budget-progress">
                            <div class="category-progress-bar">
                                <div class="category-progress-fill" style="width: ${percentage}%; background: ${color};"></div>
                            </div>
                            <div class="category-progress-text">
                                <span>${percentage.toFixed(1)}% used</span>
                                <span>₹${Math.max(0, budget - spent).toFixed(2)} left</span>
                            </div>
                        </div>
                    </div>
                    <div class="category-budget-actions">
                        <button class="action-btn" onclick="editCategoryBudget('${category}')" title="Edit">
                            ✏️
                        </button>
                        <button class="action-btn" onclick="deleteCategoryBudget('${category}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCategorySpending() {
        const bills = getBills();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const categorySpending = {};
        
        bills
            .filter(bill => {
                const billDate = new Date(bill.date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            })
            .forEach(bill => {
                const category = bill.category || 'other';
                categorySpending[category] = (categorySpending[category] || 0) + (bill.totalAmount || 0);
            });
        
        return categorySpending;
    }

    getLighterColor(hex, percent = 80) {
        // Simple function to lighten a color
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`;
    }

    generateAlerts() {
        const alerts = [];
        const container = document.getElementById('alertsList');
        
        // Budget alert
        if (this.monthlyBudget > 0) {
            const progressPercentage = (this.currentSpending / this.monthlyBudget) * 100;
            
            if (progressPercentage > 90) {
                alerts.push({
                    type: 'danger',
                    icon: '🚨',
                    title: 'Budget Exceeded!',
                    description: `You've spent ${progressPercentage.toFixed(1)}% of your monthly budget.`,
                    meta: 'Consider reducing expenses'
                });
            } else if (progressPercentage > 70) {
                alerts.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Approaching Budget Limit',
                    description: `You've used ${progressPercentage.toFixed(1)}% of your budget.`,
                    meta: `${this.calculateRemainingDays()} days left in month`
                });
            }
        }
        
        // Daily spending alert
        const dailyAverage = this.calculateDailyAverage();
        const projectedMonthly = dailyAverage * 30;
        
        if (this.monthlyBudget > 0 && projectedMonthly > this.monthlyBudget * 1.1) {
            alerts.push({
                type: 'warning',
                icon: '📈',
                title: 'High Spending Rate',
                description: `At current rate, you'll exceed budget by ₹${(projectedMonthly - this.monthlyBudget).toFixed(2)}.`,
                meta: `Current daily average: ₹${dailyAverage.toFixed(2)}`
            });
        }
        
        // Category budget alerts
        const categorySpending = this.getCategorySpending();
        Object.entries(this.categoryBudgets).forEach(([category, budget]) => {
            const spent = categorySpending[category] || 0;
            const percentage = (spent / budget) * 100;
            
            if (percentage > 90) {
                alerts.push({
                    type: 'warning',
                    icon: '🏷️',
                    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Budget Alert`,
                    description: `You've used ${percentage.toFixed(1)}% of your ${category} budget.`,
                    meta: `₹${spent.toFixed(2)} / ₹${budget.toFixed(2)}`
                });
            }
        });
        
        // No alerts message
        if (alerts.length === 0) {
            alerts.push({
                type: 'info',
                icon: '✅',
                title: 'All Good!',
                description: 'Your spending is within budget limits.',
                meta: 'Keep up the good work!'
            });
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-description">${alert.description}</div>
                    <div class="alert-meta">${alert.meta}</div>
                </div>
            </div>
        `).join('');
    }

    generateTips() {
        const tips = [
            {
                icon: '📅',
                title: 'Track Daily',
                description: 'Record expenses daily to stay on top of your budget.'
            },
            {
                icon: '🎯',
                title: 'Set Realistic Goals',
                description: 'Start with achievable budgets and adjust as needed.'
            },
            {
                icon: '📊',
                title: 'Review Weekly',
                description: 'Check your spending progress every week.'
            },
            {
                icon: '💡',
                title: 'Identify Patterns',
                description: 'Notice spending patterns to make better budget decisions.'
            }
        ];
        
        const container = document.getElementById('tipsList');
        container.innerHTML = tips.map(tip => `
            <div class="tip-item">
                <div class="tip-icon">${tip.icon}</div>
                <div class="tip-content">
                    <div class="tip-title">${tip.title}</div>
                    <div class="tip-description">${tip.description}</div>
                </div>
            </div>
        `).join('');
    }

    saveBudget() {
        const budgetInput = document.getElementById('monthlyBudget');
        const budgetAmount = parseFloat(budgetInput.value) || 0;
        
        if (budgetAmount <= 0) {
            showNotification('Please enter a valid budget amount', 'error');
            return;
        }
        
        setMonthlyBudget(budgetAmount);
        this.monthlyBudget = budgetAmount;
        this.updateBudgetDisplay();
        this.updateChart();
        this.generateAlerts();
        
        showNotification('Monthly budget saved successfully', 'success');
    }

    updateChart() {
        if (this.budgetChart) {
            this.budgetChart.data.datasets[0].data = [
                this.currentSpending,
                Math.max(0, this.monthlyBudget - this.currentSpending)
            ];
            this.budgetChart.update();
        }
    }

    showCategoryBudgetModal(category = null) {
        const modal = document.getElementById('categoryBudgetModal');
        const categorySelect = document.getElementById('budgetCategory');
        const amountInput = document.getElementById('categoryBudgetAmount');
        
        if (category) {
            // Editing existing budget
            categorySelect.value = category;
            amountInput.value = this.categoryBudgets[category];
            categorySelect.disabled = true;
        } else {
            // Adding new budget
            categorySelect.value = 'food';
            amountInput.value = '';
            categorySelect.disabled = false;
        }
        
        this.editingCategory = category;
        modal.style.display = 'flex';
    }

    closeCategoryBudgetModal() {
        document.getElementById('categoryBudgetModal').style.display = 'none';
        this.editingCategory = null;
    }

    saveCategoryBudget() {
        const category = document.getElementById('budgetCategory').value;
        const amount = parseFloat(document.getElementById('categoryBudgetAmount').value) || 0;
        
        if (amount <= 0) {
            showNotification('Please enter a valid budget amount', 'error');
            return;
        }
        
        if (this.editingCategory) {
            // Update existing budget
            delete this.categoryBudgets[this.editingCategory];
        }
        
        this.categoryBudgets[category] = amount;
        localStorage.setItem('categoryBudgets', JSON.stringify(this.categoryBudgets));
        
        this.renderCategoryBudgets();
        this.generateAlerts();
        this.closeCategoryBudgetModal();
        
        showNotification('Category budget saved successfully', 'success');
    }

    editCategoryBudget(category) {
        this.showCategoryBudgetModal(category);
    }

    deleteCategoryBudget(category) {
        if (confirm(`Are you sure you want to delete the budget for ${category}?`)) {
            delete this.categoryBudgets[category];
            localStorage.setItem('categoryBudgets', JSON.stringify(this.categoryBudgets));
            
            this.renderCategoryBudgets();
            this.generateAlerts();
            
            showNotification('Category budget deleted', 'success');
        }
    }

    toggleChartView() {
        if (!this.budgetChart) return;
        
        const currentType = this.budgetChart.config.type;
        const newType = currentType === 'doughnut' ? 'pie' : 
                       currentType === 'pie' ? 'bar' : 'doughnut';
        
        this.budgetChart.config.type = newType;
        this.budgetChart.update();
    }

    refreshBudget() {
        this.loadBudgetData();
        this.updateBudgetDisplay();
        this.updateChart();
        this.generateAlerts();
        showNotification('Budget data refreshed', 'success');
    }
}

// Global budget instance
let budgetManager;

// Initialize budget when page loads
document.addEventListener('DOMContentLoaded', function() {
    budgetManager = new BudgetManager();
});

// Global functions for HTML event handlers
function saveBudget() {
    budgetManager.saveBudget();
}

function showCategoryBudgetModal() {
    budgetManager.showCategoryBudgetModal();
}

function closeCategoryBudgetModal() {
    budgetManager.closeCategoryBudgetModal();
}

function saveCategoryBudget() {
    budgetManager.saveCategoryBudget();
}

function editCategoryBudget(category) {
    budgetManager.editCategoryBudget(category);
}

function deleteCategoryBudget(category) {
    budgetManager.deleteCategoryBudget(category);
}

function toggleChartView() {
    budgetManager.toggleChartView();
}

function toggleAlerts() {
    // This could be enhanced to actually enable/disable notifications
    showNotification('Alerts toggled', 'info');
}
