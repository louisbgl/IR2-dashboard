/**
 * PerspectivesRenderer - Specialized renderer for employer perspectives data
 * Handles France Travail market tension indicators with user-friendly explanations
 */

export class PerspectivesRenderer {
    
    // Indicator label mappings
    static indicatorLabels = {
        'PERSPECTIVE': 'Tension globale du marché',
        'MAIN_OEUVRE': 'Manque de main d\'oeuvre',
        'INT_EMB': 'Intensité d\'embauche',
        'ATTR_SALARIALE': 'Attractivité salariale',
        'COND_TRAVAIL': 'Conditions de travail',
        'DUR_EMPL': 'Durabilité de l\'emploi',
        'MISMATCH_GEO': 'Inadéquation géographique',
        'SPECIF_FORM_EMPL': 'Lien formation-métier'
    };
    
    // User-friendly explanations for each indicator
    static indicatorExplanations = {
        'PERSPECTIVE': 'Plus c\'est élevé, plus il est facile de trouver un emploi dans cette zone',
        'MAIN_OEUVRE': 'Difficulté des employeurs à recruter par manque de candidats',
        'INT_EMB': 'Fréquence des embauches - marché dynamique',
        'ATTR_SALARIALE': 'Niveau des salaires proposés par rapport aux attentes',
        'COND_TRAVAIL': 'Qualité des conditions de travail proposées',
        'DUR_EMPL': 'Stabilité et pérennité des emplois proposés',
        'MISMATCH_GEO': 'Décalage entre localisation des emplois et des candidats',
        'SPECIF_FORM_EMPL': 'Adéquation entre formation et compétences demandées'
    };
    
    // Color scale for tension levels (1-5)
    static tensionColors = {
        1: '#e74c3c',    // Très faible (rouge) - Difficile pour chercheurs
        2: '#f39c12',    // Faible (orange)
        3: '#f1c40f',    // Modéré (jaune)
        4: '#2ecc71',    // Élevé (vert) - Bon pour chercheurs
        5: '#27ae60'     // Très élevé (vert foncé) - Excellent pour chercheurs
    };
    
    // Decimal value colors (can be negative or positive)
    static decimalColors = {
        positive: '#27ae60',
        negative: '#e74c3c',
        neutral: '#95a5a6'
    };
    
