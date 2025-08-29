import requests
import json
import os
import re
from datetime import datetime, timedelta
from .franceGeo import FranceGeo

class QueryFranceTravail:
    """
    Class for querying the FranceTravail API for employment data.
    """
    
    # API endpoints
    BASE_API_URL = "https://api.francetravail.io/partenaire/stats-offres-demandes-emploi"
    TOKEN_URL = "https://francetravail.io/connexion/oauth2/access_token"
    DEMANDEURS_ENDPOINT = "/v1/indicateur/stat-demandeurs"
    PERSPECTIVES_ENDPOINT = "/v1/indicateur/stat-perspective-employeur"
    
    # Scopes required for the API
    SCOPES = "api_stats-offres-demandes-emploiv1 offresetdemandesemploi"
    
    def __init__(self, france_geo):
        """
        Initialize the QueryFranceTravail class.
        """
        if not isinstance(france_geo, FranceGeo):
            raise ValueError("france_geo must be an instance of FranceGeo")
        self.france_geo = france_geo
        
        # Token management
        self._access_token = None
        self._token_expires_at = None
        
        # Load credentials from environment variables
        self.client_id = os.getenv('FRANCETRAVAIL_CLIENT_ID')
        self.client_secret = os.getenv('FRANCETRAVAIL_CLIENT_SECRET')
        
        if not self.client_id or not self.client_secret:
            # Don't raise error during init - handle gracefully in API calls
            self._credentials_available = False
        else:
            self._credentials_available = True
    
    def _get_access_token(self):
        """
        Get a valid access token, refreshing if necessary.
        """
        # Check if current token is still valid
        if (self._access_token and self._token_expires_at and 
            datetime.now() < self._token_expires_at):
            return self._access_token
        
        # Request new token
        url = self.TOKEN_URL
        params = {"realm": "/partenaire"}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": self.SCOPES
        }
        
        try:
            response = requests.post(url, params=params, headers=headers, data=data, timeout=5)
            response.raise_for_status()
            
            token_data = response.json()
            self._access_token = token_data.get("access_token")
            
            if not self._access_token:
                raise Exception("No access token in response")
            
            # Set expiration time (default to 1 hour if not provided)
            expires_in = token_data.get("expires_in", 3600)
            self._token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)  # 60s buffer
            
            return self._access_token
            
        except requests.exceptions.Timeout:
            raise Exception("timeout")
        except requests.exceptions.HTTPError as err:
            if hasattr(err, 'response') and err.response.status_code in [502, 503, 504]:
                raise Exception("service_unavailable")
            raise Exception("error")
        except requests.exceptions.RequestException as err:
            raise Exception("error")
    
    def _make_api_request(self, endpoint, data, debug=False):
        """
        Make a POST request to the FranceTravail API with authentication.
        """
        try:
            token = self._get_access_token()
        except Exception as e:
            error_type = str(e)
            if error_type == "timeout":
                return {"status": "timeout", "message": "L'API France Travail n'a pas répondu", "data": None}
            elif error_type == "service_unavailable":
                return {"status": "service_unavailable", "message": "L'API France Travail n'a pas répondu", "data": None}
            else:
                return {"status": "error", "message": "L'API France Travail n'a pas répondu", "data": None}
                
        url = f"{self.BASE_API_URL}{endpoint}"
        
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        if debug:
            print(f"Making request to: {url}")
            print(f"Request data: {json.dumps(data, indent=2)}")
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=5)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            return {"status": "timeout", "message": "L'API France Travail n'a pas répondu", "data": None}
        except requests.exceptions.HTTPError as err:
            if hasattr(err, 'response') and err.response.status_code in [502, 503, 504]:
                return {"status": "service_unavailable", "message": "L'API France Travail n'a pas répondu", "data": None}
            print(f"HTTP Error: {err}")
            print(f"Response content: {response.text}")
            return {"status": "error", "message": "L'API France Travail n'a pas répondu", "data": None}
        except requests.exceptions.RequestException as err:
            print(f"Request Error: {err}")
            return {"status": "error", "message": "L'API France Travail n'a pas répondu", "data": None}
    
    @staticmethod
    def process_demandeurs_data(api_response):
        """
        Process and filter the demandeurs emploi API response, calculating yearly averages.
        Based on the logic from filter_response.py, modified to group by year.
        """
        if not api_response or "listeValeursParPeriode" not in api_response:
            return {}
        
        # Characteristics of interest
        code_type_caract_of_interest = ["GENRE", "NIVFORM", "CHOMANC", "NIVEXP", "NIVQUAL"]
        lib_caract_of_interest = ["15-24 ans", "25-34 ans", "35-49 ans",
                                "Hommes - 25-34 ans", "Femmes - 25-34 ans"]
        
        # Step 1: Initial filtering
        filtered_response = []
        for periode in api_response['listeValeursParPeriode']:
            filtered_caracts = [
                caract for caract in periode.get('listeValeurParCaract', [])
                if (caract.get('codeTypeCaract') in code_type_caract_of_interest or 
                    caract.get('libCaract') in lib_caract_of_interest)
            ]
            if filtered_caracts:
                filtered_response.append({
                    "libPeriode": periode.get("libPeriode"),
                    "codePeriode": periode.get("codePeriode"),
                    "valeurPrincipaleNombre": periode.get("valeurPrincipaleNombre"),
                    "valeurSecondairePourcentage": periode.get("valeurSecondairePourcentage"),
                    "filtered_caracts": filtered_caracts
                })
        
        # Step 2: Post-processing to replace Hommes/Femmes with Total
        for item in filtered_response:
            total = 0
            new_caracts = []
            for c in item["filtered_caracts"]:
                if c.get('libCaract') in ['Hommes', 'Femmes']:
                    total += c.get('nombre', 0)
                else:
                    new_caracts.append(c)
            
            if total > 0:
                new_caracts.insert(0, {
                    "codeTypeCaract": "TOTAL",
                    "codeCaract": "TOTAL",
                    "libCaract": "Total",
                    "nombre": total,
                    "masque": False
                })
            item["filtered_caracts"] = new_caracts
        
        # Step 3: Group by year and calculate averages
        yearly_data = {}
        for item in filtered_response:
            # Extract year from libPeriode (e.g., "1er trimestre 2025" -> "2025")
            lib_periode = item.get("libPeriode", "")
            year = None
            
            # Try to extract year from different formats
            year_match = re.search(r'\b(20\d{2})\b', lib_periode)
            if year_match:
                year = year_match.group(1)
            
            if not year:
                continue  # Skip if we can't extract year
            
            if year not in yearly_data:
                yearly_data[year] = {
                    "periods": [],
                    "valeur_principale_sum": 0,
                    "valeur_secondaire_sum": 0,
                    "count": 0
                }
            
            yearly_data[year]["periods"].append(item)
            yearly_data[year]["valeur_principale_sum"] += item.get("valeurPrincipaleNombre", 0)
            yearly_data[year]["valeur_secondaire_sum"] += item.get("valeurSecondairePourcentage", 0)
            yearly_data[year]["count"] += 1
        
        # Step 4: Calculate averaged data for each year
        result_data = {}
        for year, year_info in yearly_data.items():
            if year_info["count"] == 0:
                continue
            
            # Calculate averages
            avg_principale = year_info["valeur_principale_sum"] / year_info["count"]
            avg_secondaire = year_info["valeur_secondaire_sum"] / year_info["count"]
            
            # Average the characteristics across all periods of the year
            averaged_caracts = {}
            for period in year_info["periods"]:
                for caract in period.get("filtered_caracts", []):
                    caract_key = (caract.get("codeTypeCaract"), caract.get("codeCaract"))
                    
                    if caract_key not in averaged_caracts:
                        averaged_caracts[caract_key] = {
                            "codeTypeCaract": caract.get("codeTypeCaract"),
                            "codeCaract": caract.get("codeCaract"),
                            "libCaract": caract.get("libCaract"),
                            "nombre_sum": 0,
                            "pourcentage_sum": 0,
                            "count": 0,
                            "masque": caract.get("masque", False)
                        }
                    
                    averaged_caracts[caract_key]["nombre_sum"] += caract.get("nombre", 0)
                    averaged_caracts[caract_key]["pourcentage_sum"] += caract.get("pourcentage", 0)
                    averaged_caracts[caract_key]["count"] += 1
            
            # Convert to final format
            final_caracts = []
            for caract_data in averaged_caracts.values():
                if caract_data["count"] > 0:
                    final_caract = {
                        "codeTypeCaract": caract_data["codeTypeCaract"],
                        "codeCaract": caract_data["codeCaract"],
                        "libCaract": caract_data["libCaract"],
                        "nombre": round(caract_data["nombre_sum"] / caract_data["count"]),
                        "masque": caract_data["masque"]
                    }
                    
                    # Add percentage if it exists
                    if caract_data["pourcentage_sum"] > 0:
                        final_caract["pourcentage"] = round(caract_data["pourcentage_sum"] / caract_data["count"], 1)
                    
                    final_caracts.append(final_caract)
            
            result_data[year] = {
                "annee": year,
                "valeurPrincipaleNombre": round(avg_principale),
                "valeurSecondairePourcentage": round(avg_secondaire, 1),
                "filtered_caracts": final_caracts,
                "nb_periodes": year_info["count"]
            }
        
        return result_data
    
    def query_demandeurs_emploi(self, entity_code, entity_type="epci", debug=False):
        """
        Query job seekers (demandeurs d'emploi) data from the FranceTravail API.
        
        Args:
            entity_code (str): The code of the entity (EPCI, department, region)
            entity_type (str): Type of entity ("epci", "departement", "region")
            debug (bool): Enable debug output
            
        Returns:
            dict: Processed yearly averaged job seekers data or error message
        """
        
        # Check if credentials are available
        if not self._credentials_available:
            return {
                "status": "error",
                "message": "L'API France Travail n'a pas répondu",
                "data": None
            }
        
        # Handle commune-level requests - not supported
        if entity_type == "commune":
            return {
                "status": "not_available",
                "message": "Les données ne sont pas disponibles au niveau communal",
                "data": None
            }
        
        # Validate entity type
        if entity_type not in ["epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: epci, departement, region.")
        
        # Map entity_type to API territory codes
        territory_type_map = {
            "commune": "COM",  # Not supported
            "epci": "EPCI", 
            "departement": "DEP", 
            "region": "REG"
        }
        
        api_territory_type = territory_type_map.get(entity_type, entity_type.upper())
        
        # Prepare the API request data
        request_data = {
            "codeTypeTerritoire": api_territory_type,
            "codeTerritoire": entity_code,
            "codeTypeActivite": "CUMUL",
            "codeActivite": "CUMUL",
            "codeTypePeriode": "TRIMESTRE",
            "codeTypeNomenclature": "CATCAND",
            "listeCodeNomenclature": ["A"]
        }
        
        if debug:
            print(f"Querying demandeurs emploi for {entity_type} {entity_code}")
            print("Processing all available periods for yearly averages")
        
        # Make the API request
        try:
            response = self._make_api_request(self.DEMANDEURS_ENDPOINT, request_data, debug)
        except Exception as e:
            error_type = str(e)
            if error_type == "timeout":
                return {
                    "status": "timeout",
                    "message": "L'API France Travail n'a pas répondu",
                    "data": None
                }
            elif error_type == "service_unavailable":
                return {
                    "status": "service_unavailable", 
                    "message": "L'API France Travail n'a pas répondu",
                    "data": None
                }
            else:
                return {
                    "status": "error",
                    "message": "L'API France Travail n'a pas répondu", 
                    "data": None
                }
        
        # Handle timeout and service unavailable from _make_api_request
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response
        
        if not response:
            return {
                "status": "error",
                "message": "Failed to query FranceTravail API",
                "data": None
            }
        
        # Process the response (no target_periode, will calculate yearly averages)
        if debug:
            print(f"API response has {len(response.get('listeValeursParPeriode', []))} periods")
        
        processed_data = self.process_demandeurs_data(response)
        
        if debug:
            print(f"Processed data keys: {processed_data.get('data', {}).keys()}")
        
        return processed_data

    @staticmethod
    def process_perspective_data(response_data):
        """
        Process the perspective data to restructure it by year.
        Returns a dictionary with territory info at top level and data organized by year.
        """
        # Extract top-level territory information from first item
        if not response_data.get("listeValeursParPeriode"):
            return {}
        
        first_item = response_data["listeValeursParPeriode"][0]
        
        processed_data = {
            "codeTypeTerritoire": first_item["codeTypeTerritoire"],
            "codeTerritoire": first_item["codeTerritoire"],
            "libTerritoire": first_item["libTerritoire"],
            "codeTypePeriode": first_item["codeTypePeriode"],
            "data": {}
        }
        
        # Process each item and organize by year
        for item in response_data["listeValeursParPeriode"]:
            year = item["codePeriode"]
            
            # Initialize year if not exists
            if year not in processed_data["data"]:
                processed_data["data"][year] = []
            
            # Add indicator data for this year
            indicator_data = {
                "codeNomenclature": item["codeNomenclature"],
                "libNomenclature": item["libNomenclature"],
                "valeurPrincipaleNom": item["valeurPrincipaleNom"],
                "valeurPrincipaleDecimale": item["valeurPrincipaleDecimale"]
            }
            
            processed_data["data"][year].append(indicator_data)
        
        # Sort years and indicators within each year
        sorted_years = {}
        for year in sorted(processed_data["data"].keys(), reverse=True):
            sorted_years[year] = sorted(
                processed_data["data"][year], 
                key=lambda x: x["codeNomenclature"]
            )
        
        processed_data["data"] = sorted_years
        
        return processed_data

    def query_perspectives_employeur(self, entity_code, entity_type="departement", debug=False):
        """
        Query employer perspectives data from the FranceTravail API.
        
        Args:
            entity_code (str): The code of the entity (department, region)
            entity_type (str): Type of entity ("departement", "region")
            debug (bool): Enable debug output
            
        Returns:
            dict: Processed perspectives data organized by year or error message
        """
        
        # Check if credentials are available
        if not self._credentials_available:
            return {
                "status": "error",
                "message": "L'API France Travail n'a pas répondu",
                "data": None
            }
        
        # Handle commune and EPCI-level requests
        if entity_type in ["commune", "epci"]:
            return {
                "status": "not_available",
                "message": "Les données de perspectives employeur ne sont pas disponibles au niveau communal ou EPCI",
                "data": None
            }
        
        # Validate entity type
        if entity_type not in ["departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: departement, region.")
        
        # Map entity_type to API territory codes
        territory_type_map = {
            "commune": "COM",  # Not supported
            "epci": "EPCI",    # Not supported
            "departement": "DEP", 
            "region": "REG"
        }
        
        api_entity_type = territory_type_map.get(entity_type, entity_type.upper())
        
        # Prepare the API request data
        request_data = {
            "codeTypeTerritoire": api_entity_type,
            "codeTerritoire": entity_code,
            "codeTypeActivite": "CUMUL",
            "codeActivite": "CUMUL",
            "codeTypePeriode": "ANNEE",
            "codeTypeNomenclature": "TYPE_TENSION"
        }
        
        if debug:
            print(f"Querying perspectives employeur for {entity_type} {entity_code}")
        
        # Make the API request
        try:
            response = self._make_api_request(self.PERSPECTIVES_ENDPOINT, request_data, debug)
        except Exception as e:
            error_type = str(e)
            if error_type == "timeout":
                return {
                    "status": "timeout",
                    "message": "L'API France Travail n'a pas répondu",
                    "data": None
                }
            elif error_type == "service_unavailable":
                return {
                    "status": "service_unavailable",
                    "message": "L'API France Travail n'a pas répondu", 
                    "data": None
                }
            else:
                return {
                    "status": "error",
                    "message": "L'API France Travail n'a pas répondu",
                    "data": None
                }
        
        # Handle timeout and service unavailable from _make_api_request
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response
        
        if not response:
            return {
                "status": "error",
                "message": "Failed to query FranceTravail Perspectives API",
                "data": None
            }
        
        # Process the response
        if debug:
            print(f"API response has {len(response.get('listeValeursParPeriode', []))} periods")
        
        processed_data = self.process_perspective_data(response)
        
        if debug:
            print(f"Processed data keys: {processed_data.get('data', {}).keys()}")
        
        return processed_data
