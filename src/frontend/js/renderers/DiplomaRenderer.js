/**
 * DiplomaRenderer - Specialized renderer for education levels/diploma data
 * Displays education levels as horizontal progress bars with evolution over time
 */

export class DiplomaRenderer {
    
    // Education level labels mapping (handles multiple coding schemes)
    static diplomaLabels = {
        // 2016+ coding scheme
        '001T200_RP': 'Aucun diplôme ou BEPC/DNB/CFG',
        '300_RP': 'CAP, BEP ou équivalent', 
        '350T351_RP': 'Baccalauréat ou équivalent',
        '500T702_RP': 'Diplôme de l\'enseignement supérieur',
        
        // 2011 detailed coding scheme  
        '001T003_RP': 'Aucun diplôme',
        '100_RP': 'BEPC, DNB, CFG',
        '200_RP': 'CAP, BEP sans diplôme général',
        '350_RP': 'Baccalauréat général ou technologique',
        '351_RP': 'Baccalauréat professionnel', 
        '500_RP': 'BTS, DUT, DEUG, diplômes paramédicaux',
        '600T702_RP': 'Licence, maîtrise, master, doctorat',
        
        '_T': 'Total'
    };
    
    // Simplified grouped labels for consistent display
    static groupedLabels = {
        'no_diploma': 'Sans diplôme',
        'primary': 'BEPC/DNB/CFG', 
        'vocational': 'CAP/BEP',
        'bac': 'Baccalauréat',
        'higher': 'Enseignement supérieur'
    };
    
    // Colors for education levels
    static diplomaColors = {
        'no_diploma': '#e74c3c',    // Red
        'primary': '#f39c12',       // Orange
        'vocational': '#f1c40f',    // Yellow
        'bac': '#2ecc71',           // Green
        'higher': '#3498db'         // Blue
    };
    
    /**
     * Render diploma data with horizontal bar chart and evolution
     */
    static render(diplomaResponse) {
        const statusCheck = this.checkDataStatus(diplomaResponse);
        if (statusCheck) return statusCheck;
        
        const diplomaData = diplomaResponse.data;
        
        if (!diplomaData || Object.keys(diplomaData).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée de formation disponible</p></div>`;
        }

        // Get sorted years
        const years = Object.keys(diplomaData)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a); // Most recent first
            
        if (years.length === 0) {
            return `<div class="no-data-message"><p>Données de formation invalides</p></div>`;
        }
        
        // Get most recent year data
        const mostRecentYear = years[0];
        const recentData = diplomaData[mostRecentYear.toString()];
        const total = parseInt(recentData._T) || 0;
        
        if (total === 0) {
            return `<div class="no-data-message"><p>Aucune donnée pour ${mostRecentYear}</p></div>`;
        }
        
        // Group and process data
        const processedData = this.processEducationData(recentData, total);
        const evolutionData = years.length > 1 ? this.calculateEvolution(diplomaData, years.slice(0, 2)) : null;
        
        return `
            <div class="diploma-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>🎓 Niveaux de formation (${mostRecentYear})</h4>
                        <div class="total-indicator">
                            <span class="total-label">Population diplômée 15 ans+ :</span>
                            <span class="total-value">${total.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="education-visualization">
                    <div class="levels-chart">
                        ${this.renderHorizontalBars(processedData)}
                    </div>
                    
                    ${evolutionData ? `
                        <div class="evolution-panel">
                            <h5>📈 Évolution ${evolutionData.fromYear}-${evolutionData.toYear}</h5>
                            ${this.renderEvolution(evolutionData.changes)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Process education data into grouped categories
     */
    static processEducationData(yearData, total) {
        const processed = {};
        
        // Group the codes into logical categories
        const groupings = {
            'no_diploma': ['001T003_RP', '001T200_RP'],
            'primary': ['100_RP'],
            'vocational': ['200_RP', '300_RP'],
            'bac': ['350_RP', '351_RP', '350T351_RP'],
            'higher': ['500_RP', '600T702_RP', '500T702_RP']
        };
        
        Object.keys(groupings).forEach(group => {
            const codes = groupings[group];
            let groupTotal = 0;
            
            codes.forEach(code => {
                if (yearData[code]) {
                    groupTotal += parseInt(yearData[code]) || 0;
                }
            });
            
            if (groupTotal > 0) {
                processed[group] = {
                    label: this.groupedLabels[group],
                    value: groupTotal,
                    percentage: ((groupTotal / total) * 100).toFixed(1),
                    color: this.diplomaColors[group]
                };
            }
        });
        
        return processed;
    }
    
    /**
     * Calculate evolution between two years
     */
    static calculateEvolution(diplomaData, years) {
        const [newYear, oldYear] = years;
        const newData = diplomaData[newYear.toString()];
        const oldData = diplomaData[oldYear.toString()];
        
        if (!newData || !oldData) return null;
        
        const newProcessed = this.processEducationData(newData, parseInt(newData._T) || 1);
        const oldProcessed = this.processEducationData(oldData, parseInt(oldData._T) || 1);
        
        const changes = {};
        Object.keys(newProcessed).forEach(group => {
            const newPct = parseFloat(newProcessed[group].percentage);
            const oldPct = oldProcessed[group] ? parseFloat(oldProcessed[group].percentage) : 0;
            const change = newPct - oldPct;
            
            changes[group] = {
                label: newProcessed[group].label,
                change: change.toFixed(1),
                isIncrease: change > 0,
                color: newProcessed[group].color
            };
        });
        
        return {
            fromYear: oldYear,
            toYear: newYear,
            changes
        };
    }
    
    /**
     * Render horizontal bar chart
     */
    static renderHorizontalBars(processedData) {
        return `
            <div class="horizontal-bars">
                <h5>Répartition par niveau</h5>
                ${Object.keys(processedData).map(group => {
                    const item = processedData[group];
                    
                    return `
                        <div class="education-bar-item">
                            <div class="bar-header">
                                <div class="bar-label">${item.label}</div>
                                <div class="bar-stats">
                                    <span class="bar-value">${item.value.toLocaleString('fr-FR')}</span>
                                    <span class="bar-percentage">${item.percentage}%</span>
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" 
                                     style="width: ${item.percentage}%; background-color: ${item.color}"
                                     data-percentage="${item.percentage}"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Render evolution indicators
     */
    static renderEvolution(changes) {
        return `
            <div class="evolution-grid">
                ${Object.keys(changes).map(group => {
                    const change = changes[group];
                    const changeValue = parseFloat(change.change);
                    
                    return `
                        <div class="evolution-item">
                            <div class="evolution-header">
                                <div class="evolution-color" style="background-color: ${change.color}"></div>
                                <div class="evolution-label">${change.label}</div>
                            </div>
                            <div class="evolution-change ${change.isIncrease ? 'positive' : 'negative'}">
                                ${change.isIncrease ? '+' : ''}${change.change} points
                                <span class="evolution-icon">${change.isIncrease ? '↗' : '↘'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
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