    /**
     * Render employer perspectives data with tension indicators and trends
     */
    static render(perspectivesResponse) {
        const statusCheck = this.checkDataStatus(perspectivesResponse);
        if (statusCheck) return statusCheck;
        
        const perspectivesData = perspectivesResponse.data;
        
        if (!perspectivesData || !perspectivesData.data || Object.keys(perspectivesData.data).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée de perspectives employeurs disponible</p></div>`;
        }

        // Get sorted years (most recent first)
        const years = Object.keys(perspectivesData.data)
            .map(year => parseInt(year))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a);
            
        if (years.length === 0) {
            return `<div class="no-data-message"><p>Données de perspectives invalides</p></div>`;
        }
        
        const mostRecentYear = years[0];
        const recentData = perspectivesData.data[mostRecentYear.toString()];
        const territoryName = perspectivesData.libTerritoire || 'Territoire';
        
        if (!recentData || recentData.length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée pour ${mostRecentYear}</p></div>`;
        }
        
        // Process indicators
        const indicators = this.processIndicators(recentData);
        const trends = years.length > 1 ? this.calculateTrends(perspectivesData.data, years.slice(0, 2)) : null;
        const mainTension = indicators.find(ind => ind.code === 'PERSPECTIVE');
        
        return `
            <div class="perspectives-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>💡 Perspectives employeurs - ${territoryName} (${mostRecentYear})</h4>
                        ${mainTension ? `
                            <div class="main-tension">
                                <div class="tension-gauge">
                                    ${this.renderTensionGauge(mainTension)}
                                </div>
                                <div class="tension-explanation">
                                    <strong>Niveau ${mainTension.level}/5</strong> - ${this.getTensionDescription(mainTension.level)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="perspectives-visualization">
                    <div class="indicators-overview">
                        <h5>🎯 Indicateurs clés du marché</h5>
                        ${this.renderIndicatorsGrid(indicators.filter(ind => ind.code !== 'PERSPECTIVE'))}
                    </div>
                    
                    ${trends ? `
                        <div class="trends-section">
                            <h5>📈 Évolution ${trends.fromYear}-${trends.toYear}</h5>
                            ${this.renderTrendsAnalysis(trends)}
                        </div>
                    ` : ''}
                    
                </div>
            </div>
        `;
    }
    
    /**
     * Process raw indicators into structured format
     */
    static processIndicators(rawData) {
        return rawData.map(item => ({
            code: item.codeNomenclature,
            label: this.indicatorLabels[item.codeNomenclature] || item.libNomenclature,
            explanation: this.indicatorExplanations[item.codeNomenclature] || '',
            decimalValue: parseFloat(item.valeurPrincipaleDecimale || 0),
            level: parseInt(item.valeurPrincipaleNom || 0),
            isPositive: parseFloat(item.valeurPrincipaleDecimale || 0) > 0,
            isNeutral: Math.abs(parseFloat(item.valeurPrincipaleDecimale || 0)) < 0.1
        }));
    }
    
    /**
     * Calculate trends between two years
     */
    static calculateTrends(allData, years) {
        const [newYear, oldYear] = years;
        const newData = allData[newYear.toString()] || [];
        const oldData = allData[oldYear.toString()] || [];
        
        const trends = [];
        
        newData.forEach(newItem => {
            const oldItem = oldData.find(old => old.codeNomenclature === newItem.codeNomenclature);
            if (oldItem) {
                const newValue = parseFloat(newItem.valeurPrincipaleDecimale || 0);
                const oldValue = parseFloat(oldItem.valeurPrincipaleDecimale || 0);
                const change = newValue - oldValue;
                
                if (Math.abs(change) > 0.05) { // Only significant changes
                    trends.push({
                        code: newItem.codeNomenclature,
                        label: this.indicatorLabels[newItem.codeNomenclature] || newItem.libNomenclature,
                        oldValue,
                        newValue,
                        change,
                        direction: change > 0 ? 'positive' : 'negative',
                        isImprovement: this.isImprovementForJobSeekers(newItem.codeNomenclature, change)
                    });
                }
            }
        });
        
        // Sort by absolute change magnitude
        trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
        
        return {
            fromYear: oldYear,
            toYear: newYear,
            trends: trends.slice(0, 4) // Top 4 changes
        };
    }
    
    /**
     * Render main tension gauge
     */
    static renderTensionGauge(mainTension) {
        const level = mainTension.level;
        const percentage = (level / 5) * 100;
        const color = this.tensionColors[level] || this.tensionColors[3];
        
        return `
            <div class="tension-gauge-container">
                <div class="gauge-background">
                    <div class="gauge-fill" style="width: ${percentage}%; background: ${color}"></div>
                    <div class="gauge-levels">
                        ${[1,2,3,4,5].map(lvl => `
                            <div class="gauge-level ${lvl === level ? 'active' : ''}" 
                                 style="background: ${this.tensionColors[lvl]}">
                                ${lvl}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="gauge-value">
                    <span class="gauge-number">${level}</span>
                    <span class="gauge-max">/5</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Get user-friendly tension description
     */
    static getTensionDescription(level) {
        const descriptions = {
            1: 'Très difficile de trouver un emploi',
            2: 'Marché de l\'emploi tendu',
            3: 'Marché équilibré', 
            4: 'Bonnes opportunités d\'emploi',
            5: 'Excellentes opportunités d\'emploi'
        };
        return descriptions[level] || 'Données insuffisantes';
    }
    
    /**
     * Render indicators grid
     */
    static renderIndicatorsGrid(indicators) {
        return `
            <div class="indicators-grid">
                ${indicators.map(indicator => {
                    const color = indicator.isNeutral ? this.decimalColors.neutral :
                                 indicator.isPositive ? this.decimalColors.positive :
                                 this.decimalColors.negative;
                    
                    return `
                        <div class="indicator-card">
                            <div class="indicator-header">
                                <div class="indicator-name">${indicator.label}</div>
                                ${indicator.level > 0 ? `
                                    <div class="indicator-level" style="background: ${this.tensionColors[indicator.level] || '#95a5a6'}">
                                        Niveau ${indicator.level}
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="indicator-value" style="color: ${color}">
                                ${indicator.decimalValue > 0 ? '+' : ''}${indicator.decimalValue.toFixed(2)}
                            </div>
                            
                            ${indicator.explanation ? `
                                <div class="indicator-explanation">
                                    ${indicator.explanation}
                                </div>
                            ` : ''}
                            
                            <div class="indicator-status ${indicator.isPositive ? 'positive' : indicator.isNeutral ? 'neutral' : 'negative'}">
                                ${indicator.isPositive ? '↗ Favorable' : indicator.isNeutral ? '→ Stable' : '↘ Défavorable'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Render trends analysis
     */
    static renderTrendsAnalysis(trendsData) {
        if (!trendsData.trends || trendsData.trends.length === 0) {
            return `<div class="no-data-message"><p>Pas de changements significatifs détectés</p></div>`;
        }
        
        return `
            <div class="trends-analysis">
                ${trendsData.trends.map(trend => `
                    <div class="trend-item">
                        <div class="trend-indicator ${trend.isImprovement ? 'improvement' : 'deterioration'}">
                            ${trend.isImprovement ? '📈' : '📉'}
                        </div>
                        <div class="trend-content">
                            <div class="trend-name">${trend.label}</div>
                            <div class="trend-change">
                                <span class="trend-values">
                                    ${trend.oldValue.toFixed(2)} → ${trend.newValue.toFixed(2)}
                                </span>
                                <span class="trend-delta ${trend.direction}">
                                    (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(2)})
                                </span>
                            </div>
                            <div class="trend-interpretation">
                                ${trend.isImprovement ? '✅ Amélioration pour les demandeurs' : '❌ Plus difficile pour les demandeurs'}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render job seeker interpretation
     */
    static renderJobSeekerInterpretation(indicators, mainTension) {
        let interpretation = '';
        let advice = [];
        
        // Main tension analysis
        if (mainTension) {
            if (mainTension.level >= 4) {
                interpretation = '🟢 <strong>Situation favorable :</strong> Le marché de l\'emploi offre de bonnes opportunités dans cette zone.';
                advice.push('Profitez de cette période favorable pour négocier vos conditions');
                advice.push('Explorez différents secteurs, le choix est large');
            } else if (mainTension.level >= 3) {
                interpretation = '🟡 <strong>Situation équilibrée :</strong> Le marché offre des opportunités mais demande plus d\'efforts de recherche.';
                advice.push('Préparez bien vos candidatures');
                advice.push('Élargissez votre zone de recherche si possible');
            } else {
                interpretation = '🔴 <strong>Marché difficile :</strong> Peu d\'opportunités disponibles, la concurrence est forte.';
                advice.push('Concentrez-vous sur la formation et le développement de compétences');
                advice.push('Considérez d\'autres zones géographiques');
                advice.push('Explorez les dispositifs d\'aide à la mobilité');
            }
        }
        
        // Additional insights from other indicators
        const highIntensity = indicators.find(ind => ind.code === 'INT_EMB' && ind.level >= 4);
        const lowSalary = indicators.find(ind => ind.code === 'ATTR_SALARIALE' && ind.decimalValue < -0.3);
        const skillsMismatch = indicators.find(ind => ind.code === 'SPECIF_FORM_EMPL' && ind.decimalValue < -0.1);
        
        if (highIntensity) {
            advice.push('🔄 Marché dynamique : postulez rapidement aux offres');
        }
        
        if (lowSalary) {
            advice.push('💰 Salaires peu attractifs : négociez d\'autres avantages');
        }
        
        if (skillsMismatch) {
            advice.push('🎓 Inadéquation formation-emploi : considérez une formation complémentaire');
        }
        
        return `
            <div class="job-seeker-interpretation">
                <div class="interpretation-summary">
                    <p>${interpretation}</p>
                </div>
                
                <div class="practical-advice">
                    <h6>💡 Conseils pratiques :</h6>
                    <ul class="advice-list">
                        ${advice.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="methodology-note">
                    <small>
                        <strong>Note :</strong> Ces indicateurs reflètent les perspectives des employeurs et les tensions du marché de l'emploi. 
                        Plus la tension est élevée, plus il est généralement facile pour les demandeurs d'emploi de trouver un poste.
                    </small>
                </div>
            </div>
        `;
    }
    
    /**
     * Determine if a change is an improvement for job seekers
     */
    static isImprovementForJobSeekers(indicatorCode, change) {
        // For job seekers, these are generally positive when increasing:
        const positiveWhenIncreasing = ['PERSPECTIVE', 'INT_EMB', 'ATTR_SALARIALE', 'COND_TRAVAIL', 'DUR_EMPL'];
        
        // These are generally negative when increasing (problems):
        const negativeWhenIncreasing = ['MAIN_OEUVRE', 'MISMATCH_GEO'];
        
        if (positiveWhenIncreasing.includes(indicatorCode)) {
            return change > 0;
        } else if (negativeWhenIncreasing.includes(indicatorCode)) {
            return change < 0; // Decrease in problems is good
        }
        
        // Default: assume increase is good
        return change > 0;
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