/**
 * Search Handler Module
 * Manages search functionality, results display, and entity selection
 */

export class SearchHandler {
    #elements = {};
    #apiBaseUrl = null;
    #onEntitySelected = null;
    #onClearSelection = null;
    #lastSearchResults = null;

    constructor(apiBaseUrl, elements, callbacks) {
        this.#apiBaseUrl = apiBaseUrl;
        this.#elements = {
            searchInput: elements.searchInput,
            searchButton: elements.searchButton,
            searchResults: elements.searchResults,
            selectedEntity: elements.selectedEntity,
            errorMessage: elements.errorMessage,
            loadingIndicator: elements.loadingIndicator
        };
        this.#onEntitySelected = callbacks.onEntitySelected;
        this.#onClearSelection = callbacks.onClearSelection;
        
        this.#setupEventListeners();
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
        
        // Delegate event handling for dynamically created buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-button')) {
                const button = event.target;
                const entityId = button.getAttribute('data-id');
                const entityName = button.getAttribute('data-name');
                const entityType = button.getAttribute('data-type');
                this.selectEntity(entityId, entityName, entityType);
            }
            if (event.target.classList.contains('clear-selection-btn')) {
                this.clearSelection();
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

            // Store the search results
            this.#lastSearchResults = data.results;
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
            resultsElement.classList.add('expanded');
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
        resultsElement.classList.add('expanded');
    }

    selectEntity(entityId, entityName, entityType) {
        // Hide search results
        if (this.#elements.searchResults) {
            this.#elements.searchResults.classList.remove('expanded');
        }
        
        // Show selected entity
        this.#showSelectedEntity(entityId, entityName, entityType);
        
        // Notify parent component
        if (this.#onEntitySelected) {
            this.#onEntitySelected(entityId, entityName, entityType);
        }
    }

    async #showSelectedEntity(entityId, entityName, entityType) {
        if (!this.#elements.selectedEntity) return;
        
        const typeDisplayNames = {
            'region': 'Région',
            'departement': 'Département', 
            'epci': 'Intercommunalité',
            'commune': 'Commune'
        };

        // For EPCI, get commune count from stored data
        let communeCountInfo = '';
        if (entityType === 'epci') {
            // Get commune count from the stored search result data
            const storedCommuneCount = this.getStoredEpciCommuneCount(entityId);
            if (storedCommuneCount !== null) {
                communeCountInfo = `
                    <div class="selected-entity-item">
                        <div class="selected-entity-value">Composée de ${storedCommuneCount} commune${storedCommuneCount > 1 ? 's' : ''}</div>
                    </div>
                `;
            }
        }
        
        const html = `
            <div class="selected-entity-header">
                <div class="selected-entity-main">
                    <h3 class="selected-entity-name">${entityName}</h3>
                    <span class="selected-entity-code">(${entityId})</span>
                    <span class="selected-entity-type">${typeDisplayNames[entityType] || entityType}</span>
                </div>
                <button class="clear-selection-btn">Effacer</button>
            </div>
            <div class="selected-entity-info">
                ${communeCountInfo}
                <div class="selected-entity-item selected-entity-source">
                    <div class="selected-entity-label">Source des données</div>
                    <div class="selected-entity-value">API MELODI (INSEE), ONISEP</div>
                </div>
            </div>
        `;
        
        this.#elements.selectedEntity.innerHTML = html;
        this.#elements.selectedEntity.style.display = 'block';
    }

    clearSelection() {
        // Hide selected entity
        if (this.#elements.selectedEntity) {
            this.#elements.selectedEntity.style.display = 'none';
        }
        
        // Clear search input
        if (this.#elements.searchInput) {
            this.#elements.searchInput.value = '';
        }
        
        // Notify parent component
        if (this.#onClearSelection) {
            this.#onClearSelection();
        }
    }

    getStoredEpciCommuneCount(entityId) {
        if (!this.#lastSearchResults || !this.#lastSearchResults.epcis) {
            return null;
        }
        
        const epci = this.#lastSearchResults.epcis.find(e => e.code === entityId);
        return epci && epci.commune_count !== undefined ? epci.commune_count : null;
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
            this.#elements.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        }
    }
}