import { getApiBaseUrl } from './getApiUrl.js';
import { DashboardGrid } from './grid.js';
import { createCard } from './card.js';
import { SearchHandler } from './search-handler.js';
import { DataRenderer } from './data-renderer.js';

/**
 * IR2 Dashboard Application
 * 
 * Main application for displaying French demographic data from INSEE MELODI API.
 * Features drag-and-drop card layout, search functionality, and data visualization.
 * 
 * @author Dashboard Team
 * @version 1.0.0
 */

let dashboardApp;
document.addEventListener('DOMContentLoaded', () => {
    dashboardApp = new DashboardApp();
    dashboardApp.initialize();
});

/**
 * Main Dashboard Application Class
 * Coordinates between search, data fetching, and grid rendering
 */
class DashboardApp {
    #elements = {};
    #apiBaseUrl = null;
    #searchHandler = null;
    #dataRenderer = null;
    #dashboardGrid = null;
    #cardData = {};
    #layout = [
        { id: 'card1', row: 0, col: 0 },
        { id: 'card2', row: 0, col: 1 },
        { id: 'card3', row: 1, col: 0 },
        { id: 'card4', row: 1, col: 1 }
    ];
    #persistKey = 'dashboardGridLayout';
    #cardModes = { card1: 'table', card2: 'table', card3: 'table', card4: 'table' };

    async initialize() {
        this.#apiBaseUrl = await getApiBaseUrl();
        this.#initializeElements();
        this.#loadLayout();
        this.#initializeModules();
        this.#renderGrid();
    }

    #initializeElements() {
        this.#elements = {
            searchInput: document.getElementById('searchInput'),
            searchButton: document.getElementById('searchButton'),
            searchResults: document.getElementById('searchResults'),
            selectedEntity: document.getElementById('selectedEntity'),
            errorMessage: document.getElementById('errorMessage'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            cardGrid: document.getElementById('dashboard-card-grid')
        };
    }

    #initializeModules() {
        this.#dataRenderer = new DataRenderer(this.#apiBaseUrl);
        
        this.#searchHandler = new SearchHandler(this.#apiBaseUrl, this.#elements, {
            onEntitySelected: (entityId, entityName, entityType) => {
                this.#fetchAndRenderEntityData(entityId, entityName, entityType);
            },
            onClearSelection: () => {
                this.#clearData();
            }
        });
    }

    #loadLayout() {
        const saved = sessionStorage.getItem(this.#persistKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === this.#layout.length) {
                    this.#layout = parsed;
                }
            } catch {}
        }
    }

    #saveLayout() {
        sessionStorage.setItem(this.#persistKey, JSON.stringify(this.#layout));
    }

    async #fetchAndRenderEntityData(entityId, entityName, entityType) {
        this.#showLoading(true);
        this.#hideError();
        
        try {
            const data = await this.#dataRenderer.fetchEntityData(entityId, entityType);
            
            this.#cardData = {
                card1: { entityName, entityType, data: data.population },
                card2: { entityName, entityType, data: data.pcs },
                card3: { entityName, entityType, data: data.diploma },
                card4: { entityName, entityType, data: data.employment }
            };
            
            this.#renderGrid();
        } catch (error) {
            this.#cardData = {};
            this.#renderGrid();
            this.#showError(`Erreur: ${error.message}`);
        } finally {
            this.#showLoading(false);
        }
    }

    #clearData() {
        this.#cardData = {};
        this.#renderGrid();
    }

    #renderGrid() {
        const cardGrid = this.#elements.cardGrid;
        if (!cardGrid) return;
        
        cardGrid.innerHTML = '';
        
        if (!this.#cardData.card1 && !this.#cardData.card2 && !this.#cardData.card3 && !this.#cardData.card4) {
            return;
        }
        
        const cardConfigs = {
            card1: { title: "Populations par tranches d'âge", description: '', renderer: 'population' },
            card2: { title: 'Populations par catégorie socio-professionnelle', description: '', renderer: 'pcs' },
            card3: { title: "Populations par niveau d'éducation", description: 'Données disponibles uniquement pour l\'année 2022.', renderer: 'diploma' },
            card4: { title: "Données d'emploi", description: '', renderer: 'employment' }
        };
        
        const cards = {};
        for (const cardId of ['card1', 'card2', 'card3', 'card4']) {
            const cardInfo = this.#cardData[cardId];
            const config = cardConfigs[cardId];
            const mode = this.#cardModes[cardId] || 'table';
            
            let contentHtml = '';
            if (mode === 'table') {
                contentHtml = this.#renderTableContent(config.renderer, cardInfo);
            } else {
                contentHtml = this.#dataRenderer.renderGraphPlaceholder();
            }
            
            cards[cardId] = createCard({
                id: cardId,
                title: config.title,
                description: config.description,
                contentHtml,
                mode,
                onToggleMode: () => this.#handleModeToggle(cardId)
            });
        }
        
        this.#dashboardGrid = new DashboardGrid(cardGrid, cards, this.#layout, layout => {
            this.#layout = layout;
            this.#saveLayout();
        });
    }

    #renderTableContent(rendererType, cardInfo) {
        if (!cardInfo || !cardInfo.data) {
            return `<div class="no-data-message"><p>Aucune donnée disponible.</p></div>`;
        }
        
        switch (rendererType) {
            case 'population':
                return this.#dataRenderer.renderPopulationTable(cardInfo.data);
            case 'pcs':
                return this.#dataRenderer.renderPCSTable(cardInfo.data);
            case 'diploma':
                return this.#dataRenderer.renderDiplomaTable(cardInfo.data);
            case 'employment':
                return this.#dataRenderer.renderEmploymentTable(cardInfo.data);
            default:
                return `<div class="no-data-message"><p>Type de données non reconnu.</p></div>`;
        }
    }

    #handleModeToggle(cardId) {
        // Add fade animation
        const cardElement = document.getElementById(cardId);
        if (cardElement) {
            cardElement.classList.add('changing-mode');
            setTimeout(() => {
                cardElement.classList.remove('changing-mode');
            }, 400);
        }
        
        // Toggle mode
        this.#cardModes[cardId] = this.#cardModes[cardId] === 'table' ? 'graph' : 'table';
        
        // Re-render at the fade midpoint to sync with animation
        setTimeout(() => {
            this.#renderGrid();
        }, 200);
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
