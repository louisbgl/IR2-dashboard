/**
 * HigherEducationRenderer - Specialized renderer for higher education establishments data
 * Handles ONISEP higher education establishment data with institutional analysis
 */

export class HigherEducationRenderer {
    
    // Institution status labels
    static statusLabels = {
        'public': 'Public',
        'privé sous contrat': 'Privé sous contrat',
        'privé hors contrat': 'Privé hors contrat',
        'privé reconnu par l\'Etat': 'Privé reconnu'
    };
    
    // Institution type categories for grouping
    static typeCategories = {
        'université': 'Universités',
        'institut': 'Instituts spécialisés',
        'école': 'Écoles',
        'iut': 'IUT',
        'lycée': 'Lycées (classes préparatoires)',
        'centre': 'Centres de formation'
    };
    
    // Colors for different statuses
    static statusColors = {
        'public': '#27ae60',           // Green
        'privé sous contrat': '#3498db',   // Blue
        'privé hors contrat': '#f39c12',   // Orange
        'privé reconnu par l\'Etat': '#9b59b6', // Purple
        'unknown': '#95a5a6'           // Gray
    };
    
    // Icons for different institution types
    static institutionIcons = {
        'université': '🏛️',
        'institut': '🔬',
        'école': '🎓',
        'iut': '⚙️',
        'lycée': '📚',
        'centre': '📋',
        'default': '🏢'
    };
    
