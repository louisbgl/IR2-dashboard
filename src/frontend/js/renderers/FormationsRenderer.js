/**
 * FormationsRenderer - Specialized renderer for training/formation programs data
 * Handles ONISEP formations data with career-focused analysis and practical guidance
 */

export class FormationsRenderer {
    
    // Formation level mappings with career context
    static levelLabels = {
        'bac + 1': 'Post-bac (1 an)',
        'bac + 2': 'Bac+2 (BTS, DUT)',
        'bac + 3': 'Bac+3 (Licence, Bachelor)',
        'bac + 4': 'Bac+4 (Maîtrise, Master 1)',
        'bac + 5': 'Bac+5 (Master, Ingénieur)',
        'bac + 6': 'Bac+6 et plus (Doctorat)',
        'autres': 'Autres niveaux'
    };
    
    // Formation type categories for better organization
    static typeCategories = {
        'bts': 'BTS - Formation technique courte',
        'bachelor': 'Bachelor - Formation professionnalisante', 
        'licence': 'Licence - Formation universitaire',
        'master': 'Master - Formation spécialisée',
        'doctorat': 'Doctorat - Recherche',
        'diplôme': 'Diplômes spécialisés',
        'certificat': 'Certificats et qualifications',
        'prépa': 'Classes préparatoires',
        'autre': 'Autres formations'
    };
    
    // Status colors for institutions
    static statusColors = {
        'public': '#27ae60',
        'privé sous contrat': '#3498db',
        'privé hors contrat': '#f39c12',
        'privé': '#e67e22',
        'privé reconnu par l\'État': '#9b59b6'
    };
    
