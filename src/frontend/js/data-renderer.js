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

        const [populationResponse, pcsResponse, diplomaResponse, employmentResponse] = await Promise.all([
            fetch(`${this.#apiBaseUrl}/dashboard/population?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/pcs?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/diploma?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
            fetch(`${this.#apiBaseUrl}/dashboard/employment?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`)
        ]);

        const populationData = await populationResponse.json();
        const pcsData = await pcsResponse.json();
        const diplomaData = await diplomaResponse.json();
        const employmentData = await employmentResponse.json();

        if (populationData.status === 'error') throw new Error(populationData.message || 'Erreur récupération population');
        if (pcsData.status === 'error') throw new Error(pcsData.message || 'Erreur récupération PCS');
        if (diplomaData.status === 'error') throw new Error(diplomaData.message || 'Erreur récupération diplôme');
        if (employmentData.status === 'error') throw new Error(employmentData.message || 'Erreur récupération emploi');

        return {
            population: populationData.data,
            pcs: pcsData.data,
            diploma: diplomaData.data,
            employment: employmentData.data
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