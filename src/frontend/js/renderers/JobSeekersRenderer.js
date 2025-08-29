/**
 * JobSeekersRenderer - Specialized renderer for job seekers (demandeurs d'emploi) data
 * Handles France Travail API data with demographic breakdowns and trend analysis
 */

export class JobSeekersRenderer {
    
    // Category type mappings for data organization
    static categoryTypes = {
        'AGE': 'Âge',
        'NIVFORM': 'Niveau de formation',
        'CHOMANC': 'Ancienneté du chômage', 
        'NIVQUAL': 'Niveau de qualification',
        'NIVEXP': 'Expérience professionnelle',
        'GENRExAGE': 'Genre et âge'
    };
    
    // Colors for different categories
    static colors = {
        age: {
            'Y15T24': '#3498db',    // Young: Blue
            'Y25T34': '#e74c3c',    // Prime: Red  
            'Y35T49': '#f39c12',    // Experienced: Orange
            'Y50T64': '#9b59b6'     // Senior: Purple
        },
        duration: {
            short: '#27ae60',       // <6 months: Green (positive)
            medium: '#f39c12',      // 6m-2y: Orange
            long: '#e74c3c'         // 2y+: Red (concerning)
        },
        qualification: {
            'CADRE': '#9b59b6',     // Purple
            'TECH': '#3498db',      // Blue  
            'EQ': '#27ae60',        // Green
            'ENQ': '#f39c12',       // Orange
            'OQ': '#e67e22',        // Dark orange
            'ONQ': '#e74c3c'        // Red
        }
    };
    