    // Domain colors for different fields
    static domainColors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
        '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#e91e63'
    ];
    
    /**
     * Render formations data with career-focused visualization
     */
    static render(formationsResponse) {
        const statusCheck = this.checkDataStatus(formationsResponse);
        if (statusCheck) return statusCheck;
        
        const formationsData = formationsResponse.data;
        
        if (!formationsData || !formationsData.coordinates || formationsData.coordinates.length === 0) {
            return `<div class="no-data-message"><p>Aucune formation trouvée dans cette zone</p></div>`;
        }
        
        const formations = formationsData.coordinates;
        const totalFormations = formations.length;
        
        // Process and analyze formations data
        const analysisData = this.analyzeFormations(formations);
        
        return `
            <div class="formations-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>📚 Formations disponibles</h4>
                        <div class="total-indicator">
                            <span class="total-value">${totalFormations}</span>
                            <span class="total-label">formation${totalFormations > 1 ? 's' : ''} identifiée${totalFormations > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="formations-visualization">
                    <div class="quick-insights">
                        <h5>🎯 Aperçu rapide</h5>
                        ${this.renderQuickInsights(analysisData)}
                    </div>
                    
                    <div class="formations-analysis">
                        <div class="analysis-section">
                            <h5>📊 Répartition par niveau</h5>
                            ${this.renderLevelBreakdown(analysisData.levelDistribution, totalFormations)}
                        </div>
                        
                        <div class="analysis-section">
                            <h5>🏢 Types d'établissements</h5>
                            ${this.renderStatusBreakdown(analysisData.statusDistribution, totalFormations)}
                        </div>
                    </div>
                    
                    <div class="domains-section">
                        <h5>🎓 Domaines de formation</h5>
                        ${this.renderDomainAnalysis(analysisData.domainDistribution)}
                    </div>
                    
                    <div class="practical-section">
                        <h5>💼 Formations par objectif professionnel</h5>
                        ${this.renderCareerFocusedView(analysisData)}
                    </div>
                    
                    <div class="formations-sample">
                        <h5>📍 Exemples de formations locales</h5>
                        ${this.renderFormationsSample(formations.slice(0, 8))}
                        ${formations.length > 8 ? `
                            <div class="show-more-note">
                                <small>... et ${formations.length - 8} autre${formations.length - 8 > 1 ? 's' : ''} formation${formations.length - 8 > 1 ? 's' : ''} disponible${formations.length - 8 > 1 ? 's' : ''}</small>
                            </div>
                        ` : ''}
                    </div>
                    
                </div>
            </div>
        `;
    }
    
    /**
     * Analyze formations data for insights
     */
    static analyzeFormations(formations) {
        const levelDistribution = {};
        const statusDistribution = {};
        const typeDistribution = {};
        const domainDistribution = {};
        const establishmentCounts = {};
        
        formations.forEach(formation => {
            // Level distribution
            const level = formation.niveau || 'autres';
            levelDistribution[level] = (levelDistribution[level] || 0) + 1;
            
            // Status distribution  
            const status = formation.statut || 'non spécifié';
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            
            // Type distribution
            const type = this.categorizeFormationType(formation.type);
            typeDistribution[type] = (typeDistribution[type] || 0) + 1;
            
            // Domain analysis (from formation name)
            const domain = this.extractDomain(formation.formation);
            domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
            
            // Establishment counting
            const establishment = formation.etablissement || 'Non spécifié';
            establishmentCounts[establishment] = (establishmentCounts[establishment] || 0) + 1;
        });
        
        // Find popular domains and levels
        const popularDomains = Object.entries(domainDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
        const popularLevels = Object.entries(levelDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        const uniqueEstablishments = Object.keys(establishmentCounts).length;
        const avgFormationsPerEstablishment = (formations.length / uniqueEstablishments).toFixed(1);
        
        return {
            levelDistribution,
            statusDistribution,
            typeDistribution,
            domainDistribution,
            popularDomains,
            popularLevels,
            uniqueEstablishments,
            avgFormationsPerEstablishment,
            totalFormations: formations.length
        };
    }
    
    /**
     * Render quick insights panel
     */
    static renderQuickInsights(analysisData) {
        const insights = [];
        
        // Most popular level
        if (analysisData.popularLevels.length > 0) {
            const [topLevel, count] = analysisData.popularLevels[0];
            const percentage = ((count / analysisData.totalFormations) * 100).toFixed(0);
            insights.push({
                icon: '📊',
                label: 'Niveau principal',
                value: `${this.levelLabels[topLevel] || topLevel}`,
                context: `${percentage}% des formations`
            });
        }
        
        // Most popular domain
        if (analysisData.popularDomains.length > 0) {
            const [topDomain, count] = analysisData.popularDomains[0];
            insights.push({
                icon: '🎓',
                label: 'Domaine leader',
                value: topDomain,
                context: `${count} formation${count > 1 ? 's' : ''}`
            });
        }
        
        // Establishment diversity
        insights.push({
            icon: '🏢',
            label: 'Établissements',
            value: `${analysisData.uniqueEstablishments}`,
            context: `${analysisData.avgFormationsPerEstablishment} formations/établissement`
        });
        
        // Public vs private ratio
        const publicCount = analysisData.statusDistribution['public'] || 0;
        const privateCount = analysisData.totalFormations - publicCount;
        const publicRatio = ((publicCount / analysisData.totalFormations) * 100).toFixed(0);
        
        insights.push({
            icon: '⚖️',
            label: 'Répartition',
            value: `${publicRatio}% public`,
            context: `${100 - publicRatio}% privé`
        });
        
        return `
            <div class="insights-grid">
                ${insights.map(insight => `
                    <div class="insight-card">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-content">
                            <div class="insight-value">${insight.value}</div>
                            <div class="insight-label">${insight.label}</div>
                            <div class="insight-context">${insight.context}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render level breakdown chart
     */
    static renderLevelBreakdown(levelDistribution, total) {
        const sortedLevels = Object.entries(levelDistribution)
            .sort(([,a], [,b]) => b - a);
        
        const maxCount = Math.max(...Object.values(levelDistribution));
        
        return `
            <div class="level-breakdown">
                ${sortedLevels.map(([level, count]) => {
                    const percentage = ((count / total) * 100).toFixed(1);
                    const barWidth = (count / maxCount) * 100;
                    const label = this.levelLabels[level] || level;
                    
                    return `
                        <div class="level-bar-item">
                            <div class="level-header">
                                <span class="level-label">${label}</span>
                                <span class="level-stats">
                                    <span class="level-count">${count}</span>
                                    <span class="level-percentage">(${percentage}%)</span>
                                </span>
                            </div>
                            <div class="level-bar">
                                <div class="level-bar-fill" style="width: ${barWidth}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <div class="level-explanation">
                    <p><strong>💡 À savoir :</strong></p>
                    <ul>
                        <li><strong>Bac+2 :</strong> Formation courte, insertion rapide</li>
                        <li><strong>Bac+3 :</strong> Niveau licence, poursuite d'études possible</li>
                        <li><strong>Bac+5 :</strong> Formation longue, spécialisation avancée</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Render status breakdown (public/private)
     */
    static renderStatusBreakdown(statusDistribution, total) {
        const sortedStatuses = Object.entries(statusDistribution)
            .sort(([,a], [,b]) => b - a);
        
        return `
            <div class="status-breakdown">
                <div class="status-chart">
                    ${sortedStatuses.map(([status, count]) => {
                        const percentage = ((count / total) * 100).toFixed(1);
                        const color = this.statusColors[status] || '#95a5a6';
                        
                        return `
                            <div class="status-item">
                                <div class="status-color" style="background: ${color}"></div>
                                <div class="status-info">
                                    <div class="status-name">${status}</div>
                                    <div class="status-stats">${count} (${percentage}%)</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="status-advice">
                    <p><strong>💰 Coûts indicatifs :</strong></p>
                    <ul>
                        <li><strong>Public :</strong> ~200-400€/an (droits universitaires)</li>
                        <li><strong>Privé sous contrat :</strong> ~1000-8000€/an</li>
                        <li><strong>Privé hors contrat :</strong> ~3000-15000€/an</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Render domain analysis
     */
    static renderDomainAnalysis(domainDistribution) {
        const sortedDomains = Object.entries(domainDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8); // Top 8 domains
        
        return `
            <div class="domains-analysis">
                <div class="domains-grid">
                    ${sortedDomains.map(([domain, count], index) => {
                        const color = this.domainColors[index % this.domainColors.length];
                        const percentage = ((count / Object.values(domainDistribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                        
                        return `
                            <div class="domain-card">
                                <div class="domain-color" style="background: ${color}"></div>
                                <div class="domain-info">
                                    <div class="domain-name">${domain}</div>
                                    <div class="domain-stats">
                                        <span class="domain-count">${count}</span>
                                        <span class="domain-percentage">(${percentage}%)</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="domains-note">
                    <p><strong>📚 Diversité :</strong> ${Object.keys(domainDistribution).length} domaines différents identifiés</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render career-focused view
     */
    static renderCareerFocusedView(analysisData) {
        const careerCategories = {
            'Insertion rapide': ['bac + 1', 'bac + 2'],
            'Poursuite d\'études': ['bac + 3'],
            'Spécialisation': ['bac + 4', 'bac + 5'],
            'Recherche': ['bac + 6']
        };
        
        const careerBreakdown = {};
        Object.entries(careerCategories).forEach(([category, levels]) => {
            careerBreakdown[category] = levels.reduce((sum, level) => 
                sum + (analysisData.levelDistribution[level] || 0), 0
            );
        });
        
        return `
            <div class="career-focused-view">
                <div class="career-paths">
                    ${Object.entries(careerBreakdown).map(([path, count]) => {
                        if (count === 0) return '';
                        const percentage = ((count / analysisData.totalFormations) * 100).toFixed(0);
                        
                        return `
                            <div class="career-path">
                                <div class="career-icon">${this.getCareerIcon(path)}</div>
                                <div class="career-info">
                                    <div class="career-name">${path}</div>
                                    <div class="career-stats">${count} formations (${percentage}%)</div>
                                    <div class="career-description">${this.getCareerDescription(path)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render formations sample list
     */
    static renderFormationsSample(formationsSample) {
        return `
            <div class="formations-sample">
                ${formationsSample.map(formation => `
                    <div class="formation-item">
                        <div class="formation-header">
                            <div class="formation-name">${formation.formation || 'Formation non spécifiée'}</div>
                            <div class="formation-level">${formation.niveau || ''}</div>
                        </div>
                        <div class="formation-establishment">
                            🏢 ${formation.etablissement || 'Établissement non spécifié'}
                        </div>
                        <div class="formation-details">
                            <span class="formation-type">${formation.type || 'Type non spécifié'}</span>
                            <span class="formation-status" style="color: ${this.statusColors[formation.statut] || '#666'}">
                                ${formation.statut || 'Statut non spécifié'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render formation guidance
     */
    static renderFormationGuidance(analysisData, totalFormations) {
        const guidance = [];
        const tips = [];
        
        // Analyze the offerings and provide contextual advice
        const hasShortFormations = (analysisData.levelDistribution['bac + 1'] || 0) + 
                                  (analysisData.levelDistribution['bac + 2'] || 0) > totalFormations * 0.3;
        
        const hasLongFormations = (analysisData.levelDistribution['bac + 4'] || 0) + 
                                 (analysisData.levelDistribution['bac + 5'] || 0) > totalFormations * 0.2;
        
        if (hasShortFormations) {
            guidance.push('🎯 Zone favorable aux formations courtes professionnalisantes');
            tips.push('Idéal pour une insertion rapide sur le marché du travail');
        }
        
        if (hasLongFormations) {
            guidance.push('🎓 Bonnes opportunités pour les formations longues spécialisées');
            tips.push('Permet des parcours d\'expertise et de recherche');
        }
        
        const publicRatio = (analysisData.statusDistribution['public'] || 0) / totalFormations;
        if (publicRatio > 0.6) {
            guidance.push('💰 Majorité de formations à coût modéré (public)');
            tips.push('Budget formation raisonnable pour la plupart des cursus');
        } else if (publicRatio < 0.3) {
            guidance.push('💸 Attention aux coûts (majorité privé)');
            tips.push('Explorez les aides financières et bourses disponibles');
        }
        
        if (analysisData.uniqueEstablishments < 5) {
            tips.push('📍 Offre concentrée - vérifiez la compatibilité avec vos projets');
        } else {
            tips.push('🏢 Large choix d\'établissements - comparez les approches pédagogiques');
        }
        
        return `
            <div class="formation-guidance">
                <div class="guidance-highlights">
                    ${guidance.map(highlight => `
                        <div class="guidance-highlight">${highlight}</div>
                    `).join('')}
                </div>
                
                <div class="practical-tips">
                    <h6>💡 Conseils pour bien choisir :</h6>
                    <ul class="tips-list">
                        ${tips.map(tip => `<li>${tip}</li>`).join('')}
                        <li>🔍 Vérifiez les taux d'insertion professionnelle</li>
                        <li>📞 Contactez les anciens étudiants si possible</li>
                        <li>🌐 Consultez les forums et avis en ligne</li>
                        <li>📅 Participez aux journées portes ouvertes</li>
                    </ul>
                </div>
                
                <div class="next-actions">
                    <h6>🎯 Actions concrètes :</h6>
                    <ol class="actions-list">
                        <li>Identifiez 3-5 formations qui vous intéressent</li>
                        <li>Comparez les programmes détaillés</li>
                        <li>Évaluez les modalités d'admission</li>
                        <li>Calculez les coûts totaux (formation + vie étudiante)</li>
                        <li>Préparez votre candidature en avance</li>
                    </ol>
                </div>
            </div>
        `;
    }
    
    /**
     * Categorize formation type for grouping
     */
    static categorizeFormationType(type) {
        if (!type) return 'autre';
        
        const lowerType = type.toLowerCase();
        
        for (const [keyword, category] of Object.entries(this.typeCategories)) {
            if (keyword !== 'autre' && lowerType.includes(keyword)) {
                return category;
            }
        }
        
        return 'Autres formations';
    }
    
    /**
     * Extract domain from formation name
     */
    static extractDomain(formationName) {
        if (!formationName) return 'Non spécifié';
        
        const lowerName = formationName.toLowerCase();
        
        // Common domain keywords
        const domainKeywords = {
            'informatique': ['informatique', 'numérique', 'digital', 'cyber', 'data'],
            'commerce': ['commerce', 'marketing', 'vente', 'business'],
            'santé': ['santé', 'médical', 'biologie', 'médecine'],
            'ingénierie': ['ingénieur', 'technique', 'mécanique', 'électronique'],
            'art': ['art', 'design', 'graphisme', 'création'],
            'gestion': ['gestion', 'management', 'administration'],
            'communication': ['communication', 'journalisme', 'média'],
            'droit': ['droit', 'juridique', 'justice'],
            'éducation': ['éducation', 'enseignement', 'formation'],
            'sciences': ['sciences', 'physique', 'chimie', 'mathématiques']
        };
        
        for (const [domain, keywords] of Object.entries(domainKeywords)) {
            if (keywords.some(keyword => lowerName.includes(keyword))) {
                return domain.charAt(0).toUpperCase() + domain.slice(1);
            }
        }
        
        // Extract first significant word if no keyword match
        const words = formationName.split(' ').filter(word => word.length > 3);
        return words.length > 0 ? words[0] : 'Autre';
    }
    
    /**
     * Get career path icon
     */
    static getCareerIcon(path) {
        const icons = {
            'Insertion rapide': '🚀',
            'Poursuite d\'études': '📚',
            'Spécialisation': '🎯',
            'Recherche': '🔬'
        };
        return icons[path] || '📋';
    }
    
    /**
     * Get career path description
     */
    static getCareerDescription(path) {
        const descriptions = {
            'Insertion rapide': 'Formations courtes orientées emploi immédiat',
            'Poursuite d\'études': 'Licence permettant de continuer vers master',
            'Spécialisation': 'Master et formations d\'expertise',
            'Recherche': 'Doctorat et formations à la recherche'
        };
        return descriptions[path] || 'Formation spécialisée';
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