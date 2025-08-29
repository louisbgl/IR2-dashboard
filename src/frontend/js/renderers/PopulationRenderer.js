/**
 * PopulationRenderer - Specialized renderer for population age groups data
 * Handles the standardized backend format: {status: "success", data: {...}}
 */

export class PopulationRenderer {
    
    // Age group labels mapping - centralized definition
    static ageGroupLabels = {
        'Y_LT15': 'Moins de 15 ans',
        'Y15T24': '15-24 ans', 
        'Y25T39': '25-39 ans',
        'Y40T54': '40-54 ans',
        'Y55T64': '55-64 ans',
        'Y65T79': '65-79 ans',
        'Y_GE80': '80 ans et plus',
        '_T': 'Population totale'
    };
    
    // Colors for different age groups in charts
    static ageGroupColors = {
        'Y_LT15': '#3498db',    // Blue
        'Y15T24': '#9b59b6',    // Purple  
        'Y25T39': '#e74c3c',    // Red
        'Y40T54': '#f39c12',    // Orange
        'Y55T64': '#27ae60',    // Green
        'Y65T79': '#34495e',    // Dark gray
        'Y_GE80': '#95a5a6'     // Light gray
    };
    
    /**
     * Render population data with two-panel layout (table + chart)
     * @param {Object} populationResponse - Standardized API response
     * @returns {string} HTML content for the population subsection
     */
    static render(populationResponse) {
        // Handle error states first
        const statusCheck = this.checkDataStatus(populationResponse);
        if (statusCheck) return statusCheck;
        
        // Extract the actual population data
        const populationData = populationResponse.data;
        
        if (!populationData || Object.keys(populationData).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée de population disponible</p></div>`;
        }

        // Sort years numerically (ascending: oldest to newest)
        const years = Object.keys(populationData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => a - b);
        
        // Define age group mapping and order
        const ageGroupOrder = ['Y_LT15', 'Y15T24', 'Y25T39', 'Y40T54', 'Y55T64', 'Y65T79', 'Y_GE80', '_T'];
        const ageGroups = ageGroupOrder.filter(age => 
            years.some(year => populationData[year] && populationData[year][age] !== undefined)
        );
        

        // Calculate insights for latest year (get most recent year mathematically)
        const mostRecentYear = Math.max(...years);
        const insights = this.calculateInsights(populationData, [mostRecentYear], ageGroups);
        
        return `
            <div class="population-data-container">
                ${insights.showInsights ? this.renderInsightsPanel(insights) : ''}
                
                <div class="data-panels">
                    <div class="data-panel table-panel">
                        <div class="panel-header">
                            <h4>Évolution par tranches d'âge</h4>
                        </div>
                        ${this.renderPopulationTable(populationData, [...years].reverse(), ageGroups)}
                    </div>
                    
                    <div class="data-panel chart-panel">
                        <div class="panel-header">
                            <h4>Évolution temporelle</h4>
                        </div>
                        ${this.renderAgeEvolutionChart(populationData, years, ageGroups)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Check for error statuses and return appropriate error message
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
    
    /**
     * Calculate demographic insights from the population data
     */
    static calculateInsights(populationData, years, ageGroups) {
        const insights = {
            showInsights: false,
            latestYear: null,
            totalPopulation: null,
            largestGroup: null,
            growthTrend: null,
            ageDistribution: {}
        };
        
        if (years.length === 0) return insights;
        
        const latestYear = years[0];
        const latestData = populationData[latestYear.toString()];
        
        if (!latestData || !latestData._T) return insights;
        
        insights.showInsights = true;
        insights.latestYear = latestYear;
        insights.totalPopulation = parseInt(latestData._T);
        
        // Calculate age distribution percentages for latest year
        const nonTotalGroups = ageGroups.filter(age => age !== '_T');
        nonTotalGroups.forEach(age => {
            if (latestData[age]) {
                const value = parseInt(latestData[age]);
                if (!isNaN(value) && insights.totalPopulation > 0) {
                    insights.ageDistribution[age] = {
                        count: value,
                        percentage: ((value / insights.totalPopulation) * 100).toFixed(1)
                    };
                }
            }
        });
        
        // Find largest age group
        let maxCount = 0;
        nonTotalGroups.forEach(age => {
            const dist = insights.ageDistribution[age];
            if (dist && dist.count > maxCount) {
                maxCount = dist.count;
                insights.largestGroup = age;
            }
        });
        
        // Calculate growth trend if multiple years available (need to check all available years)
        const allAvailableYears = Object.keys(populationData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => a - b);
            
        if (allAvailableYears.length >= 2) {
            const oldestYear = Math.min(...allAvailableYears);
            const newestYear = Math.max(...allAvailableYears);
            const oldestData = populationData[oldestYear.toString()];
            
            if (oldestData && oldestData._T) {
                const oldTotal = parseInt(oldestData._T);
                const newTotal = insights.totalPopulation;
                
                if (!isNaN(oldTotal) && oldTotal > 0) {
                    const growthPercentage = (((newTotal - oldTotal) / oldTotal) * 100).toFixed(1);
                    insights.growthTrend = {
                        from: oldestYear,
                        to: newestYear,
                        percentage: parseFloat(growthPercentage),
                        isGrowth: parseFloat(growthPercentage) > 0
                    };
                }
            }
        }
        
        return insights;
    }
    
    /**
     * Render insights panel with key demographics
     */
    static renderInsightsPanel(insights) {
        const largestGroupLabel = insights.largestGroup ? this.ageGroupLabels[insights.largestGroup] : null;
        const largestGroupData = insights.ageDistribution[insights.largestGroup];
        
        return `
            <div class="population-insights">
                <h4>Aperçu démographique (${insights.latestYear})</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Population totale</span>
                        <span class="insight-value">${insights.totalPopulation.toLocaleString('fr-FR')}</span>
                    </div>
                    ${largestGroupLabel && largestGroupData ? `
                        <div class="insight-item">
                            <span class="insight-label">Tranche d'âge principale</span>
                            <span class="insight-value">${largestGroupLabel} (${largestGroupData.percentage}%)</span>
                        </div>
                    ` : ''}
                    ${insights.growthTrend ? `
                        <div class="insight-item">
                            <span class="insight-label">Évolution ${insights.growthTrend.from}-${insights.growthTrend.to}</span>
                            <span class="insight-value ${insights.growthTrend.isGrowth ? 'growth-positive' : 'growth-negative'}">
                                ${insights.growthTrend.isGrowth ? '+' : ''}${insights.growthTrend.percentage}%
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render the population data table
     */
    static renderPopulationTable(populationData, years, ageGroups) {
        const formatNumber = (value) => {
            const num = parseInt(value);
            return !isNaN(num) ? num.toLocaleString('fr-FR') : '—';
        };

        return `
            <div class="table-responsive">
                <table class="data-table population-table">
                    <thead>
                        <tr>
                            <th class="sticky-left">Année</th>
                            ${ageGroups.map(age => `<th class="${age === '_T' ? 'total-column' : ''}">${this.ageGroupLabels[age] || age}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(year => `
                            <tr>
                                <td class="sticky-left year-cell"><strong>${year}</strong></td>
                                ${ageGroups.map(age => {
                                    const value = populationData[year] ? populationData[year][age] : undefined;
                                    const cssClass = age === '_T' ? 'total-cell' : 'number-cell';
                                    return `<td class="${cssClass}">${formatNumber(value)}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Render interactive line chart showing age group evolution over years
     */
    static renderAgeEvolutionChart(populationData, years, ageGroups) {
        // Exclude total from chart (too large compared to age groups)
        const chartAgeGroups = ageGroups.filter(age => age !== '_T');
        
        
        // Calculate chart dimensions and scaling
        const chartWidth = 400;
        const chartHeight = 200;
        const padding = { top: 30, right: 20, bottom: 40, left: 60 };
        const plotWidth = chartWidth - padding.left - padding.right;
        const plotHeight = chartHeight - padding.top - padding.bottom;
        
        // Find min/max values for scaling
        let maxValue = 0;
        let minValue = Infinity;
        
        chartAgeGroups.forEach(age => {
            years.forEach(year => {
                if (populationData[year.toString()] && populationData[year.toString()][age]) {
                    const value = parseInt(populationData[year.toString()][age]);
                    if (!isNaN(value)) {
                        maxValue = Math.max(maxValue, value);
                        minValue = Math.min(minValue, value);
                    }
                }
            });
        });
        
        // Add 10% padding on both sides for better scaling
        const range = maxValue - minValue;
        const padding_percent = 0.1;
        maxValue = Math.ceil(maxValue + (range * padding_percent));
        minValue = Math.max(0, Math.floor(minValue - (range * padding_percent)));
        
        // Generate SVG lines for each age group
        const lines = chartAgeGroups.map(age => {
            const points = years.map((year, index) => {
                const value = populationData[year.toString()] && populationData[year.toString()][age] 
                    ? parseInt(populationData[year.toString()][age]) 
                    : null;
                
                if (value === null) return null;
                
                const x = padding.left + (index / (years.length - 1)) * plotWidth;
                const y = padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
                
                return { x, y, value };
            }).filter(p => p !== null);
            
            if (points.length === 0) return '';
            
            const pathData = points.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`
            ).join(' ');
            
            const color = this.ageGroupColors[age] || '#219fac';
            
            return `
                <g class="line-group" data-age="${age}">
                    <path d="${pathData}" 
                          stroke="${color}" 
                          stroke-width="2.5" 
                          fill="none" 
                          class="age-line"/>
                    ${points.map(point => `
                        <circle cx="${point.x}" 
                                cy="${point.y}" 
                                r="4" 
                                fill="${color}" 
                                class="data-point"
                                data-value="${point.value}"/>
                    `).join('')}
                </g>
            `;
        }).join('');
        
        // Generate X-axis labels
        const xLabels = years.map((year, index) => {
            const x = padding.left + (index / (years.length - 1)) * plotWidth;
            const y = chartHeight - padding.bottom + 20;
            return `<text x="${x}" y="${y}" text-anchor="middle" class="axis-label">${year}</text>`;
        }).join('');
        
        // Generate Y-axis labels with better interpolation
        const yLabelCount = 6;
        const yLabels = Array.from({ length: yLabelCount }, (_, i) => {
            const value = minValue + (i / (yLabelCount - 1)) * (maxValue - minValue);
            const y = padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
            const x = padding.left - 10;
            return `<text x="${x}" y="${y + 4}" text-anchor="end" class="axis-label">${Math.round(value).toLocaleString('fr-FR')}</text>`;
        }).join('');
        
        return `
            <div class="age-evolution-chart">
                <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="population-chart-svg">
                    <!-- Grid lines -->
                    <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
                        </pattern>
                    </defs>
                    <rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="url(#grid)"/>
                    
                    <!-- Axes -->
                    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" stroke="#ddd" stroke-width="1"/>
                    <line x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" stroke="#ddd" stroke-width="1"/>
                    
                    <!-- Data lines -->
                    ${lines}
                    
                    <!-- Axis labels -->
                    ${xLabels}
                    ${yLabels}
                    
                    <!-- Chart title -->
                    <text x="${chartWidth / 2}" y="15" text-anchor="middle" class="chart-title">Évolution démographique</text>
                </svg>
                
                <div class="chart-legend">
                    ${chartAgeGroups.map(age => {
                        const color = this.ageGroupColors[age] || '#219fac';
                        return `
                            <div class="legend-item" data-age="${age}">
                                <div class="legend-color" style="background-color: ${color}"></div>
                                <span class="legend-label">${this.ageGroupLabels[age]}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="chart-tooltip" id="population-tooltip" style="display: none;">
                    <div class="tooltip-content"></div>
                </div>
            </div>
        `;
    }
}