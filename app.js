const API_KEY = 'trilogy'; // Public test key for OMDB API
const BASE_URL = 'https://www.omdbapi.com/';

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const yearFilter = document.getElementById('year-filter');
const resultsGrid = document.getElementById('movie-results');
const movieDetails = document.getElementById('movie-details');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const searchSection = document.getElementById('search-section');
const homeBtn = document.getElementById('home-btn');

// State
let currentPage = 1;
let currentSearchTerm = '';
let currentSearchType = '';
let currentSearchYear = '';
let totalResults = 0;

// Initialize app
function init() {
    // Check if there's a saved search in LocalStorage
    const savedSearch = localStorage.getItem('omdb_last_search');
    const savedDetailsId = localStorage.getItem('omdb_last_details_id');

    if (savedDetailsId) {
        // If user was looking at a specific movie, load it
        getMovieDetails(savedDetailsId);
        
        // Also restore search params silently
        if (savedSearch) {
            const params = JSON.parse(savedSearch);
            searchInput.value = params.term || '';
            typeFilter.value = params.type || '';
            yearFilter.value = params.year || '';
            currentSearchTerm = params.term;
            currentPage = params.page || 1;
        }
    } else if (savedSearch) {
        // Otherwise load last search results
        const params = JSON.parse(savedSearch);
        if (params.term) {
            searchInput.value = params.term;
            typeFilter.value = params.type || '';
            yearFilter.value = params.year || '';
            currentSearchTerm = params.term;
            currentSearchType = params.type || '';
            currentSearchYear = params.year || '';
            currentPage = params.page || 1;
            
            performSearch(currentPage);
        }
    }

    // Event Listeners
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const term = searchInput.value.trim();
        if (!term) return;

        currentSearchTerm = term;
        currentSearchType = typeFilter.value;
        currentSearchYear = yearFilter.value;
        currentPage = 1;
        
        // Clear saved details
        localStorage.removeItem('omdb_last_details_id');
        
        performSearch(1);
    });

    homeBtn.addEventListener('click', () => {
        // Go back to search results if we have any, or clear
        movieDetails.classList.add('hidden');
        resultsGrid.classList.remove('hidden');
        searchSection.style.display = 'block';
        localStorage.removeItem('omdb_last_details_id');
        
        // Reset view to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Fetch Search Results
async function performSearch(page = 1) {
    if (!currentSearchTerm) return;
    
    showLoading();
    hideError();
    
    // Hide details view, show results view
    movieDetails.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
    searchSection.style.display = 'block';

    try {
        let url = `${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(currentSearchTerm)}&page=${page}`;
        if (currentSearchType) url += `&type=${currentSearchType}`;
        if (currentSearchYear) url += `&y=${currentSearchYear}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === 'True') {
            totalResults = parseInt(data.totalResults);
            renderResults(data.Search);
            renderPagination();
            
            // Save search state
            saveSearchState();
        } else {
            showError(data.Error || 'Movie not found.');
            resultsGrid.innerHTML = '';
        }
    } catch (error) {
        showError('An error occurred while fetching data. Please try again later.');
        resultsGrid.innerHTML = '';
        console.error('API Error:', error);
    } finally {
        hideLoading();
    }
}

// Fetch Detailed Info
async function getMovieDetails(id) {
    showLoading();
    hideError();
    
    // Save details state
    localStorage.setItem('omdb_last_details_id', id);

    try {
        const url = `${BASE_URL}?apikey=${API_KEY}&i=${id}&plot=full`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === 'True') {
            renderDetails(data);
        } else {
            showError(data.Error || 'Could not fetch movie details.');
        }
    } catch (error) {
        showError('An error occurred while fetching details.');
        console.error('API Error:', error);
    } finally {
        hideLoading();
    }
}

// Render Results Grid
function renderResults(movies) {
    resultsGrid.innerHTML = '';

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.imdbID;
        
        const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : null;
        
        const posterHtml = posterUrl 
            ? `<img src="${posterUrl}" alt="${movie.Title}" class="movie-poster" loading="lazy">`
            : `<div class="no-poster"><i class="fas fa-image"></i><span>No Poster</span></div>`;

        card.innerHTML = `
            <div class="movie-poster-container">
                ${posterHtml}
            </div>
            <div class="movie-info-short">
                <h3>${movie.Title}</h3>
                <p>
                    <span>${movie.Year}</span>
                    <span class="movie-type">${movie.Type}</span>
                </p>
            </div>
        `;

        card.addEventListener('click', () => {
            getMovieDetails(movie.imdbID);
        });

        resultsGrid.appendChild(card);
    });
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(totalResults / 10);
    if (totalPages <= 1) return;

    // Check if pagination container already exists
    let paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        resultsGrid.parentNode.insertBefore(paginationContainer, resultsGrid.nextSibling);
    }

    paginationContainer.innerHTML = `
        <button class="page-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
        <span id="page-info">Page ${currentPage} of ${totalPages}</span>
        <button class="page-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    // Add event listeners
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                performSearch(currentPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                performSearch(currentPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

// Render Detailed View
function renderDetails(movie) {
    // Hide search area and results
    searchSection.style.display = 'none';
    resultsGrid.classList.add('hidden');
    
    // Remove pagination if it exists
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'none';

    // Show details area
    movieDetails.classList.remove('hidden');

    const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : null;
    const posterHtml = posterUrl 
        ? `<img src="${posterUrl}" alt="${movie.Title}" class="detail-poster">`
        : `<div class="no-poster" style="height: 100%"><i class="fas fa-image"></i><span>No Poster</span></div>`;

    movieDetails.innerHTML = `
        <div class="movie-details-card">
            <button class="back-btn" id="close-details">
                <i class="fas fa-times"></i>
            </button>
            <div class="detail-poster-container">
                ${posterHtml}
            </div>
            <div class="detail-content">
                <div class="detail-header">
                    <h2 class="detail-title">${movie.Title}</h2>
                    <div class="detail-meta">
                        <span>${movie.Year}</span>
                        <span>•</span>
                        <span>${movie.Runtime !== 'N/A' ? movie.Runtime : 'Unknown Runtime'}</span>
                        <span>•</span>
                        <span class="badge">${movie.Genre}</span>
                        ${movie.imdbRating !== 'N/A' ? `
                        <span>•</span>
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${movie.imdbRating}/10</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="plot">
                    ${movie.Plot !== 'N/A' ? movie.Plot : 'No plot available for this title.'}
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-video"></i> Director</div>
                        <div class="info-value">${movie.Director}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-pen-nib"></i> Writer</div>
                        <div class="info-value">${movie.Writer}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-users"></i> Cast</div>
                        <div class="info-value">${movie.Actors}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-trophy"></i> Awards</div>
                        <div class="info-value">${movie.Awards !== 'N/A' ? movie.Awards : 'None'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-globe"></i> Language</div>
                        <div class="info-value">${movie.Language}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('close-details').addEventListener('click', () => {
        movieDetails.classList.add('hidden');
        resultsGrid.classList.remove('hidden');
        searchSection.style.display = 'block';
        
        // Restore pagination if exists
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.style.display = 'flex';
        
        localStorage.removeItem('omdb_last_details_id');
    });
}

// Utility Functions
function showLoading() {
    loading.classList.remove('hidden');
    resultsGrid.innerHTML = '';
    movieDetails.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    errorMessage.classList.remove('hidden');
    errorText.textContent = message;
    
    // Remove pagination if it exists
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'none';
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function saveSearchState() {
    const searchState = {
        term: currentSearchTerm,
        type: currentSearchType,
        year: currentSearchYear,
        page: currentPage
    };
    localStorage.setItem('omdb_last_search', JSON.stringify(searchState));
}

// Start app
document.addEventListener('DOMContentLoaded', init);
