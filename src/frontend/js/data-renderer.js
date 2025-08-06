/**
 * Data Renderer Module
 * Handles data fetching and table rendering for dashboard cards
 */

export class DataRenderer {
    #apiBaseUrl = null;

    constructor(apiBaseUrl) {
        this.#apiBaseUrl = apiBaseUrl;
    }

    async fetchEntityData(entityId, entityType) {
        if (!entityId || !entityType) {
            throw new Error('Données d\'entité manquantes');
        }

        const [populationResponse, pcsResponse, diplomaResponse, employmentResponse, higherEducationResponse, formationsResponse] = await Promise.all([
            fetch(`${this.#apiBaseUrl}/dashboard/population?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/pcs?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/diploma?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/employment?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/higher_education?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/formations?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`)
        ]);

        const populationData = await populationResponse.json();
        const pcsData = await pcsResponse.json();
        const diplomaData = await diplomaResponse.json();
        const employmentData = await employmentResponse.json();
        const higherEducationData = await higherEducationResponse.json();
        const formationsData = await formationsResponse.json();

        if (populationData.status === 'error') throw new Error(populationData.message || 'Erreur récupération population');
        if (pcsData.status === 'error') throw new Error(pcsData.message || 'Erreur récupération PCS');
        if (diplomaData.status === 'error') throw new Error(diplomaData.message || 'Erreur récupération diplôme');
        if (employmentData.status === 'error') throw new Error(employmentData.message || 'Erreur récupération emploi');
        if (higherEducationData.status === 'error') throw new Error(higherEducationData.message || 'Erreur récupération enseignement supérieur');
        if (formationsData.status === 'error') throw new Error(formationsData.message || 'Erreur récupération formations');

        return {
            population: populationData.data,
            pcs: pcsData.data,
            diploma: diplomaData.data,
            employment: employmentData.data,
            higher_education: higherEducationData.data,
            formations: formationsData.data
        };
    }