    /**
     * Render higher education establishments data
     */
    static render(higherEducationResponse) {
        const statusCheck = this.checkDataStatus(higherEducationResponse);
        if (statusCheck) return statusCheck;
        
        const educationData = higherEducationResponse.data;
        
        if (!educationData || educationData.total_etablissements === 0) {
            return `<div class="no-data-message"><p>Aucun établissement d'enseignement supérieur trouvé dans cette zone</p></div>`;
        }
        
        const totalEstablishments = educationData.total_etablissements || 0;
        const statusCounts = educationData.status_counts || {};
        const typeCounts = educationData.type_counts || {};
        const coordinates = educationData.coordinates || [];
        
        // Process and categorize data
        const processedData = this.processEstablishmentsData(statusCounts, typeCounts, coordinates);
        
        return `
            <div class="higher-education-data-container">
                <div class="data-overview">
                    <div class="overview-header">
                        <h4>🏢 Établissements d'enseignement supérieur</h4>
                        <div class="total-indicator">
                            <span class="total-value">${totalEstablishments}</span>
                            <span class="total-label">établissement${totalEstablishments > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="education-visualization">
                    ${totalEstablishments > 0 ? `
                        <div class="status-breakdown">
                            <h5>📊 Répartition par statut</h5>
                            ${this.renderStatusBreakdown(statusCounts, totalEstablishments)}
                        </div>
                        
                        ${Object.keys(typeCounts).length > 0 ? `
                            <div class="type-breakdown">
                                <h5>🎓 Types d'établissements</h5>
                                ${this.renderTypeBreakdown(typeCounts, totalEstablishments)}
                            </div>
                        ` : ''}
                        
                        ${coordinates.length > 0 ? `
                            <div class="establishments-list">
                                <h5>📍 Établissements localisés</h5>
                                ${this.renderEstablishmentsList(coordinates.slice(0, 10))}
                                ${coordinates.length > 10 ? `
                                    <div class="show-more-note">
                                        <small>... et ${coordinates.length - 10} autre${coordinates.length - 10 > 1 ? 's' : ''} établissement${coordinates.length - 10 > 1 ? 's' : ''}</small>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                    ` : `
                        <div class="no-establishments">
                            <p>Cette zone ne dispose pas d'établissements d'enseignement supérieur répertoriés.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Process establishments data for analysis
     */
    static processEstablishmentsData(statusCounts, typeCounts, coordinates) {
        // Calculate public vs private ratio
        const publicCount = statusCounts['public'] || 0;
        const privateCount = Object.keys(statusCounts)
            .filter(status => status.startsWith('privé'))
            .reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
            
        // Identify main institution types
        const dominantType = Object.keys(typeCounts).length > 0 ?
            Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b) : null;
            
        // Geographic distribution
        const hasCoordinates = coordinates.length > 0;
        const uniqueInstitutions = [...new Set(coordinates.map(coord => coord.nom))].length;
        
        return {
            publicCount,
            privateCount,
            publicRatio: publicCount + privateCount > 0 ? (publicCount / (publicCount + privateCount)) * 100 : 0,
            dominantType,
            hasCoordinates,
            uniqueInstitutions,
            totalWithCoordinates: coordinates.length
        };
    }
    
    /**
     * Render status breakdown chart
     */
    static renderStatusBreakdown(statusCounts, total) {
        if (Object.keys(statusCounts).length === 0) {
            return `<div class="no-data-message"><p>Répartition par statut non disponible</p></div>`;
        }
        
        // Sort by count descending
        const sortedStatuses = Object.entries(statusCounts)
            .sort(([,a], [,b]) => b - a);
        
        return `
            <div class="status-chart">
                <div class="status-bars">
                    ${sortedStatuses.map(([status, count]) => {
                        const percentage = ((count / total) * 100).toFixed(1);
                        const color = this.statusColors[status] || this.statusColors.unknown;
                        const label = this.statusLabels[status] || status;
                        
                        return `
                            <div class="status-bar-item">
                                <div class="status-header">
                                    <div class="status-color" style="background: ${color}"></div>
                                    <div class="status-info">
                                        <span class="status-label">${label}</span>
                                        <span class="status-count">${count} (${percentage}%)</span>
                                    </div>
                                </div>
                                <div class="status-bar">
                                    <div class="status-bar-fill" 
                                         style="width: ${percentage}%; background: ${color}"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="status-explanation">
                    <h6>Comprendre les statuts :</h6>
                    <ul class="status-legend">
                        <li><strong>Public :</strong> Établissements financés par l'État, frais de scolarité modérés</li>
                        <li><strong>Privé sous contrat :</strong> Établissements privés avec reconnaissance officielle</li>
                        <li><strong>Privé hors contrat :</strong> Établissements privés, frais généralement plus élevés</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Render institution types breakdown
     */
    static renderTypeBreakdown(typeCounts, total) {
        // Group similar types and sort
        const groupedTypes = {};
        
        Object.entries(typeCounts).forEach(([type, count]) => {
            const category = this.categorizeInstitutionType(type);
            if (!groupedTypes[category]) groupedTypes[category] = 0;
            groupedTypes[category] += count;
        });
        
        const sortedTypes = Object.entries(groupedTypes)
            .sort(([,a], [,b]) => b - a);
        
        return `
            <div class="type-breakdown">
                <div class="type-grid">
                    ${sortedTypes.map(([category, count]) => {
                        const percentage = ((count / total) * 100).toFixed(1);
                        const icon = this.getInstitutionIcon(category);
                        
                        return `
                            <div class="type-card">
                                <div class="type-icon">${icon}</div>
                                <div class="type-info">
                                    <div class="type-name">${category}</div>
                                    <div class="type-stats">
                                        <span class="type-count">${count}</span>
                                        <span class="type-percentage">(${percentage}%)</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render establishments list with details
     */
    static renderEstablishmentsList(coordinates) {
        if (coordinates.length === 0) {
            return `<div class="no-data-message"><p>Aucun établissement avec coordonnées disponible</p></div>`;
        }
        
        return `
            <div class="establishments-list">
                ${coordinates.map(establishment => {
                    const statusColor = this.statusColors[establishment.statut] || this.statusColors.unknown;
                    const icon = this.getInstitutionIcon(establishment.type || establishment.nom);
                    
                    return `
                        <div class="establishment-item">
                            <div class="establishment-icon">${icon}</div>
                            <div class="establishment-info">
                                <div class="establishment-name">${establishment.nom || 'Établissement'}</div>
                                <div class="establishment-details">
                                    <span class="establishment-type">${establishment.type || 'Type non spécifié'}</span>
                                    <span class="establishment-status" style="color: ${statusColor}">
                                        ${this.statusLabels[establishment.statut] || establishment.statut || 'Statut non spécifié'}
                                    </span>
                                </div>
                                ${establishment.latitude && establishment.longitude ? `
                                    <div class="establishment-location">
                                        📍 ${establishment.latitude.toFixed(4)}°N, ${establishment.longitude.toFixed(4)}°E
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Render student guidance section
     */
    static renderStudentGuidance(processedData, totalEstablishments) {
        let guidance = [];
        let highlights = [];
        
        // Public vs private analysis
        if (processedData.publicRatio > 70) {
            highlights.push('🟢 Forte présence d\'établissements publics');
            guidance.push('Coûts de formation généralement modérés');
            guidance.push('Processus d\'admission via Parcoursup pour la plupart');
        } else if (processedData.publicRatio < 30) {
            highlights.push('🔵 Majorité d\'établissements privés');
            guidance.push('Vérifiez les frais de scolarité et aides disponibles');
            guidance.push('Examinez la reconnaissance des diplômes');
        } else {
            highlights.push('⚖️ Mix équilibré public/privé');
            guidance.push('Large choix de formations avec différents coûts');
        }
        
        // Diversity analysis
        if (totalEstablishments >= 10) {
            highlights.push('🎯 Zone riche en formations supérieures');
            guidance.push('Explorez les différentes spécialités disponibles');
            guidance.push('Possibilité de poursuites d\'études diversifiées');
        } else if (totalEstablishments >= 3) {
            highlights.push('📚 Offre d\'enseignement correcte');
            guidance.push('Vérifiez si vos domaines d\'intérêt sont couverts');
        } else {
            highlights.push('⚠️ Offre limitée dans cette zone');
            guidance.push('Considérez les zones adjacentes pour plus de choix');
            guidance.push('Pensez aux formations à distance si disponibles');
        }
        
        // Geographic considerations
        if (processedData.hasCoordinates && processedData.uniqueInstitutions > 1) {
            guidance.push('🗺️ Utilisez la carte pour localiser les campus');
            guidance.push('Évaluez les distances et transports disponibles');
        }
        
        return `
            <div class="student-guidance">
                <div class="guidance-highlights">
                    ${highlights.map(highlight => `
                        <div class="guidance-highlight">${highlight}</div>
                    `).join('')}
                </div>
                
                <div class="practical-advice">
                    <h6>💡 Conseils pratiques :</h6>
                    <ul class="guidance-list">
                        ${guidance.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="next-steps">
                    <h6>🎯 Prochaines étapes :</h6>
                    <ul class="steps-list">
                        <li>Consultez les sites web des établissements qui vous intéressent</li>
                        <li>Vérifiez les conditions d'admission et dates limites</li>
                        <li>Participez aux journées portes ouvertes</li>
                        <li>Explorez les aides financières disponibles</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Categorize institution type for grouping
     */
    static categorizeInstitutionType(type) {
        const lowerType = type.toLowerCase();
        
        for (const [keyword, category] of Object.entries(this.typeCategories)) {
            if (lowerType.includes(keyword)) {
                return category;
            }
        }
        
        // Default categorization based on common keywords
        if (lowerType.includes('université') || lowerType.includes('ufr')) {
            return 'Universités';
        } else if (lowerType.includes('école')) {
            return 'Écoles spécialisées';
        } else if (lowerType.includes('institut')) {
            return 'Instituts';
        } else if (lowerType.includes('iut')) {
            return 'IUT';
        } else if (lowerType.includes('lycée')) {
            return 'Lycées (post-bac)';
        } else {
            return 'Autres établissements';
        }
    }
    
    /**
     * Get appropriate icon for institution type
     */
    static getInstitutionIcon(type) {
        if (!type) return this.institutionIcons.default;
        
        const lowerType = type.toLowerCase();
        
        for (const [keyword, icon] of Object.entries(this.institutionIcons)) {
            if (keyword !== 'default' && lowerType.includes(keyword)) {
                return icon;
            }
        }
        
        return this.institutionIcons.default;
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