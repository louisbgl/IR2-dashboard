/**
 * MapRenderer - Unified geographic visualization for all location data
 * Aggregates coordinates from all APIs and displays them on an interactive map
 */

export class MapRenderer {
    
    // Map instance reference
    static mapInstance = null;
    
    // Layer groups for different data types
    static layerGroups = {};
    
    // Marker icons and colors
    static markerConfig = {
        formations: {
            icon: '🎓',
            color: '#3498db',
            category: 'Formations'
        },
        higher_education: {
            icon: '🏛️',
            color: '#9b59b6',
            category: 'Enseignement supérieur'
        },
        employment: {
            icon: '💼',
            color: '#27ae60',
            category: 'Services emploi'
        },
        default: {
            icon: '📍',
            color: '#95a5a6',
            category: 'Autres'
        }
    };
    
    // Status-based colors for institutions
    static statusColors = {
        'public': '#27ae60',
        'privé sous contrat': '#3498db',
        'privé hors contrat': '#f39c12',
        'privé': '#e67e22',
        'privé reconnu par l\'État': '#9b59b6'
    };
    
    /**
     * Render map container with all available location data
     */
    static render(allApiData, entityInfo) {
        // Aggregate coordinates from all API responses
        const coordinatesData = this.aggregateAllCoordinates(allApiData);
        
        if (coordinatesData.length === 0) {
            return `
                <div class="no-data-message">
                    <h5>🗺️ Aucune donnée de localisation disponible</h5>
                    <p>Les services et établissements de cette zone ne sont pas géolocalisés dans nos données.</p>
                    <p><strong>Suggestion :</strong> Consultez les sections détaillées ci-dessus pour plus d'informations sur les services disponibles.</p>
                </div>
            `;
        }
        
        const stats = this.calculateMapStats(coordinatesData);
        
        return `
            <div class="map-data-container">
                <div class="map-overview">
                    <h4>🗺️ Localisation des services et établissements</h4>
                    <div class="map-stats">
                        ${Object.entries(stats).map(([type, count]) => 
                            count > 0 ? `<span class="stat-item">${count} ${this.markerConfig[type]?.category || type}</span>` : ''
                        ).filter(item => item).join('')}
                    </div>
                </div>
                
                <div class="map-controls">
                    <div class="layer-toggles">
                        <h6>Afficher :</h6>
                        ${Object.entries(stats).map(([type, count]) => {
                            if (count === 0) return '';
                            const config = this.markerConfig[type] || this.markerConfig.default;
                            return `
                                <label class="layer-toggle">
                                    <input type="checkbox" id="toggle-${type}" checked>
                                    <span class="toggle-icon" style="color: ${config.color}">${config.icon}</span>
                                    <span class="toggle-label">${config.category} (${count})</span>
                                </label>
                            `;
                        }).filter(item => item).join('')}
                    </div>
                    
                    <div class="map-search">
                        <input type="text" placeholder="Rechercher un établissement..." 
                               id="map-search-input" class="search-input">
                        <div id="search-results-map" class="search-results-map"></div>
                    </div>
                </div>
                
                <div class="map-container">
                    <div id="leaflet-map" class="interactive-map"></div>
                    
                    <div class="map-legend">
                        <h6>Légende</h6>
                        <div class="legend-items">
                            <div class="legend-item">
                                <div class="legend-marker public" style="background: ${this.statusColors.public}"></div>
                                <span>Public</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-marker private-contract" style="background: ${this.statusColors['privé sous contrat']}"></div>
                                <span>Privé sous contrat</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-marker private-independent" style="background: ${this.statusColors['privé hors contrat']}"></div>
                                <span>Privé hors contrat</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="map-summary">
                    <div class="summary-section">
                        <h6>📊 Analyse géographique</h6>
                        ${this.renderGeographicAnalysis(coordinatesData, entityInfo)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Aggregate coordinates from all API data sources
     */
    static aggregateAllCoordinates(allApiData) {
        const coordinates = [];
        
        // Process formations data (richest coordinate data)
        if (allApiData.formations?.data?.coordinates) {
            allApiData.formations.data.coordinates.forEach(item => {
                if (this.isValidCoordinate(item.latitude, item.longitude)) {
                    coordinates.push({
                        type: 'formations',
                        name: item.etablissement || 'Établissement de formation',
                        details: item.formation || 'Formation non spécifiée',
                        level: item.niveau || '',
                        status: item.statut || 'Statut non spécifié',
                        formationType: item.type || '',
                        latitude: parseFloat(item.latitude),
                        longitude: parseFloat(item.longitude),
                        category: 'Formation',
                        searchText: `${item.etablissement} ${item.formation} ${item.niveau} ${item.type}`.toLowerCase()
                    });
                }
            });
        }
        
        // Process higher education data if coordinates available
        if (allApiData.higher_education?.data?.coordinates) {
            allApiData.higher_education.data.coordinates.forEach(item => {
                if (this.isValidCoordinate(item.latitude, item.longitude)) {
                    coordinates.push({
                        type: 'higher_education',
                        name: item.nom || 'Établissement d\'enseignement supérieur',
                        details: item.type || 'Établissement supérieur',
                        status: item.statut || 'Statut non spécifié',
                        latitude: parseFloat(item.latitude),
                        longitude: parseFloat(item.longitude),
                        category: 'Enseignement supérieur',
                        searchText: `${item.nom} ${item.type}`.toLowerCase()
                    });
                }
            });
        }
        
        // Could add other API coordinate data here in the future
        // (employment services, job centers, etc. if they provide coordinates)
        
        return coordinates;
    }
    
    /**
     * Calculate statistics for map display
     */
    static calculateMapStats(coordinates) {
        const stats = {
            formations: 0,
            higher_education: 0,
            employment: 0,
            other: 0
        };
        
        coordinates.forEach(coord => {
            if (stats.hasOwnProperty(coord.type)) {
                stats[coord.type]++;
            } else {
                stats.other++;
            }
        });
        
        return stats;
    }
    
    /**
     * Initialize Leaflet map with markers and interactivity
     */
    static initializeMap(coordinates, entityInfo) {
        // Clear existing map if any
        if (this.mapInstance) {
            this.mapInstance.remove();
            this.mapInstance = null;
        }
        
        // Default center (Lyon, France) - could be made dynamic based on entity
        let centerLat = 45.7640;
        let centerLng = 4.8357;
        let zoomLevel = 11;
        
        // If we have coordinates, center on them
        if (coordinates.length > 0) {
            const avgLat = coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / coordinates.length;
            const avgLng = coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / coordinates.length;
            centerLat = avgLat;
            centerLng = avgLng;
            
            // Adjust zoom based on coordinate spread
            const latRange = Math.max(...coordinates.map(c => c.latitude)) - Math.min(...coordinates.map(c => c.latitude));
            const lngRange = Math.max(...coordinates.map(c => c.longitude)) - Math.min(...coordinates.map(c => c.longitude));
            const maxRange = Math.max(latRange, lngRange);
            
            if (maxRange < 0.01) zoomLevel = 15;
            else if (maxRange < 0.05) zoomLevel = 13;
            else if (maxRange < 0.1) zoomLevel = 12;
            else zoomLevel = 10;
        }
        
        // Initialize map
        this.mapInstance = L.map('leaflet-map').setView([centerLat, centerLng], zoomLevel);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.mapInstance);
        
        // Create layer groups
        this.layerGroups = {
            formations: L.layerGroup(),
            higher_education: L.layerGroup(),
            employment: L.layerGroup()
        };
        
        // Add all layers to map initially
        Object.values(this.layerGroups).forEach(layer => layer.addTo(this.mapInstance));
        
        // Add markers
        this.addMarkersToMap(coordinates);
        
        // Setup controls
        this.setupMapControls();
        
        // Setup search functionality
        this.setupMapSearch(coordinates);
        
        return this.mapInstance;
    }
    
    /**
     * Add markers to appropriate layers
     */
    static addMarkersToMap(coordinates) {
        coordinates.forEach(coord => {
            const marker = this.createCustomMarker(coord);
            
            // Add to appropriate layer group
            if (this.layerGroups[coord.type]) {
                marker.addTo(this.layerGroups[coord.type]);
            } else {
                marker.addTo(this.mapInstance);
            }
        });
    }
    
    /**
     * Create custom marker with popup
     */
    static createCustomMarker(coord) {
        const config = this.markerConfig[coord.type] || this.markerConfig.default;
        const statusColor = this.statusColors[coord.status] || config.color;
        
        // Create marker with custom icon
        const marker = L.marker([coord.latitude, coord.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `
                    <div class="marker-icon" style="background-color: ${statusColor}; border-color: ${statusColor}">
                        ${config.icon}
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        });
        
        // Create detailed popup
        const popupContent = this.createPopupContent(coord);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        return marker;
    }
    
    /**
     * Create popup content for marker
     */
    static createPopupContent(coord) {
        const config = this.markerConfig[coord.type] || this.markerConfig.default;
        
        let content = `
            <div class="map-popup">
                <div class="popup-header">
                    <div class="popup-icon" style="color: ${config.color}">${config.icon}</div>
                    <div class="popup-category">${coord.category}</div>
                </div>
                <div class="popup-name">${coord.name}</div>
                <div class="popup-details">${coord.details}</div>
        `;
        
        // Add type-specific information
        if (coord.type === 'formations') {
            if (coord.level) content += `<div class="popup-level">📊 Niveau : ${coord.level}</div>`;
            if (coord.formationType) content += `<div class="popup-type">📚 Type : ${coord.formationType}</div>`;
        }
        
        // Add status information
        if (coord.status && coord.status !== 'Statut non spécifié') {
            const statusColor = this.statusColors[coord.status] || '#666';
            content += `<div class="popup-status" style="color: ${statusColor}">🏢 ${coord.status}</div>`;
        }
        
        // Add coordinates
        content += `
                <div class="popup-coordinates">
                    📍 ${coord.latitude.toFixed(4)}°N, ${coord.longitude.toFixed(4)}°E
                </div>
            </div>
        `;
        
        return content;
    }
    
    /**
     * Setup map layer controls
     */
    static setupMapControls() {
        // Layer toggle functionality
        Object.keys(this.layerGroups).forEach(layerType => {
            const checkbox = document.getElementById(`toggle-${layerType}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const layer = this.layerGroups[layerType];
                    if (e.target.checked) {
                        layer.addTo(this.mapInstance);
                    } else {
                        this.mapInstance.removeLayer(layer);
                    }
                });
            }
        });
    }
    
    /**
     * Setup map search functionality
     */
    static setupMapSearch(coordinates) {
        const searchInput = document.getElementById('map-search-input');
        const searchResults = document.getElementById('search-results-map');
        
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                if (query.length < 2) {
                    searchResults.innerHTML = '';
                    searchResults.style.display = 'none';
                    return;
                }
                
                const matches = coordinates.filter(coord => 
                    coord.searchText.includes(query)
                ).slice(0, 5); // Limit to 5 results
                
                if (matches.length > 0) {
                    searchResults.innerHTML = matches.map(coord => `
                        <div class="search-result-item" data-lat="${coord.latitude}" data-lng="${coord.longitude}">
                            <div class="result-icon" style="color: ${this.markerConfig[coord.type]?.color || '#666'}">
                                ${this.markerConfig[coord.type]?.icon || '📍'}
                            </div>
                            <div class="result-info">
                                <div class="result-name">${coord.name}</div>
                                <div class="result-details">${coord.details}</div>
                            </div>
                        </div>
                    `).join('');
                    
                    searchResults.style.display = 'block';
                    
                    // Add click handlers for search results
                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const lat = parseFloat(item.dataset.lat);
                            const lng = parseFloat(item.dataset.lng);
                            this.mapInstance.setView([lat, lng], 16);
                            searchResults.style.display = 'none';
                            searchInput.value = '';
                        });
                    });
                } else {
                    searchResults.innerHTML = '<div class="no-results">Aucun résultat trouvé</div>';
                    searchResults.style.display = 'block';
                }
            });
            
            // Hide results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Render geographic analysis
     */
    static renderGeographicAnalysis(coordinates, entityInfo) {
        if (coordinates.length === 0) {
            return `<p>Aucune donnée géographique à analyser.</p>`;
        }
        
        // Calculate geographic spread
        const lats = coordinates.map(c => c.latitude);
        const lngs = coordinates.map(c => c.longitude);
        
        const latRange = Math.max(...lats) - Math.min(...lats);
        const lngRange = Math.max(...lngs) - Math.min(...lngs);
        
        // Calculate approximate distances
        const maxDistanceKm = this.calculateDistance(
            Math.min(...lats), Math.min(...lngs),
            Math.max(...lats), Math.max(...lngs)
        );
        
        // Analyze distribution
        let distributionAnalysis = '';
        if (maxDistanceKm < 5) {
            distributionAnalysis = '🎯 Services concentrés dans un rayon restreint';
        } else if (maxDistanceKm < 15) {
            distributionAnalysis = '📍 Services répartis sur la zone urbaine';
        } else {
            distributionAnalysis = '🗺️ Services dispersés sur un large territoire';
        }
        
        // Count unique locations
        const uniqueLocations = new Set(coordinates.map(c => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`)).size;
        
        return `
            <div class="geographic-analysis">
                <div class="analysis-item">
                    <strong>📏 Étendue géographique :</strong> ~${maxDistanceKm.toFixed(1)} km
                </div>
                <div class="analysis-item">
                    <strong>📍 Distribution :</strong> ${distributionAnalysis}
                </div>
                <div class="analysis-item">
                    <strong>🏢 Lieux uniques :</strong> ${uniqueLocations} emplacement${uniqueLocations > 1 ? 's' : ''} différent${uniqueLocations > 1 ? 's' : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Get advice based on geographic spread
     */
    static getDistanceAdvice(maxDistanceKm) {
        if (maxDistanceKm < 5) {
            return 'Services facilement accessibles à pied ou en transport en commun';
        } else if (maxDistanceKm < 15) {
            return 'Prévoyez des moyens de transport pour accéder aux différents services';
        } else {
            return 'Considérez les temps de trajet dans votre planification';
        }
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     */
    static calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    /**
     * Convert degrees to radians
     */
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    /**
     * Validate coordinate values
     */
    static isValidCoordinate(lat, lng) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        return !isNaN(latitude) && 
               !isNaN(longitude) && 
               latitude >= -90 && latitude <= 90 && 
               longitude >= -180 && longitude <= 180 &&
               !(latitude === 0 && longitude === 0); // Exclude null island
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