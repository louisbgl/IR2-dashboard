/**
 * EmploymentRenderer - Specialized renderer for employment statistics data
 * Handles INSEE employment data with trends and user-friendly visualizations
 */

export class EmploymentRenderer {
    
    // Employment status colors based on rates
    static colors = {
        employment: {
            excellent: '#27ae60',   // >65% employment rate
            good: '#f39c12',        // 50-65% employment rate
            concerning: '#e74c3c'   // <50% employment rate
        },
        unemployment: {
            low: '#27ae60',         // <8% unemployment
            moderate: '#f39c12',    // 8-12% unemployment
            high: '#e74c3c'         // >12% unemployment
        },
        trend: {
            positive: '#27ae60',
            negative: '#e74c3c',
            stable: '#95a5a6'
        }
    };
    
    /**
     * Render employment data with key metrics and trend analysis
     */
    static render(employmentResponse, options = {}) {
        const statusCheck = this.checkDataStatus(employmentResponse);
        if (statusCheck) return statusCheck;
        
        const { jobSeekersData } = options;
        
        const employmentData = employmentResponse.data;
        
        if (!employmentData || Object.keys(employmentData).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée d'emploi disponible</p></div>`;
        }

        // Get sorted years (most recent first)
        const years = Object.keys(employmentData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a);
            
        if (years.length === 0) {
            return `<div class="no-data-message"><p>Données d'emploi invalides</p></div>`;
        }
        
        const mostRecentYear = years[0];
        const recentData = employmentData[mostRecentYear.toString()];
        
        // Calculate insights and trends
        const insights = this.calculateEmploymentInsights(recentData, mostRecentYear);
        const trends = years.length > 1 ? this.calculateTrends(employmentData, years.slice(0, 2)) : null;
        
        // Extract job seekers total if available
        let jobSeekersTotal = null;
        if (jobSeekersData && jobSeekersData.status === 'success' && jobSeekersData.data) {
            try {
                const jobData = jobSeekersData.data;
                const jobYears = Object.keys(jobData).sort((a, b) => b - a);
                if (jobYears.length > 0) {
                    const latestJobYear = jobYears[0];
                    const yearData = jobData[latestJobYear];
                    if (yearData && yearData.valeurPrincipaleNombre) {
                        const total = parseInt(yearData.valeurPrincipaleNombre);
                        if (!isNaN(total)) {
                            jobSeekersTotal = total;
                        }
                    }
                }
            } catch (error) {
                console.warn('Error extracting job seekers total for employment section:', error);
            }
        }
        
        return `
            <div class="employment-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>Statistiques d'emploi (${mostRecentYear})</h4>
                        ${jobSeekersTotal !== null ? `
                            <div class="total-indicator">
                                <span class="total-label">Demandeurs d'emploi :</span>
                                <span class="total-value">${jobSeekersTotal.toLocaleString('fr-FR')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="employment-visualization">
                    <div class="key-metrics">
                        ${this.renderKeyMetrics(insights, recentData)}
                    </div>
                    
                    <div class="employment-charts">
                        <div class="chart-section">
                            <h5>Répartition active/inactive</h5>
                            ${this.renderEmploymentChart(recentData)}
                        </div>
                        
                        ${trends ? `
                            <div class="trends-section">
                                <h5>Évolution ${trends.fromYear}-${trends.toYear}</h5>
                                ${this.renderTrendsChart(trends)}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${years.length > 1 ? `
                        <div class="employment-table">
                            <h5>Évolution détaillée</h5>
                            ${this.renderEmploymentTable(employmentData, years.slice(0, 3))}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Calculate employment insights and status
     */
    static calculateEmploymentInsights(data, year) {
        const employmentRate = parseFloat(data.taux_emploi) || 0;
        const unemploymentRate = parseFloat(data.taux_chomage) || 0;
        const totalActive = parseInt(data.nombre_actifs) || 0;
        const employed = parseInt(data.nombre_actifs_ayant_emploi) || 0;
        const unemployed = parseInt(data.nombre_chomeurs) || 0;
        
        return {
            year,
            employmentRate,
            unemploymentRate,
            totalActive,
            employed,
            unemployed
        };
    }
    
    /**
     * Calculate employment trends between years
     */
    static calculateTrends(employmentData, years) {
        const [newYear, oldYear] = years;
        const newData = employmentData[newYear.toString()];
        const oldData = employmentData[oldYear.toString()];
        
        if (!newData || !oldData) return null;
        
        const employmentTrend = parseFloat(newData.taux_emploi) - parseFloat(oldData.taux_emploi);
        const unemploymentTrend = parseFloat(newData.taux_chomage) - parseFloat(oldData.taux_chomage);
        const activeTrend = parseInt(newData.nombre_actifs) - parseInt(oldData.nombre_actifs);
        
        return {
            fromYear: oldYear,
            toYear: newYear,
            employmentTrend: employmentTrend.toFixed(1),
            unemploymentTrend: unemploymentTrend.toFixed(1),
            activeTrend,
            employmentDirection: employmentTrend > 0.5 ? 'positive' : employmentTrend < -0.5 ? 'negative' : 'stable',
            unemploymentDirection: unemploymentTrend > 0.5 ? 'negative' : unemploymentTrend < -0.5 ? 'positive' : 'stable'
        };
    }
    
    /**
     * Render key employment metrics cards
     */
    static renderKeyMetrics(insights, data) {
        const employmentColor = insights.employmentRate >= 65 ? this.colors.employment.excellent :
                               insights.employmentRate >= 50 ? this.colors.employment.good :
                               this.colors.employment.concerning;
                               
        const unemploymentColor = insights.unemploymentRate < 8 ? this.colors.unemployment.low :
                                 insights.unemploymentRate < 12 ? this.colors.unemployment.moderate :
                                 this.colors.unemployment.high;
        
        return `
            <div class="metrics-horizontal">
                <div class="metric-row">
                    <div class="metric-item">
                        <span class="metric-label">Taux d'emploi :</span>
                        <span class="metric-value" style="color: ${employmentColor}">
                            ${insights.employmentRate.toFixed(1)}%
                        </span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Taux de chômage :</span>
                        <span class="metric-value" style="color: ${unemploymentColor}">
                            ${insights.unemploymentRate.toFixed(1)}%
                        </span>
                    </div>
                </div>
                
                <div class="metric-row">
                    <div class="metric-item">
                        <span class="metric-label">Population active :</span>
                        <span class="metric-value">
                            ${insights.totalActive.toLocaleString('fr-FR')}
                        </span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Personnes employées :</span>
                        <span class="metric-value">
                            ${insights.employed.toLocaleString('fr-FR')}
                        </span>
                    </div>
                </div>
                
                <div class="metric-row">
                    <div class="metric-item">
                        <span class="metric-label">Demandeurs d'emploi :</span>
                        <span class="metric-value">
                            ${insights.unemployed.toLocaleString('fr-FR')}
                        </span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Population 15-64 ans :</span>
                        <span class="metric-value">
                            ${parseInt(data.population_15_64 || 0).toLocaleString('fr-FR')}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render employment/unemployment chart
     */
    static renderEmploymentChart(data) {
        const employed = parseInt(data.nombre_actifs_ayant_emploi) || 0;
        const unemployed = parseInt(data.nombre_chomeurs) || 0;
        const total = employed + unemployed;
        
        if (total === 0) {
            return `<div class="no-data-message"><p>Données insuffisantes pour le graphique</p></div>`;
        }
        
        const employedPercentage = (employed / total * 100).toFixed(1);
        const unemployedPercentage = (unemployed / total * 100).toFixed(1);
        
        return `
            <div class="employment-chart">
                <div class="chart-bars">
                    <div class="bar-item">
                        <div class="bar-header">
                            <span class="bar-label">👥 Employés</span>
                            <span class="bar-value">${employed.toLocaleString('fr-FR')} (${employedPercentage}%)</span>
                        </div>
                        <div class="bar-container">
                            <div class="bar-fill employed" style="width: ${employedPercentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="bar-item">
                        <div class="bar-header">
                            <span class="bar-label">🔍 Chômeurs</span>
                            <span class="bar-value">${unemployed.toLocaleString('fr-FR')} (${unemployedPercentage}%)</span>
                        </div>
                        <div class="bar-container">
                            <div class="bar-fill unemployed" style="width: ${unemployedPercentage}%"></div>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }
    
    /**
     * Render trends chart
     */
    static renderTrendsChart(trends) {
        return `
            <div class="trends-chart">
                <div class="trend-indicators">
                    <div class="trend-item">
                        <div class="trend-label">Taux d'emploi</div>
                        <div class="trend-value ${trends.employmentDirection}">
                            ${trends.employmentTrend > 0 ? '+' : ''}${trends.employmentTrend} points
                            <span class="trend-arrow">${trends.employmentDirection === 'positive' ? '↗' : trends.employmentDirection === 'negative' ? '↘' : '→'}</span>
                        </div>
                    </div>
                    
                    <div class="trend-item">
                        <div class="trend-label">Taux de chômage</div>
                        <div class="trend-value ${trends.unemploymentDirection}">
                            ${trends.unemploymentTrend > 0 ? '+' : ''}${trends.unemploymentTrend} points
                            <span class="trend-arrow">${trends.unemploymentDirection === 'positive' ? '↗' : trends.unemploymentDirection === 'negative' ? '↘' : '→'}</span>
                        </div>
                    </div>
                    
                    <div class="trend-item">
                        <div class="trend-label">Population active</div>
                        <div class="trend-value ${trends.activeTrend >= 0 ? 'positive' : 'negative'}">
                            ${trends.activeTrend >= 0 ? '+' : ''}${trends.activeTrend.toLocaleString('fr-FR')}
                            <span class="trend-arrow">${trends.activeTrend >= 0 ? '↗' : '↘'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render detailed employment table
     */
    static renderEmploymentTable(employmentData, years) {
        return `
            <div class="table-responsive">
                <table class="data-table employment-table">
                    <thead>
                        <tr>
                            <th>Année</th>
                            <th>Population 15-64</th>
                            <th>Actifs</th>
                            <th>Employés</th>
                            <th>Chômeurs</th>
                            <th>Taux d'emploi</th>
                            <th>Taux de chômage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(year => {
                            const data = employmentData[year.toString()];
                            if (!data) return '';
                            
                            return `
                                <tr>
                                    <td><strong>${year}</strong></td>
                                    <td>${parseInt(data.population_15_64 || 0).toLocaleString('fr-FR')}</td>
                                    <td>${parseInt(data.nombre_actifs || 0).toLocaleString('fr-FR')}</td>
                                    <td>${parseInt(data.nombre_actifs_ayant_emploi || 0).toLocaleString('fr-FR')}</td>
                                    <td>${parseInt(data.nombre_chomeurs || 0).toLocaleString('fr-FR')}</td>
                                    <td class="rate-cell">${parseFloat(data.taux_emploi || 0).toFixed(1)}%</td>
                                    <td class="rate-cell">${parseFloat(data.taux_chomage || 0).toFixed(1)}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
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