    renderPopulationTable(data) {
        if (!data || Object.keys(data).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée disponible.</p></div>`;
        }

        const years = Object.keys(data).sort((a, b) => b - a);
        const ageGroupOrder = ['Y_LT15', 'Y15T24', 'Y25T39', '_T'];
        const ageGroups = ageGroupOrder.filter(age => years.some(year => data[year][age] !== undefined));
        const ageGroupMeanings = {
            'Y_LT15': 'Moins de 15 ans',
            'Y15T24': '15-24 ans',
            'Y25T39': '25-39 ans',
            '_T': 'Population totale'
        };

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Année</th>
                            ${ageGroups.map(age => `<th>${ageGroupMeanings[age] || age}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(year => `
                            <tr>
                                <td>${year}</td>
                                ${ageGroups.map(age => {
                                    const value = data[year][age] ?? '—';
                                    return `<td>${value}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPCSTable(data) {
        if (!data || Object.keys(data).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée PCS disponible.</p></div>`;
        }

        const years = Object.keys(data).sort((a, b) => b - a);
        const pcsOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '_T'];
        const pcsGroups = pcsOrder.filter(pcs => years.some(year => data[year]["Y_GE15"][pcs] !== undefined));
        const pcsGroupMeanings = {
            '1': 'Agriculteurs',
            '2': 'Artisans',
            '3': 'Cadres',
            '4': 'Employés',
            '5': 'Ouvriers',
            '6': 'Retraités',
            '7': 'Sans activité',
            '8': 'Autres',
            '_T': 'Total'
        };

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Année</th>
                            ${pcsGroups.map(pcs => `<th>${pcsGroupMeanings[pcs] || pcs}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(year => `
                            <tr>
                                <td>${year}</td>
                                ${pcsGroups.map(pcs => {
                                    const value = data[year]["Y_GE15"][pcs] ?? '—';
                                    return `<td>${value}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDiplomaTable(data) {
        if (!data || !data['2022']) {
            return `<div class="no-data-message"><p>Aucune donnée disponible pour l'année 2022.</p></div>`;
        }

        const year = '2022';
        const diplomaGroupOrder = [
            '001T100_RP', '200_RP', '300_RP', '350T351_RP', '500_RP', '600_RP', '700_RP'
        ];
        const diplomaGroupMeanings = {
            '001T100_RP': 'Aucun diplôme',
            '200_RP': 'BEPC/Brevet',
            '300_RP': 'CAP/BEP',
            '350T351_RP': 'Baccalauréat',
            '500_RP': 'BAC+2',
            '600_RP': 'BAC+3/4',
            '700_RP': 'BAC+5 et plus'
        };
        const diplomaGroups = diplomaGroupOrder.filter(diploma => data[year][diploma] !== undefined);

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Année</th>
                            ${diplomaGroups.map(diploma => `<th>${diplomaGroupMeanings[diploma] || diploma}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${year}</td>
                            ${diplomaGroups.map(diploma => {
                                const value = data[year][diploma];
                                return `<td>${value !== undefined ? value : '—'}</td>`;
                            }).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    renderEmploymentTable(data) {
        if (!data || Object.keys(data).length === 0) {
            return `<div class="no-data-message"><p>Aucune donnée d'emploi disponible.</p></div>`;
        }

        const years = Object.keys(data).sort((a, b) => b - a);
        const employmentFields = [
            'population_15_64', 'nombre_actifs', 'nombre_actifs_ayant_emploi', 'nombre_chomeurs', 'taux_emploi', 'taux_chomage'
        ];
        const fieldMeanings = {
            'population_15_64': 'Population 15-64 ans',
            'nombre_actifs': 'Nombre d\'actifs',
            'nombre_actifs_ayant_emploi': 'Actifs ayant un emploi',
            'nombre_chomeurs': 'Nombre de chômeurs',
            'taux_emploi': 'Taux d\'emploi (%)',
            'taux_chomage': 'Taux de chômage (%)'
        };

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Année</th>
                            ${employmentFields.map(field => `<th>${fieldMeanings[field] || field}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(year => `
                            <tr>
                                <td>${year}</td>
                                ${employmentFields.map(field => {
                                    const value = data[year][field];
                                    return `<td>${value !== undefined ? value : '—'}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderONISEPStatusTable(data) {
        if (!data || !data.total_etablissements) {
            return `<div class="no-data-message"><p>Aucune donnée ONISEP disponible.</p></div>`;
        }
        
        const total = data.total_etablissements;
        const statusCounts = data.status_counts || {};
        
        // Calculate percentages
        const statusWithPercentages = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);
        
        return `
            <div style="text-align: center; margin-bottom: 16px; padding: 12px; background: rgba(33, 159, 172, 0.05); border-radius: 8px;">
                <strong style="color: #219fac; font-size: 16px;">Total: ${total} établissements</strong>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Statut</th>
                            <th>Nombre</th>
                            <th>Pourcentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statusWithPercentages.map(item => `
                            <tr>
                                <td>${item.status}</td>
                                <td>${item.count}</td>
                                <td>${item.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderONISEPTypeTable(data) {
        if (!data || !data.type_counts) {
            return `<div class="no-data-message"><p>Aucune donnée ONISEP disponible.</p></div>`;
        }
        
        const typeCounts = data.type_counts;
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        
        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type d'établissement</th>
                            <th>Nombre</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTypes.map(([type, count]) => `
                            <tr>
                                <td>${type}</td>
                                <td>${count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderFormationsOverviewTable(data) {
        if (!data || !data.total_formations) {
            return `<div class="no-data-message"><p>Aucune donnée de formations disponible.</p></div>`;
        }
        
        const total = data.total_formations;
        const levelCounts = data.level_counts || {};
        const statusCounts = data.status_counts || {};
        
        // Calculate percentages for levels
        const levelsWithPercentages = Object.entries(levelCounts).map(([level, count]) => ({
            level,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);
        
        // Calculate percentages for status
        const statusWithPercentages = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);
        
        return `
            <div style="text-align: center; margin-bottom: 16px; padding: 12px; background: rgba(33, 159, 172, 0.05); border-radius: 8px;">
                <strong style="color: #219fac; font-size: 16px;">Total: ${total} formations</strong>
            </div>
            
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="background-color: #f9b140; color: white; font-weight: bold;">Niveau</th>
                            <th style="background-color: #219fac; color: white;">Nombre</th>
                            <th style="background-color: #219fac; color: white;">%</th>
                            <th style="background-color: #f9b140; color: white; font-weight: bold;">Statut</th>
                            <th style="background-color: #219fac; color: white;">Nombre</th>
                            <th style="background-color: #219fac; color: white;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Math.max(levelsWithPercentages.length, statusWithPercentages.length) > 0 ? 
                            Array.from({length: Math.max(levelsWithPercentages.length, statusWithPercentages.length)}).map((_, index) => {
                                const levelItem = levelsWithPercentages[index] || { level: '', count: '', percentage: '' };
                                const statusItem = statusWithPercentages[index] || { status: '', count: '', percentage: '' };
                                return `
                                    <tr>
                                        <td style="background-color: #f8f9fa; font-weight: bold;">${levelItem.level}</td>
                                        <td>${levelItem.count}</td>
                                        <td>${levelItem.percentage}${levelItem.percentage ? '%' : ''}</td>
                                        <td style="background-color: #f8f9fa; font-weight: bold;">${statusItem.status}</td>
                                        <td>${statusItem.count}</td>
                                        <td>${statusItem.percentage}${statusItem.percentage ? '%' : ''}</td>
                                    </tr>
                                `;
                            }).join('') : ''
                        }
                    </tbody>
                </table>
            </div>
        `;
    }

    renderFormationsDetailsTable(data) {
        if (!data || !data.type_counts) {
            return `<div class="no-data-message"><p>Aucune donnée de formations disponible.</p></div>`;
        }
        
        const typeCounts = data.type_counts;
        const total = data.total_formations || 0;
        
        // Calculate percentages for formation types
        const typesWithPercentages = Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);
        
        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type de formation</th>
                            <th>Nombre</th>
                            <th>Pourcentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${typesWithPercentages.map(item => `
                            <tr>
                                <td>${item.type}</td>
                                <td>${item.count}</td>
                                <td>${item.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderGraphPlaceholder() {
        return `
            <div class="graph-placeholder">
                <div class="graph-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </div>
                <p>Chart view coming soon</p>
                <small>This feature will display interactive charts and visualizations</small>
            </div>
        `;
    }
}