    /**
     * Render job seekers data with demographic breakdowns and insights
     */
    static render(jobSeekersResponse) {
        const statusCheck = this.checkDataStatus(jobSeekersResponse);
        if (statusCheck) return statusCheck;
        
        const jobSeekersData = jobSeekersResponse.data;
        
        if (!jobSeekersData || Object.keys(jobSeekersData).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée de demandeurs d'emploi disponible</p></div>`;
        }

        // Get sorted years (most recent first)
        const years = Object.keys(jobSeekersData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a);
            
        if (years.length === 0) {
            return `<div class="no-data-message"><p>Données de demandeurs d'emploi invalides</p></div>`;
        }
        
        const mostRecentYear = years[0];
        const recentData = jobSeekersData[mostRecentYear.toString()];
        const totalJobSeekers = recentData.valeurPrincipaleNombre || 0;
        
        if (totalJobSeekers === 0) {
            return `<div class="no-data-message"><p>Aucun demandeur d'emploi recensé pour ${mostRecentYear}</p></div>`;
        }
        
        // Process and categorize data
        const categorizedData = this.categorizeJobSeekersData(recentData.filtered_caracts || []);
        const trends = years.length > 1 ? this.calculateTrends(jobSeekersData, years.slice(0, 2)) : null;
        
        return `
            <div class="job-seekers-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>🔍 Demandeurs d'emploi (${mostRecentYear})</h4>
                        <div class="total-indicator">
                            <span class="total-value">${totalJobSeekers.toLocaleString('fr-FR')}</span>
                            <span class="total-label">demandeurs d'emploi</span>
                            ${trends ? `
                                <span class="trend-indicator ${trends.direction}">
                                    ${trends.change > 0 ? '+' : ''}${trends.change.toLocaleString('fr-FR')}
                                    (${trends.percentageChange > 0 ? '+' : ''}${trends.percentageChange.toFixed(1)}%)
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="job-seekers-visualization">
                    ${this.renderKeyInsights(categorizedData, totalJobSeekers)}
                    
                    <div class="demographics-charts">
                        <div class="chart-section">
                            <h5>👥 Répartition par âge</h5>
                            ${this.renderAgeBreakdown(categorizedData.AGE, totalJobSeekers)}
                        </div>
                        
                        <div class="chart-section">
                            <h5>⏱️ Ancienneté du chômage</h5>
                            ${this.renderDurationBreakdown(categorizedData.CHOMANC, totalJobSeekers)}
                        </div>
                    </div>
                    
                    <div class="detailed-breakdown">
                        <div class="breakdown-section">
                            <h5>🎓 Formation et qualification</h5>
                            <div class="dual-charts">
                                <div class="chart-half">
                                    <h6>Niveau de formation</h6>
                                    ${this.renderFormationBreakdown(categorizedData.NIVFORM)}
                                </div>
                                <div class="chart-half">
                                    <h6>Niveau de qualification</h6>
                                    ${this.renderQualificationBreakdown(categorizedData.NIVQUAL)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${years.length > 1 ? `
                        <div class="trends-section">
                            <h5>📈 Évolution récente</h5>
                            ${this.renderTrendsComparison(trends, years[0], years[1])}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Categorize job seekers data by type
     */
    static categorizeJobSeekersData(filteredCaracts) {
        const categories = {};
        
        filteredCaracts.forEach(item => {
            const type = item.codeTypeCaract;
            if (!categories[type]) categories[type] = [];
            
            // Skip TOTAL entries
            if (item.codeCaract !== 'TOTAL') {
                categories[type].push(item);
            }
        });
        
        return categories;
    }
    
    /**
     * Calculate trends between years
     */
    static calculateTrends(jobSeekersData, years) {
        const [newYear, oldYear] = years;
        const newData = jobSeekersData[newYear.toString()];
        const oldData = jobSeekersData[oldYear.toString()];
        
        if (!newData || !oldData) return null;
        
        const newTotal = newData.valeurPrincipaleNombre || 0;
        const oldTotal = oldData.valeurPrincipaleNombre || 0;
        
        const change = newTotal - oldTotal;
        const percentageChange = oldTotal > 0 ? (change / oldTotal) * 100 : 0;
        
        return {
            fromYear: oldYear,
            toYear: newYear,
            newTotal,
            oldTotal,
            change,
            percentageChange,
            direction: change > 0 ? 'negative' : change < 0 ? 'positive' : 'stable'
        };
    }
    
    /**
     * Render key insights panel
     */
    static renderKeyInsights(categorizedData, totalJobSeekers) {
        // Find key insights from data
        const ageData = categorizedData.AGE || [];
        const durationData = categorizedData.CHOMANC || [];
        const qualificationData = categorizedData.NIVQUAL || [];
        
        // Dominant age group
        const dominantAge = ageData.length > 0 ? 
            ageData.reduce((prev, curr) => (curr.nombre > prev.nombre) ? curr : prev) : null;
        
        // Long-term unemployment (2 years+)
        const longTerm = durationData.find(item => item.codeCaract === 'CHM5');
        
        // Qualification level distribution
        const cadres = qualificationData.find(item => item.codeCaract === 'CADRE');
        
        return `
            <div class="insights-panel">
                <h5>🔍 Points clés</h5>
                <div class="insights-grid">
                    ${dominantAge ? `
                        <div class="insight-item">
                            <div class="insight-icon">👥</div>
                            <div class="insight-content">
                                <div class="insight-value">${dominantAge.pourcentage}%</div>
                                <div class="insight-label">${dominantAge.libCaract}</div>
                                <div class="insight-context">Tranche d'âge principale</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${longTerm ? `
                        <div class="insight-item">
                            <div class="insight-icon">⏱️</div>
                            <div class="insight-content">
                                <div class="insight-value">${longTerm.pourcentage}%</div>
                                <div class="insight-label">Chômage longue durée</div>
                                <div class="insight-context">${longTerm.nombre.toLocaleString('fr-FR')} personnes (2 ans et +)</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${cadres ? `
                        <div class="insight-item">
                            <div class="insight-icon">👔</div>
                            <div class="insight-content">
                                <div class="insight-value">${cadres.pourcentage}%</div>
                                <div class="insight-label">Cadres</div>
                                <div class="insight-context">${cadres.nombre.toLocaleString('fr-FR')} cadres demandeurs</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render age breakdown chart
     */
    static renderAgeBreakdown(ageData, totalJobSeekers) {
        if (!ageData || ageData.length === 0) {
            return `<div class="no-data-message"><p>Données par âge non disponibles</p></div>`;
        }
        
        // Sort by age groups logically
        const sortedData = ageData.sort((a, b) => {
            const order = ['AGE1', 'AGE4', 'AGE5', 'AGE6'];
            return order.indexOf(a.codeCaract) - order.indexOf(b.codeCaract);
        });
        
        const maxValue = Math.max(...sortedData.map(item => item.pourcentage || 0));
        
        return `
            <div class="age-breakdown">
                ${sortedData.map(item => {
                    const percentage = item.pourcentage || 0;
                    const barWidth = maxValue > 0 ? (percentage / maxValue) * 100 : 0;
                    
                    return `
                        <div class="age-bar-item">
                            <div class="age-header">
                                <span class="age-label">${item.libCaract}</span>
                                <span class="age-stats">
                                    <span class="age-count">${item.nombre.toLocaleString('fr-FR')}</span>
                                    <span class="age-percentage">${percentage.toFixed(1)}%</span>
                                </span>
                            </div>
                            <div class="age-bar">
                                <div class="age-bar-fill" style="width: ${barWidth}%; background: ${this.getAgeColor(item.codeCaract)}"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Render duration breakdown with color coding
     */
    static renderDurationBreakdown(durationData, totalJobSeekers) {
        if (!durationData || durationData.length === 0) {
            return `<div class="no-data-message"><p>Données d'ancienneté non disponibles</p></div>`;
        }
        
        // Group by duration categories
        const shortTerm = durationData.filter(item => ['CHM1', 'CHM2'].includes(item.codeCaract));
        const mediumTerm = durationData.filter(item => ['CHM3', 'CHM4'].includes(item.codeCaract));  
        const longTerm = durationData.filter(item => item.codeCaract === 'CHM5');
        
        const shortTotal = shortTerm.reduce((sum, item) => sum + (item.nombre || 0), 0);
        const mediumTotal = mediumTerm.reduce((sum, item) => sum + (item.nombre || 0), 0);
        const longTotal = longTerm.reduce((sum, item) => sum + (item.nombre || 0), 0);
        
        const total = shortTotal + mediumTotal + longTotal;
        
        return `
            <div class="duration-breakdown">
                <div class="duration-summary">
                    <div class="duration-item short">
                        <div class="duration-bar" style="width: ${total > 0 ? (shortTotal/total)*100 : 0}%; background: ${this.colors.duration.short}"></div>
                        <div class="duration-info">
                            <div class="duration-label">Recherche récente</div>
                            <div class="duration-value">${shortTotal.toLocaleString('fr-FR')} (${total > 0 ? ((shortTotal/total)*100).toFixed(1) : 0}%)</div>
                            <div class="duration-detail">Moins de 6 mois</div>
                        </div>
                    </div>
                    
                    <div class="duration-item medium">
                        <div class="duration-bar" style="width: ${total > 0 ? (mediumTotal/total)*100 : 0}%; background: ${this.colors.duration.medium}"></div>
                        <div class="duration-info">
                            <div class="duration-label">Recherche intermédiaire</div>
                            <div class="duration-value">${mediumTotal.toLocaleString('fr-FR')} (${total > 0 ? ((mediumTotal/total)*100).toFixed(1) : 0}%)</div>
                            <div class="duration-detail">6 mois à 2 ans</div>
                        </div>
                    </div>
                    
                    <div class="duration-item long">
                        <div class="duration-bar" style="width: ${total > 0 ? (longTotal/total)*100 : 0}%; background: ${this.colors.duration.long}"></div>
                        <div class="duration-info">
                            <div class="duration-label">Chômage longue durée</div>
                            <div class="duration-value">${longTotal.toLocaleString('fr-FR')} (${total > 0 ? ((longTotal/total)*100).toFixed(1) : 0}%)</div>
                            <div class="duration-detail">Plus de 2 ans</div>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }
    
    /**
     * Render formation level breakdown
     */
    static renderFormationBreakdown(formationData) {
        if (!formationData || formationData.length === 0) {
            return `<div class="no-data-message"><p>Données de formation non disponibles</p></div>`;
        }
        
        return `
            <div class="formation-list">
                ${formationData.map(item => `
                    <div class="formation-item">
                        <div class="formation-label">${item.libCaract}</div>
                        <div class="formation-stats">
                            <span class="formation-percentage">${(item.pourcentage || 0).toFixed(1)}%</span>
                            <span class="formation-count">(${item.nombre.toLocaleString('fr-FR')})</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render qualification breakdown
     */
    static renderQualificationBreakdown(qualificationData) {
        if (!qualificationData || qualificationData.length === 0) {
            return `<div class="no-data-message"><p>Données de qualification non disponibles</p></div>`;
        }
        
        return `
            <div class="qualification-list">
                ${qualificationData.map(item => `
                    <div class="qualification-item">
                        <div class="qualification-color" style="background: ${this.getQualificationColor(item.codeCaract)}"></div>
                        <div class="qualification-info">
                            <div class="qualification-label">${item.libCaract}</div>
                            <div class="qualification-stats">
                                <span class="qualification-percentage">${(item.pourcentage || 0).toFixed(1)}%</span>
                                <span class="qualification-count">(${item.nombre.toLocaleString('fr-FR')})</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render trends comparison
     */
    static renderTrendsComparison(trends, newYear, oldYear) {
        return `
            <div class="trends-comparison">
                <div class="trend-header">
                    <span class="trend-period">${oldYear} → ${newYear}</span>
                    <span class="trend-change ${trends.direction}">
                        ${trends.change > 0 ? '+' : ''}${trends.change.toLocaleString('fr-FR')} 
                        (${trends.percentageChange > 0 ? '+' : ''}${trends.percentageChange.toFixed(1)}%)
                    </span>
                </div>
                
                <div class="trend-bars">
                    <div class="trend-bar-item">
                        <div class="trend-year">${oldYear}</div>
                        <div class="trend-bar old">
                            <div class="trend-bar-fill" style="width: ${Math.min((trends.oldTotal / Math.max(trends.oldTotal, trends.newTotal)) * 100, 100)}%"></div>
                            <span class="trend-value">${trends.oldTotal.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                    
                    <div class="trend-bar-item">
                        <div class="trend-year">${newYear}</div>
                        <div class="trend-bar new">
                            <div class="trend-bar-fill" style="width: ${Math.min((trends.newTotal / Math.max(trends.oldTotal, trends.newTotal)) * 100, 100)}%"></div>
                            <span class="trend-value">${trends.newTotal.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }
    
    /**
     * Get color for age groups
     */
    static getAgeColor(ageCode) {
        const colorMap = {
            'AGE1': this.colors.age.Y15T24,
            'AGE4': this.colors.age.Y25T34,
            'AGE5': this.colors.age.Y35T49,
            'AGE6': this.colors.age.Y50T64
        };
        return colorMap[ageCode] || '#95a5a6';
    }
    
    /**
     * Get color for qualification levels
     */
    static getQualificationColor(qualCode) {
        return this.colors.qualification[qualCode] || '#95a5a6';
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