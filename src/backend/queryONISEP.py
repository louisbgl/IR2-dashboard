import requests
from urllib.parse import quote

from .franceGeo import FranceGeo

class QueryONISEP:
    """
    Class to query ONISEP API.
    """
    # API endpoints
    BASE_URL = "https://api.opendata.onisep.fr/api/1.0/dataset"
    ENSEIGN_SEC_URL = f"{BASE_URL}/5fa5816ac6a6e/search"
    ENSEIGN_SUP_URL = f"{BASE_URL}/5fa586da5c4b6/search"
    FORMATIONS_URL = f"{BASE_URL}/605344579a7d7/search"

    def __init__(self, france_geo):
        """
        Initialize the QueryONISEP class.
        """
        if not isinstance(france_geo, FranceGeo):
            raise ValueError("france_geo must be an instance of FranceGeo")
        self.france_geo = france_geo

    @staticmethod
    def make_api_request(url):
        """
        Make a GET request to the specified URL and return the JSON response.
        """
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as err:
            print(f"HTTP Error: {err}")
            return None
        except requests.exceptions.RequestException as err:
            print(f"Request Error: {err}")
            return None

    @staticmethod
    def remove_duplicates(results, debug=False):
        """
        Remove duplicate establishments from combined results using UAI codes.
        UAI (Unité Administrative Immatriculée) codes are unique establishment identifiers.
        """
        seen_uai = set()
        unique_results = []
        duplicates_removed = 0
        
        for result in results:
            uai = result.get("code_uai", "").strip()
            
            if uai and uai in seen_uai:
                duplicates_removed += 1
                if debug:
                    print(f"[QueryONISEP] DUPLICATE: {result.get('nom', 'N/A')} (UAI: {uai})")
            else:
                if uai:
                    seen_uai.add(uai)
                unique_results.append(result)
        
        if debug:
            print(f"[QueryONISEP] Deduplication: {len(results)} -> {len(unique_results)} ({duplicates_removed} duplicates removed)")
        
        return unique_results

    @staticmethod
    def sort_enseignement_data(self, results, entity_code, entity_type):
        """
        Sort enseignement data and filter by entity type.
        Returns: total count, status counts, type counts, and coordinates.
        """
        # results is already a list of establishments from combined APIs
        
        # Filter results based on entity type
        if entity_type == "commune":
            # Filter by commune code
            filtered_results = [r for r in results if r.get("commune_cog") == entity_code]
        elif entity_type == "epci":
            # Get commune codes in this EPCI
            commune_codes = self.france_geo.get_commune_codes_in_epci(entity_code)
            filtered_results = [r for r in results if r.get("commune_cog") in commune_codes]
        else:
            # For region and departement, use all results
            filtered_results = results
        
        # Calculate totals and counts
        total_etablissements = len(filtered_results)
        
        # Count by status
        status_counts = {}
        for result in filtered_results:
            status = result.get("statut", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Count by type
        type_counts = {}
        for result in filtered_results:
            type_etab = result.get("type_detablissement", "unknown")
            type_counts[type_etab] = type_counts.get(type_etab, 0) + 1
        
        # Extract coordinates for mapping
        coordinates = []
        for result in filtered_results:
            if result.get("longitude_x") and result.get("latitude_y"):
                coordinates.append({
                    "longitude": result["longitude_x"],
                    "latitude": result["latitude_y"],
                    "nom": result.get("nom", ""),
                    "type": result.get("type_detablissement", ""),
                    "statut": result.get("statut", ""),
                    "_source": result.get("_source", "unknown")
                })
        
        return {
            "total_etablissements": total_etablissements,
            "status_counts": status_counts,
            "type_counts": type_counts,
            "coordinates": coordinates
        }

    def _build_geographic_filter(self, entity_code, entity_type, api_type):
        """
        Build geographic filter for API requests based on entity type and API format.
        api_type: 'sec' or 'sup' to handle different departement formats
        """
        if entity_type == "commune":
            dep_name = self.france_geo.get_departement_name_from_commune_code(entity_code)
            dep_code = self.france_geo.get_departement_code_from_commune_code(entity_code)
            if api_type == "sup":
                filter_value = f"{dep_code} - {dep_name}"
            else:  # sec
                filter_value = dep_name
            return f"facet.departement={quote(filter_value)}"
        elif entity_type == "epci":
            region_name = self.france_geo.get_region_name_from_epci_code(entity_code)
            return f"facet.region={quote(region_name)}"
        elif entity_type == "departement":
            dep_name = self.france_geo.get_departement_name_from_code(entity_code)
            if api_type == "sup":
                filter_value = f"{entity_code} - {dep_name}"
            else:  # sec
                filter_value = dep_name
            return f"facet.departement={quote(filter_value)}"
        elif entity_type == "region":
            region_name = self.france_geo.get_region_name_from_code(entity_code)
            return f"facet.region={quote(region_name)}"
        else:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")

    def query_enseignement(self, entity_code, entity_type="commune", level="all", debug=False):
        """
        Query a specific entity in the ONISEP dataset.
        level: 'all' (both sec and sup), 'sec' (secondary only), 'sup' (superior only)
        """
        static_filters = ["size=5000"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
        
        if level not in ["all", "sec", "sup"]:
            raise ValueError("Invalid level. Must be one of: all, sec, sup.")

        # Collect results from all requested APIs
        all_results = []
        
        # Query secondary education if requested
        if level in ["all", "sec"]:
            geo_filter = self._build_geographic_filter(entity_code, entity_type, "sec")
            sec_url = f"{self.ENSEIGN_SEC_URL}?{geo_filter}&{'&'.join(static_filters)}"
            if debug: print(f"[QueryONISEP] DEBUG: SEC URL: {sec_url}")
            
            sec_response = self.make_api_request(sec_url)
            if sec_response:
                sec_results = sec_response.get("results", [])
                # Add source attribution
                for result in sec_results:
                    result["_source"] = "sec"
                all_results.extend(sec_results)
                if debug: print(f"[QueryONISEP] DEBUG: Got {len(sec_results)} results from SEC")
            elif debug:
                print(f"[QueryONISEP] WARNING: Failed to query SEC data")
        
        # Query superior education if requested
        if level in ["all", "sup"]:
            geo_filter = self._build_geographic_filter(entity_code, entity_type, "sup")
            sup_url = f"{self.ENSEIGN_SUP_URL}?{geo_filter}&{'&'.join(static_filters)}"
            if debug: print(f"[QueryONISEP] DEBUG: SUP URL: {sup_url}")
            
            sup_response = self.make_api_request(sup_url)
            if sup_response:
                sup_results = sup_response.get("results", [])
                # Add source attribution
                for result in sup_results:
                    result["_source"] = "sup"
                all_results.extend(sup_results)
                if debug: print(f"[QueryONISEP] DEBUG: Got {len(sup_results)} results from SUP")
            elif debug:
                print(f"[QueryONISEP] WARNING: Failed to query SUP data")

        if not all_results:
            raise Exception(f"Failed to query enseignement data for {entity_type} {entity_code}")
        
        # Remove duplicates before processing
        if debug:
            print(f"[QueryONISEP] Before deduplication: {len(all_results)} establishments")
        deduplicated_results = self.remove_duplicates(all_results, debug)
        
        result = self.sort_enseignement_data(self, deduplicated_results, entity_code, entity_type)
        return result
    
    def sort_formations_data(self, results, entity_code, entity_type):
        """
        Sort formations data and filter by entity type.
        Returns: total count, level counts, status counts, and coordinates.
        """
        # Filter results based on entity type
        if entity_type == "commune":
            # Filter by commune name (exact match)
            commune_name = self.france_geo.get_commune_name_from_code(entity_code)
            filtered_results = [r for r in results if r.get("ens_commune") == commune_name]
        elif entity_type == "epci":
            # Get commune names in this EPCI
            commune_codes = self.france_geo.get_commune_codes_in_epci(entity_code)
            commune_names = [self.france_geo.get_commune_name_from_code(code) for code in commune_codes]
            filtered_results = [r for r in results if r.get("ens_commune") in commune_names]
        elif entity_type == "departement":
            # Filter by departement name
            dep_name = self.france_geo.get_departement_name_from_code(entity_code)
            filtered_results = [r for r in results if r.get("ens_departement") == dep_name]
        elif entity_type == "region":
            # Filter by region name
            region_name = self.france_geo.get_region_name_from_code(entity_code)
            filtered_results = [r for r in results if r.get("ens_region") == region_name]
        else:
            filtered_results = results
        
        # Calculate totals and counts
        total_formations = len(filtered_results)
        
        # Count by education level (for_niveau_de_sortie)
        level_counts = {}
        for result in filtered_results:
            niveau = result.get("for_niveau_de_sortie", "unknown")
            level_counts[niveau] = level_counts.get(niveau, 0) + 1
        
        # Count by establishment status (ens_statut)
        status_counts = {}
        for result in filtered_results:
            statut = result.get("ens_statut", "unknown")
            status_counts[statut] = status_counts.get(statut, 0) + 1
        
        # Count by formation type (for_type)
        type_counts = {}
        for result in filtered_results:
            formation_type = result.get("for_type", "unknown")
            type_counts[formation_type] = type_counts.get(formation_type, 0) + 1
        
        # Extract coordinates for mapping
        coordinates = []
        for result in filtered_results:
            geoloc = result.get("_geoloc")
            if geoloc and geoloc.get("lat") and geoloc.get("lon"):
                coordinates.append({
                    "longitude": geoloc["lon"],
                    "latitude": geoloc["lat"],
                    "formation": result.get("formation_for_libelle", ""),
                    "etablissement": result.get("lieu_denseignement_ens_libelle", ""),
                    "niveau": result.get("for_niveau_de_sortie", ""),
                    "statut": result.get("ens_statut", ""),
                    "type": result.get("for_type", ""),
                    "_source": "formations"
                })
        
        return {
            "total_formations": total_formations,
            "level_counts": level_counts,
            "status_counts": status_counts,
            "type_counts": type_counts,
            "coordinates": coordinates
        }

    def _build_formations_geographic_filter(self, entity_code, entity_type):
        """
        Build geographic filter for formations API requests based on entity type.
        """
        if entity_type == "commune":
            # No direct commune filter, use departement instead
            dep_name = self.france_geo.get_departement_name_from_commune_code(entity_code)
            return f"facet.ens_departement={quote(dep_name)}"
        elif entity_type == "epci":
            # Use region filter for EPCI
            region_name = self.france_geo.get_region_name_from_epci_code(entity_code)
            return f"facet.ens_region={quote(region_name)}"
        elif entity_type == "departement":
            dep_name = self.france_geo.get_departement_name_from_code(entity_code)
            return f"facet.ens_departement={quote(dep_name)}"
        elif entity_type == "region":
            region_name = self.france_geo.get_region_name_from_code(entity_code)
            return f"facet.ens_region={quote(region_name)}"
        else:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")

    def query_formations(self, entity_code, entity_type="commune", debug=False):
        """
        Query formations data from the ONISEP dataset for a specific entity.
        Returns aggregated data about formations including counts by level and status.
        """
        static_filters = ["size=5000"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")

        # Build geographic filter
        geo_filter = self._build_formations_geographic_filter(entity_code, entity_type)
        formations_url = f"{self.FORMATIONS_URL}?{geo_filter}&{'&'.join(static_filters)}"
        
        if debug: 
            print(f"[QueryONISEP] DEBUG: FORMATIONS URL: {formations_url}")
        
        # Query formations data
        formations_response = self.make_api_request(formations_url)
        if not formations_response:
            raise Exception(f"Failed to query formations data for {entity_type} {entity_code}")
        
        formations_results = formations_response.get("results", [])
        if debug: 
            print(f"[QueryONISEP] DEBUG: Got {len(formations_results)} formations results")
        
        # Process and filter results
        result = self.sort_formations_data(formations_results, entity_code, entity_type)
        return result
