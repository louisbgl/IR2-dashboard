import { getApiBaseUrl } from './getApiUrl.js';

/**
 * Main application script for the IR2 Dashboard
 */
let dashboardApp;

document.addEventListener('DOMContentLoaded', () => {
    dashboardApp = new DashboardApp();
    dashboardApp.initialize();
});

class DashboardApp {
    #elements = {
        searchInput: null,
        searchButton: null,
        searchResults: null,
        errorMessage: null,
        loadingIndicator: null,
        card1: null,
        card2: null,
        card3: null
    };

    #currentEntityData = {
        id: null,
        name: null,
        type: null,
        card1Data: null,
        card2Data: null,
        card3Data: null
    };

    #apiBaseUrl = null;

    async initialize() {
        this.#apiBaseUrl = await getApiBaseUrl();
        console.log('API base URL set to:', this.#apiBaseUrl);

        this.#elements.searchInput = document.getElementById('searchInput');
        this.#elements.searchButton = document.getElementById('searchButton');
        this.#elements.searchResults = document.getElementById('searchResults');
        this.#elements.errorMessage = document.getElementById('errorMessage');
        this.#elements.loadingIndicator = document.getElementById('loadingIndicator');
        this.#elements.card1 = document.getElementById('card1');
        this.#elements.card2 = document.getElementById('card2');
        this.#elements.card3 = document.getElementById('card3');

        this.#setupEventListeners();
        console.log('Dashboard application initialized');
    }

    #setupEventListeners() {
        if (this.#elements.searchButton) {
            this.#elements.searchButton.addEventListener('click', () => this.handleSearch());
        }

        if (this.#elements.searchInput) {
            this.#elements.searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') this.handleSearch();
            });
        }

        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-button')) {
                const button = event.target;
                const entityId = button.getAttribute('data-id');
                const entityName = button.getAttribute('data-name');
                const entityType = button.getAttribute('data-type');
                this.selectEntity(entityId, entityName, entityType);
            }
        });
    }

    async handleSearch() {
        const query = this.#elements.searchInput.value.trim();
        if (!query) {
            this.#showError('Veuillez entrer un terme de recherche');
            return;
        }

        this.#showLoading(true);
        this.#hideError();

        try {
            const response = await fetch(`${this.#apiBaseUrl}/dashboard/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.status === 'error') throw new Error(data.message || 'Erreur pendant la recherche');

            this.#displaySearchResults(data.results, query);
        } catch (error) {
            console.error('Search error:', error);
            this.#showError(`Erreur de recherche: ${error.message}`);
        } finally {
            this.#showLoading(false);
        }
    }

    #displaySearchResults(results, query) {
        const resultsElement = this.#elements.searchResults;

        const totalResults = results.communes.length + results.epcis.length + results.departements.length + results.regions.length;
        if (totalResults === 0) {
            resultsElement.innerHTML = `<p>Aucun résultat trouvé pour "${query}"</p>`;
            return;
        }

        let html = `<h3>Résultats pour "${query}" (${totalResults} total)</h3>`;

        const buildSection = (title, items, type) => {
            if (items.length === 0) return '';
            let section = `<div class="result-section"><h4>${title} (${items.length})</h4><div class="result-list-container"><ul class="result-list">`;
            items.forEach(item => {
                section += `
                    <li class="result-item result-${type}">
                        <div class="result-info">
                            <span class="result-name">${item.nom}</span>
                            <span class="result-code">${item.code}</span>
                        </div>
                        <button class="select-button" 
                            data-id="${item.code}" 
                            data-name="${item.nom}" 
                            data-type="${type}">
                            Sélectionner
                        </button>
                    </li>`;
            });
            section += `</ul></div></div>`;
            return section;
        };

        html += buildSection('Régions', results.regions, 'region');
        html += buildSection('Départements', results.departements, 'departement');
        html += buildSection('Intercommunalités', results.epcis, 'epci');
        html += buildSection('Communes', results.communes, 'commune');

        resultsElement.innerHTML = html;
    }

    #showError(message) {
        if (this.#elements.errorMessage) {
            this.#elements.errorMessage.textContent = message;
            this.#elements.errorMessage.style.display = 'block';
        }
    }

    #hideError() {
        if (this.#elements.errorMessage) {
            this.#elements.errorMessage.style.display = 'none';
        }
    }

    #showLoading(isLoading) {
        if (this.#elements.loadingIndicator) {
            this.#elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
    }

    selectEntity(entityId, entityName, entityType) {
        console.log(`Selected entity: ${entityName} (${entityId}, type: ${entityType})`);

        this.#currentEntityData = {
            id: entityId,
            name: entityName,
            type: entityType,
            card1Data: null,
            card2Data: null,
            card3Data: null
        };

        if (this.#elements.searchResults) {
            this.#elements.searchResults.innerHTML = '';
        }

        this.fetchEntityData(entityId, entityName, entityType);
    }

    async fetchEntityData(entityId, entityName, entityType) {
        if (!entityId || !entityType) {
            this.#showError('Données d\'entité manquantes');
            return;
        }

        this.#showLoading(true);
        this.#hideError();

        try {
            const [
                populationResponse,
                pcsResponse,
                diplomaResponse
            ] = await Promise.all([
                fetch(`${this.#apiBaseUrl}/dashboard/population?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
                fetch(`${this.#apiBaseUrl}/dashboard/pcs?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
                fetch(`${this.#apiBaseUrl}/dashboard/diploma?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`)
            ]);

            const populationData = await populationResponse.json();
            const pcsData = await pcsResponse.json();
            const diplomaData = await diplomaResponse.json();

            if (populationData.status === 'error') {
                throw new Error(populationData.message || 'Erreur récupération population');
            }
            console.log('Successfully fetched population data.');
            if (pcsData.status === 'error') {
                throw new Error(pcsData.message || 'Erreur récupération PCS');
            }
            console.log('Successfully fetched PCS data.');
            if (diplomaData.status === 'error') {
                throw new Error(diplomaData.message || 'Erreur récupération diplôme');
            }
            console.log('Successfully fetched diploma data.');

            this.#currentEntityData.card1Data = populationData.data;
            this.#currentEntityData.card2Data = pcsData.data;
            this.#currentEntityData.card3Data = diplomaData.data;

            this.displayAllData();
        } catch (error) {
            console.error('Data fetch error:', error);
            this.#showError(`Erreur: ${error.message}`);

            if (this.#elements.card1) {
                this.#elements.card1.innerHTML = '';
                this.#elements.card1.style.display = 'none';
            }

            if (this.#elements.card2) {
                this.#elements.card2.innerHTML = '';
                this.#elements.card2.style.display = 'none';
            }

            if (this.#elements.card3) {
                this.#elements.card3.innerHTML = '';
                this.#elements.card3.style.display = 'none';
            }
        } finally {
            this.#showLoading(false);
        }
    }

    displayAllData() {
        this.displayCard1();
        this.displayCard2();
        this.displayCard3();
    }

    displayCard1() {
        const cardElement = this.#elements.card1;
        if (!cardElement || !this.#currentEntityData) return;

        const { name, type, card1Data } = this.#currentEntityData;

        const typeLabels = {
            region: 'la région',
            departement: 'le département',
            epci: 'l\'intercommunalité',
            commune: 'la commune'
        };
        const typeLabel = typeLabels[type] || type;

        if (!card1Data || Object.keys(card1Data).length === 0) {
            cardElement.innerHTML = `
                <h3>Populations par tranches d'âge pour ${typeLabel} ${name}</h3>
                <div class="no-data-message">
                    <p>Aucune donnée disponible.</p>
                </div>`;
            cardElement.style.display = 'block';
            return;
        }

        const years = Object.keys(card1Data).sort((a, b) => b - a);
        const ageGroupOrder = ['Y_LT15', 'Y15T24', 'Y25T39', '_T'];
        const ageGroups = ageGroupOrder.filter(age => 
            years.some(year => card1Data[year][age] !== undefined)
        );

        const ageGroupMeanings = {
            'Y_LT15': 'Moins de 15 ans',
            'Y15T24': '15-24 ans',
            'Y25T39': '25-39 ans',
            '_T': 'Total'
        }

        let html = `
            <div class="table-card">
                <h3>Populations par tranches d'âge pour ${typeLabel} ${name}</h3>
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
                                        const value = card1Data[year][age] ?? '—';
                                        return `<td>${value}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <small class="data-note">Source : API MELODI, INSEE</small>
                </div>
            </div>
        `;

        cardElement.innerHTML = html;
        cardElement.style.display = 'block';
    }

    displayCard2() {
        const cardElement = this.#elements.card2;
        if (!cardElement || !this.#currentEntityData) return;

        const { name, type, card2Data } = this.#currentEntityData;

        const typeLabels = {
            region: 'la région',
            departement: 'le département',
            epci: 'l\'intercommunalité',
            commune: 'la commune'
        };
        const typeLabel = typeLabels[type] || type;

        if (!card2Data || Object.keys(card2Data).length === 0) {
            cardElement.innerHTML = `
                <h3>Populations par catégorie socio-professionnelle pour ${typeLabel} ${name}</h3>
                <div class="no-data-message">
                    <p>Aucune donnée PCS disponible.</p>
                </div>`;
            cardElement.style.display = 'block';
            return;
        }

        const years = Object.keys(card2Data).sort((a, b) => b - a);
        const pcsOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '_T'];
        const pcsGroups = pcsOrder.filter(pcs => 
            years.some(year => card2Data[year]["Y_GE15"][pcs] !== undefined)
        );

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
        }

        let html = `
            <div class="table-card">
                <h3>Populations par catégorie socio-professionnelle pour ${typeLabel} ${name}</h3>
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
                                        const value = card2Data[year]["Y_GE15"][pcs] ?? '—';
                                        return `<td>${value}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <small class="data-note">Source : API MELODI, INSEE</small>
                </div>
            </div>
        `;

        cardElement.innerHTML = html;
        cardElement.style.display = 'block';
    }

    displayCard3() {
        const cardElement = this.#elements.card3;
        if (!cardElement || !this.#currentEntityData) return;

        const { name, type, card3Data } = this.#currentEntityData;

        const typeLabels = {
            region: 'la région',
            departement: 'le département',
            epci: 'l\'intercommunalité',
            commune: 'la commune'
        };
        const typeLabel = typeLabels[type] || type;

        if (!card3Data || !card3Data['2022']) {
            cardElement.innerHTML = `
                <h3>Populations par niveau d'éducation pour ${typeLabel} ${name}</h3>
                <div class="no-data-message">
                    <p>Aucune donnée disponible pour l'année 2022.</p>
                </div>`;
            cardElement.style.display = 'block';
            return;
        }

        const year = '2022';
        const diplomaGroupOrder = [
            '001T100_RP', // Aucun diplôme
            '200_RP',     // BEPC/Brevet
            '300_RP',     // CAP/BEP
            '350T351_RP', // Baccalauréat
            '500_RP',     // BAC+2
            '600_RP',     // BAC+3/4
            '700_RP'      // BAC+5 et plus
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

        const diplomaGroups = diplomaGroupOrder.filter(diploma => card3Data[year][diploma] !== undefined);

        let html = `
            <div class="table-card">
                <h3>Populations par niveau d'éducation pour ${typeLabel} ${name}</h3>
                <p class="data-note">Données disponibles uniquement pour l'année 2022.</p>
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
                                    const value = card3Data[year][diploma];
                                    return `<td>${value !== undefined ? value : '—'}</td>`;
                                }).join('')}
                            </tr>
                        </tbody>
                    </table>
                    <small class="data-note">Source : API MELODI, INSEE</small>
                </div>
            </div>
        `;

        cardElement.innerHTML = html;
        cardElement.style.display = 'block';
    }
}
