import requests
from urllib.parse import quote

from .franceGeo import FranceGeo

class QueryONISEP:
    """
    Class to query ONISEP API.
    """
    # API endpoints
    BASE_URL = "https://api.opendata.onisep.fr/api/1.0/dataset"
    ENSEIGN_SUP_URL = f"{BASE_URL}/5fa586da5c4b6/search"

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
    def sort_enseignement_superieur_data(self, response, entity_code, entity_type):
        """
        Sort enseignement superieur data and filter by entity type.
        Returns: total count, status counts, type counts, and coordinates.
        """
        results = response.get("results", [])
        
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
                    "statut": result.get("statut", "")
                })
        
        return {
            "total_etablissements": total_etablissements,
            "status_counts": status_counts,
            "type_counts": type_counts,
            "coordinates": coordinates
        }

    def query_enseignement_superieur(self, entity_code, entity_type="commune", debug=False):
        """
        Query a specific entity in the ONISEP dataset
        """
        static_filters = ["size=2000"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
        
        geo_code = ""
        if entity_type == "commune":
            dep_name = self.france_geo.get_departement_name_from_commune_code(entity_code)
            dep_code = self.france_geo.get_departement_code_from_commune_code(entity_code)
            filter = f"{dep_code} - {dep_name}"
            geo_code = f"facet.departement={quote(filter)}"
        elif entity_type == "epci":
            region_name = self.france_geo.get_region_name_from_epci_code(entity_code)
            geo_code = f"facet.region={quote(region_name)}"
        elif entity_type == "departement":
            dep_name = self.france_geo.get_departement_name_from_code(entity_code)
            filter = f"{entity_code} - {dep_name}"
            geo_code = f"facet.departement={quote(filter)}"
        elif entity_type == "region":
            region_name = self.france_geo.get_region_name_from_code(entity_code)
            geo_code = f"facet.region={quote(region_name)}"
        else:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")

        url = self.ENSEIGN_SUP_URL
        url += f"?{geo_code}&{'&'.join(static_filters)}"

        if debug: print(f"[QueryONISEP] DEBUG: Request URL: {url}")

        response = self.make_api_request(url)

        if not response:
            raise Exception(f"Failed to query population data for {entity_type} {entity_code}. Response: {response}")
        
        if debug: print(f"Response:\n{response}")

        result = self.sort_enseignement_superieur_data(self, response, entity_code, entity_type)

        return result
    