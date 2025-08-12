import requests

from .franceGeo import FranceGeo
class QueryINSEE:
    """
    Class for querying the INSEE API MELODI.
    """
    # API endpoints
    BASE_API_URL = "https://api.insee.fr/melodi/data"
    POPULATION_API_URL = f"{BASE_API_URL}/DS_RP_POPULATION_PRINC"
    PCS_API_URL = f"{BASE_API_URL}/DS_RP_POPULATION_COMP"
    DIPLOMES_API_URL = f"{BASE_API_URL}/DS_RP_DIPLOMES_PRINC"
    EMPLOYMENT_API_URL = f"{BASE_API_URL}/DS_RP_EMPLOI_LR_PRINC"

    def __init__(self, france_geo):
        """
        Initialize the QueryINSEE class.
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
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            return {"status": "timeout", "message": "L'API INSEE n'a pas répondu", "data": None}
        except requests.exceptions.HTTPError as err:
            if hasattr(err, 'response') and err.response.status_code in [502, 503, 504]:
                return {"status": "service_unavailable", "message": "L'API INSEE n'a pas répondu", "data": None}
            print(f"HTTP Error: {err}")
            return {"status": "error", "message": "L'API INSEE n'a pas répondu", "data": None}
        except requests.exceptions.RequestException as err:
            print(f"Request Error: {err}")
            return {"status": "error", "message": "L'API INSEE n'a pas répondu", "data": None}
    
    @staticmethod
    def sort_population_data(pop_data):
        """
        Sort population data by year (descending) and organize population values by age group.
        """
        observations = pop_data.get("observations", [])
        sorted_pop_data = {}

        for obs in observations:
            year = obs["dimensions"].get("TIME_PERIOD")
            age_group = obs["dimensions"].get("AGE")
            value = obs["measures"]["OBS_VALUE_NIVEAU"].get("value")

            if year not in sorted_pop_data:
                sorted_pop_data[year] = {}

            sorted_pop_data[year][age_group] = round(value)

        return dict(sorted(sorted_pop_data.items(), key=lambda x: x[0]))

    def query_population(self, entity_code, entity_type="commune", debug=False):
        """
        Query a specific entity's population data from the INSEE API.
        """
        static_filters = ["SEX=_T", "AGE=Y_LT15", "AGE=Y15T24", "AGE=Y25T39", "AGE=_T"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
            
        geo_code = ""
        if entity_type == "commune":
            geo_code = "COM-" + entity_code
        elif entity_type == "epci":
            geo_code = "EPCI-" + entity_code
        elif entity_type == "departement":
            geo_code = "DEP-" + entity_code
        elif entity_type == "region":
            geo_code = "REG-" + entity_code
        else:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
        
        url = self.POPULATION_API_URL
        url += f"?{static_filters[0]}"
        for filter in static_filters[1:]:
            url += f"&{filter}"
        url += f"&GEO={geo_code}"

        if debug: print(f"Querying population for {entity_type} {entity_code} with URL:\n{url}")

        response = self.make_api_request(url)
        
        # Handle timeout and service unavailable
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response

        if not response:
            raise Exception(f"Failed to query population data for {entity_type} {entity_code}. Response: {response}")
        
        if debug: print(f"Response:\n{response}")

        result = self.sort_population_data(response)

        return result
    
    @staticmethod
    def sort_pcs_data(response):
        """
        Format PCS API response into a dict sorted by year.
        """
        if not response or "observations" not in response:
            return {}

        sorted_result = {}
        for obs in response["observations"]:
            year = obs["dimensions"]["TIME_PERIOD"]
            age = obs["dimensions"]["AGE"]
            pcs = obs["dimensions"]["PCS"]
            value = obs["measures"]["OBS_VALUE_NIVEAU"]["value"]

            if year == "2022" and pcs == "9":
                pcs = "8" # For consistency with previous years

            if year not in sorted_result:
                sorted_result[year] = {}
            if age not in sorted_result[year]:
                sorted_result[year][age] = {}
            if pcs not in sorted_result[year][age]:
                sorted_result[year][age][pcs] = 0

            sorted_result[year][age][pcs] += round(value)

        return dict(sorted(sorted_result.items(), key=lambda x: x[0]))

    def query_pcs(self, entity_code, entity_type="commune", debug=False):
        """
        Query PCS data from the INSEE API for the given entity.
        """
        static_filters = ["SEX=_T", "AGE=Y_GE15"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")

        geo_code = ""
        if entity_type == "commune":
            geo_code = "COM-" + entity_code
        elif entity_type == "epci":
            geo_code = "EPCI-" + entity_code
        elif entity_type == "departement":
            geo_code = "DEP-" + entity_code
        elif entity_type == "region":
            geo_code = "REG-" + entity_code

        url = self.PCS_API_URL
        url += f"?{static_filters[0]}"
        for filter in static_filters[1:]:
            url += f"&{filter}"
        url += f"&GEO={geo_code}"

        if debug: print(f"Querying PCS for {entity_type} {entity_code} with URL:\n{url}")

        response = self.make_api_request(url)
        
        # Handle timeout and service unavailable
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response
            
        if not response:
            raise Exception(f"Failed to query PCS data for {entity_type} {entity_code}. Response: {response}")

        if debug: print(f"Response:\n{response}")

        return self.sort_pcs_data(response)
    
    @staticmethod
    def sort_diplomas_data(response):
        """
        Format diplomas API response into a dict sorted by year.
        """
        if not response or "observations" not in response:
            return {}

        sorted_result = {}
        for obs in response["observations"]:
            year = obs["dimensions"]["TIME_PERIOD"]
            diplome = obs["dimensions"]["EDUC"]
            value = obs["measures"]["OBS_VALUE_NIVEAU"]["value"]

            if year not in sorted_result:
                sorted_result[year] = {}
            if diplome not in sorted_result[year]:
                sorted_result[year][diplome] = 0

            sorted_result[year][diplome] += round(value)

        return dict(sorted(sorted_result.items(), key=lambda x: x[0]))

    def query_diplomas(self, entity_code, entity_type="commune", debug=False):
        """
        Query diplomas data from the INSEE API for the given entity.
        """
        static_filters = ["SEX=_T"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
        
        geo_code = ""
        if entity_type == "commune":
            geo_code = "COM-" + entity_code
        elif entity_type == "epci":
            geo_code = "EPCI-" + entity_code
        elif entity_type == "departement":
            geo_code = "DEP-" + entity_code
        elif entity_type == "region":
            geo_code = "REG-" + entity_code

        url = self.DIPLOMES_API_URL
        url += f"?{static_filters[0]}"
        for filter in static_filters[1:]:
            url += f"&{filter}"
        url += f"&GEO={geo_code}"

        if debug: print(f"Querying diplomas for {entity_type} {entity_code} with URL:\n{url}")

        response = self.make_api_request(url)
        
        # Handle timeout and service unavailable
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response
            
        if not response:
            raise Exception(f"Failed to query diplomas data for {entity_type} {entity_code}. Response: {response}")

        if debug: print(f"Response:\n{response}")

        result = self.sort_diplomas_data(response)

        return result

    @staticmethod
    def sort_employment_data(response):
        """
        Format employment API response into a dict sorted by year with calculated indicators.
        """
        if not response or "observations" not in response:
            return {}

        # Group observations by year
        data_by_year = {}
        for obs in response["observations"]:
            year = obs["dimensions"]["TIME_PERIOD"]
            empsta_enq = obs["dimensions"]["EMPSTA_ENQ"]
            value = obs["measures"]["OBS_VALUE_NIVEAU"]["value"]

            if year not in data_by_year:
                data_by_year[year] = {}
            
            data_by_year[year][empsta_enq] = round(value)

        # Calculate indicators for each year
        sorted_result = {}
        for year, data in data_by_year.items():
            total_population = data.get("_T", 0)  # Total population 15-64
            employed = data.get("1", 0)  # Employed population
            unemployed = data.get("2", 0)  # Unemployed population
            
            # Calculate derived indicators
            nombre_actifs = employed + unemployed  # Total active population
            taux_emploi = round((employed / total_population * 100), 1) if total_population > 0 else 0
            taux_chomage = round((unemployed / nombre_actifs * 100), 1) if nombre_actifs > 0 else 0

            sorted_result[year] = {
                "population_15_64": total_population,
                "nombre_actifs": nombre_actifs,
                "nombre_actifs_ayant_emploi": employed,
                "taux_emploi": taux_emploi,
                "nombre_chomeurs": unemployed,
                "taux_chomage": taux_chomage
            }

        return dict(sorted(sorted_result.items(), key=lambda x: x[0]))

    def query_employment(self, entity_code, entity_type="commune", debug=False):
        """
        Query employment data from the INSEE API for the given entity.
        Returns data with nombre d'actifs, nombre d'actifs ayant un emploi, 
        taux d'emploi, nombre de chômeurs, and taux de chômage.
        """
        static_filters = ["SEX=_T", "AGE=Y15T64", "EDUC=_T"]

        if entity_type not in ["commune", "epci", "departement", "region"]:
            raise ValueError("Invalid entity_type. Must be one of: commune, epci, departement, region.")
        
        geo_code = ""
        if entity_type == "commune":
            geo_code = "COM-" + entity_code
        elif entity_type == "epci":
            geo_code = "EPCI-" + entity_code
        elif entity_type == "departement":
            geo_code = "DEP-" + entity_code
        elif entity_type == "region":
            geo_code = "REG-" + entity_code

        url = self.EMPLOYMENT_API_URL
        url += f"?{static_filters[0]}"
        for filter in static_filters[1:]:
            url += f"&{filter}"
        url += f"&GEO={geo_code}"

        if debug: print(f"Querying employment for {entity_type} {entity_code} with URL:\n{url}")

        response = self.make_api_request(url)
        
        # Handle timeout and service unavailable
        if isinstance(response, dict) and response.get('status') in ['timeout', 'service_unavailable', 'error']:
            return response
            
        if not response:
            raise Exception(f"Failed to query employment data for {entity_type} {entity_code}. Response: {response}")

        if debug: print(f"Response:\n{response}")

        result = self.sort_employment_data(response)

        return result
