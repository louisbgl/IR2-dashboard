const apiBaseUrlDevelopment = 'http://localhost:5000';
const apiBaseUrlProduction  = 'https://ir2-dashboard.onrender.com';

async function getApiBaseUrl() {
    try {
        const response = await fetch(`${apiBaseUrlDevelopment}/dashboard/health`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
                console.log('Using development API base URL');
                return apiBaseUrlDevelopment;
            }
        }
    } catch (error) {
        // Development backend unreachable, will try production
        console.warn('Dev backend unreachable, switching to production');
    }

    // If we reach here, the development backend is not reachable,
    // use production to make sure the app works
    console.log('Using production API base URL');
    return apiBaseUrlProduction;
}

export { getApiBaseUrl };