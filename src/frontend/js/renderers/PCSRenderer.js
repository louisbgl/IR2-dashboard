/**
 * PCSRenderer - Specialized renderer for socio-professional categories data
 * Displays professional categories as an interactive donut chart with detailed breakdown
 */

export class PCSRenderer {
    
    // PCS category labels mapping
    static pcsLabels = {
        '1': 'Agriculteurs exploitants',
        '2': 'Artisans, commerçants, chefs d\'entreprise',
        '3': 'Cadres et professions intellectuelles supérieures',
        '4': 'Professions intermédiaires',
        '5': 'Employés',
        '6': 'Ouvriers',
        '7': 'Retraités',
        '8': 'Autres personnes sans activité professionnelle',
        '_T': 'Total'
    };
    
    // Colors for PCS categories
    static pcsColors = {
        '1': '#27ae60',    // Green - Agriculture
        '2': '#f39c12',    // Orange - Artisans/Commerce
        '3': '#9b59b6',    // Purple - Cadres
        '4': '#3498db',    // Blue - Professions intermédiaires  
        '5': '#e74c3c',    // Red - Employés
        '6': '#34495e',    // Dark gray - Ouvriers
        '7': '#95a5a6',    // Light gray - Retraités
        '8': '#e67e22'     // Dark orange - Autres
    };
    
    /**
     * Render PCS data with donut chart visualization
     */
    static render(pcsResponse) {
        const statusCheck = this.checkDataStatus(pcsResponse);
        if (statusCheck) return statusCheck;
        
        const pcsData = pcsResponse.data;
        
        if (!pcsData || Object.keys(pcsData).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée PCS disponible</p></div>`;
        }

        // Get most recent year
        const years = Object.keys(pcsData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a); // Most recent first
            
        const mostRecentYear = years[0];
        const yearData = pcsData[mostRecentYear.toString()];
        
        if (!yearData || !yearData.Y_GE15) {
            return `<div class="no-data-message"><p>Données PCS incomplètes</p></div>`;
        }
        
        const categoryData = yearData.Y_GE15;
        const total = parseInt(categoryData._T) || 0;
        
        if (total === 0) {
            return `<div class="no-data-message"><p>Aucune donnée PCS pour ${mostRecentYear}</p></div>`;
        }

        // Calculate percentages and prepare chart data
        const chartData = [];
        Object.keys(this.pcsLabels).forEach(code => {
            if (code !== '_T' && categoryData[code]) {
                const value = parseInt(categoryData[code]) || 0;
                const percentage = ((value / total) * 100).toFixed(1);
                
                chartData.push({
                    code,
                    label: this.pcsLabels[code],
                    value,
                    percentage: parseFloat(percentage),
                    color: this.pcsColors[code]
                });
            }
        });
        
        // Sort by value (descending)
        chartData.sort((a, b) => b.value - a.value);
        
        // Calculate trends if multiple years available
        const allYears = Object.keys(pcsData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => a - b); // Ascending for trends
            
        const trendsData = allYears.length > 1 ? this.calculateTrends(pcsData, allYears, chartData) : null;
        
        return `
            <div class="pcs-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>Répartition socio-professionnelle (${mostRecentYear})</h4>
                        <div class="total-indicator">
                            <span class="total-label">Population active 15 ans+ :</span>
                            <span class="total-value">${total.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="pcs-visualization">
                    <div class="pcs-left-column">
                        <div class="chart-section">
                            <h5>Répartition des catégories</h5>
                            <div class="chart-container">
                                ${this.renderDonutChart(chartData, total)}
                            </div>
                        </div>
                        
                        ${trendsData ? `
                            <div class="trends-section">
                                <h5>Tendances ${trendsData.fromYear}-${trendsData.toYear}</h5>
                                ${this.renderCompactTrends(trendsData.trends)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="categories-list">
                        <h5>Détail par catégorie</h5>
                        ${this.renderCategoriesList(chartData)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render interactive donut chart using SVG
     */
    static renderDonutChart(chartData, total) {
        const size = 280;
        const strokeWidth = 40;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        
        let currentAngle = 0;
        const segments = chartData.map(item => {
            const angle = (item.percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            // Calculate arc path
            const x1 = size/2 + radius * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = size/2 + radius * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = size/2 + radius * Math.cos((startAngle + angle - 90) * Math.PI / 180);
            const y2 = size/2 + radius * Math.sin((startAngle + angle - 90) * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            return `
                <path d="M ${size/2},${size/2} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z"
                      fill="${item.color}" 
                      class="chart-segment" 
                      data-category="${item.code}"
                      data-label="${item.label}"
                      data-value="${item.value}"
                      data-percentage="${item.percentage}">
                    <title>${item.label}: ${item.value.toLocaleString('fr-FR')} (${item.percentage}%)</title>
                </path>
            `;
        }).join('');
        
        return `
            <div class="donut-chart">
                <svg viewBox="0 0 ${size} ${size}" class="pcs-chart-svg">
                    ${segments}
                    
                    <!-- Center circle -->
                    <circle cx="${size/2}" cy="${size/2}" r="${radius - strokeWidth/2}" 
                            fill="white" stroke="#f8f9fa" stroke-width="2"/>
                    
                    <!-- Center text -->
                    <text x="${size/2}" y="${size/2 - 10}" text-anchor="middle" 
                          class="chart-center-label">Population</text>
                    <text x="${size/2}" y="${size/2 + 10}" text-anchor="middle" 
                          class="chart-center-value">${total.toLocaleString('fr-FR')}</text>
                </svg>
                
                <div class="chart-tooltip" id="pcs-tooltip" style="display: none;">
                    <div class="tooltip-content"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render categories list with bars
     */
    static renderCategoriesList(chartData) {
        return `
            <div class="categories-grid">
                ${chartData.map(item => `
                    <div class="category-item" data-category="${item.code}">
                        <div class="category-header">
                            <div class="category-color" style="background-color: ${item.color}"></div>
                            <div class="category-info">
                                <div class="category-label">${item.label}</div>
                                <div class="category-stats">
                                    <span class="category-value">${item.value.toLocaleString('fr-FR')}</span>
                                    <span class="category-percentage">${item.percentage}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="category-bar">
                            <div class="bar-fill" style="width: ${item.percentage}%; background-color: ${item.color}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Calculate trends between first and last year
     */
    static calculateTrends(pcsData, years, chartData) {
        if (years.length < 2) return null;
        
        const oldestYear = years[0];
        const newestYear = years[years.length - 1];
        
        const oldData = pcsData[oldestYear.toString()];
        const newData = pcsData[newestYear.toString()];
        
        if (!oldData?.Y_GE15 || !newData?.Y_GE15) return null;
        
        const oldTotal = parseInt(oldData.Y_GE15._T) || 1;
        const newTotal = parseInt(newData.Y_GE15._T) || 1;
        
        const trends = [];
        
        chartData.forEach(item => {
            const oldValue = parseInt(oldData.Y_GE15[item.code]) || 0;
            const newValue = parseInt(newData.Y_GE15[item.code]) || 0;
            
            const oldPercentage = (oldValue / oldTotal) * 100;
            const newPercentage = (newValue / newTotal) * 100;
            const change = newPercentage - oldPercentage;
            
            if (Math.abs(change) >= 0.5) { // Only show significant changes
                trends.push({
                    code: item.code,
                    label: item.label,
                    change: change.toFixed(1),
                    isIncrease: change > 0,
                    color: item.color
                });
            }
        });
        
        // Sort by absolute change magnitude
        trends.sort((a, b) => Math.abs(parseFloat(b.change)) - Math.abs(parseFloat(a.change)));
        
        return {
            fromYear: oldestYear,
            toYear: newestYear,
            trends: trends // Show all changes
        };
    }
    
    /**
     * Render compact trends under the chart
     */
    static renderCompactTrends(trends) {
        return `
            <div class="trends-list">
                ${trends.map(trend => `
                    <div class="trend-item">
                        <div class="trend-indicator" style="background-color: ${trend.color}"></div>
                        <div class="trend-info">
                            <span class="trend-category">${trend.label}</span>
                            <span class="trend-change ${trend.isIncrease ? 'positive' : 'negative'}">
                                ${trend.isIncrease ? '+' : ''}${trend.change}%
                                ${trend.isIncrease ? '↗' : '↘'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Check for error statuses
     */
    static checkDataStatus(response) {
        if (!response) {
            return `<div class="no-data-message service-status centered-message"><p>Aucune réponse du service</p></div>`;
        }
        
        if (response.status && response.status !== 'success') {
            if (response.status === 'not_available') {
                return `<div class="no-data-message centered-message"><p>${response.message}</p></div>`;
            } else {
                return `<div class="no-data-message service-status centered-message"><p>${response.message}</p></div>`;
            }
        }
        
        return null;
    }
}