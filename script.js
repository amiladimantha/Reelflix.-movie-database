// Titles: https://omdbapi.com/?s=thor&page=1&apikey=fc1fef96
// details: http://www.omdbapi.com/?i=tt3896198&apikey=fc1fef96

const movieSearchBox = document.getElementById('movie-search-box');
const searchList = document.getElementById('search-list');
const resultGrid = document.getElementById('result-grid');
const browseGrid = document.getElementById('browse-grid');
const clearBtn = document.getElementById('clear-btn');
const typeFilter = document.getElementById('type-filter');
const trendingGrid = document.getElementById('trending-grid');
const searchHistoryContainer = document.getElementById('search-history');
const trailerModal = document.getElementById('trailer-modal');
const trailerBody = document.getElementById('trailer-body');
const scrollTopBtn = document.getElementById('scroll-top-btn');

// ============= UTILITIES =============
// Sanitize HTML to prevent XSS
function sanitize(str) {
    if (!str || str === 'N/A') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============= SEARCH HISTORY =============
function getSearchHistory() {
    return JSON.parse(localStorage.getItem('reelflix-history') || '[]');
}

function saveSearchHistory(term) {
    let history = getSearchHistory();
    history = history.filter(h => h.toLowerCase() !== term.toLowerCase());
    history.unshift(term);
    if (history.length > 8) history = history.slice(0, 8);
    localStorage.setItem('reelflix-history', JSON.stringify(history));
    renderSearchHistory();
}

function renderSearchHistory() {
    const history = getSearchHistory();
    if (history.length === 0) {
        searchHistoryContainer.innerHTML = '';
        return;
    }
    searchHistoryContainer.innerHTML = `
        <span class="history-label">Recent:</span>
        ${history.map(h => `<button class="history-chip" onclick="searchFromHistory('${sanitize(h)}')">${sanitize(h)}</button>`).join('')}
        <button class="history-clear" onclick="clearSearchHistory()"><i class="fas fa-trash"></i></button>
    `;
}

function searchFromHistory(term) {
    movieSearchBox.value = term;
    findMovies();
}

function clearSearchHistory() {
    localStorage.removeItem('reelflix-history');
    renderSearchHistory();
}

// ============= TRENDING MOVIES =============
const TRENDING_IDS = [
    'tt1375666', // Inception
    'tt0111161', // Shawshank Redemption
    'tt0468569', // The Dark Knight
    'tt0137523', // Fight Club
    'tt0120737', // LOTR Fellowship
    'tt0109830', // Forrest Gump
    'tt0133093', // The Matrix
    'tt0816692', // Interstellar
];

async function loadTrendingMovies() {
    trendingGrid.innerHTML = Array(TRENDING_IDS.length).fill(0).map(() => `
        <div class="movie-card skeleton">
            <div class="skeleton-poster"></div>
            <div class="skeleton-text"></div>
        </div>
    `).join('');

    const movies = await Promise.all(TRENDING_IDS.map(async id => {
        try {
            const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=fc1fef96`);
            return await res.json();
        } catch {
            return null;
        }
    }));

    const valid = movies.filter(m => m && m.Response !== 'False');
    renderTrendingGrid(valid);
}

function renderTrendingGrid(movies) {
    trendingGrid.innerHTML = movies.map(m => {
        const poster = m.Poster !== 'N/A' ? m.Poster : 'image_not_found.png';
        return `
        <div class="movie-card" data-id="${m.imdbID}">
            <div class="card-poster">
                <img src="${poster}" alt="${sanitize(m.Title)}" loading="lazy">
                ${m.imdbRating && m.imdbRating !== 'N/A' ? `<span class="card-rating"><i class="fas fa-star"></i> ${m.imdbRating}</span>` : ''}
            </div>
            <div class="card-info">
                <h4>${sanitize(m.Title)}</h4>
                <span class="card-year">${m.Year}</span>
            </div>
        </div>`;
    }).join('');

    // Click to view details
    trendingGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => loadAndDisplayDetails(card.dataset.id));
    });
}

// ============= LOAD MOVIES FROM API =============
async function loadMovies(searchTerm){
    // Show skeleton loaders
    searchList.innerHTML = `
        <div class="search-list-header">Searching…</div>
        ${Array(5).fill(0).map(() => `
            <div class="search-list-item skeleton-item">
                <div class="skeleton-thumb"></div>
                <div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
            </div>
        `).join('')}
    `;

    const filterType = typeFilter.value;
    let URL = `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&page=1&apikey=fc1fef96`;
    if (filterType) URL += `&type=${filterType}`;

    try {
        const res = await fetch(URL);
        const data = await res.json();

        if(data.Response === "True"){
            saveSearchHistory(searchTerm);
            displayMovieList(data.Search);
            displayBrowseGrid(data.Search);
        } else {
            searchList.innerHTML = `
                <div class="search-list-empty">
                    <i class="fas fa-film"></i>
                    <span>No results for "<strong>${sanitize(searchTerm)}</strong>"</span>
                </div>`;
            browseGrid.innerHTML = '';
        }
    } catch (err) {
        searchList.innerHTML = `
            <div class="search-list-empty error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Something went wrong</span>
                <button class="retry-btn" onclick="loadMovies('${sanitize(searchTerm)}')"><i class="fas fa-redo"></i> Retry</button>
            </div>`;
    }
}

let searchDebounce;
let currentFocusIdx = -1;

function findMovies(){
    clearTimeout(searchDebounce);
    let searchTerm = (movieSearchBox.value).trim();
    if(searchTerm.length > 0){
        searchList.classList.remove('hide-search-list');
        searchDebounce = setTimeout(() => loadMovies(searchTerm), 300);
    } else {
        searchList.classList.add('hide-search-list');
        browseGrid.innerHTML = '';
    }
    currentFocusIdx = -1;
}

function clearSearch(){
    movieSearchBox.value = "";
    searchList.classList.add('hide-search-list');
    browseGrid.innerHTML = '';
    movieSearchBox.focus();
}

// ============= DISPLAY SEARCH DROPDOWN =============
function displayMovieList(movies){
    const typeLabel = { movie: 'Movie', series: 'Series', episode: 'Episode' };

    searchList.innerHTML = `<div class="search-list-header">${movies.length} result${movies.length !== 1 ? 's' : ''} found</div>`;

    for(let idx = 0; idx < movies.length; idx++){
        let movieListItem = document.createElement('div');
        movieListItem.dataset.id = movies[idx].imdbID;
        movieListItem.classList.add('search-list-item');

        const poster = movies[idx].Poster !== "N/A" ? movies[idx].Poster : "image_not_found.png";
        const type = typeLabel[movies[idx].Type] || movies[idx].Type || '';

        movieListItem.innerHTML = `
        <div class="search-item-thumbnail">
            <img src="${poster}" alt="${sanitize(movies[idx].Title)}" loading="lazy">
        </div>
        <div class="search-item-info">
            <h3>${sanitize(movies[idx].Title)}</h3>
            <div class="search-item-meta">
                <span class="search-item-year">${movies[idx].Year}</span>
                ${type ? `<span class="search-item-type">${type}</span>` : ''}
            </div>
        </div>
        `;
        searchList.appendChild(movieListItem);
    }
    loadMovieDetails();
}

// ============= BROWSE GRID (clickable cards) =============
function displayBrowseGrid(movies) {
    browseGrid.innerHTML = `
        <div class="browse-header">
            <h3><i class="fas fa-th"></i> Browse Results</h3>
        </div>
        <div class="browse-cards">
            ${movies.map(m => {
                const poster = m.Poster !== 'N/A' ? m.Poster : 'image_not_found.png';
                return `
                <div class="movie-card" data-id="${m.imdbID}">
                    <div class="card-poster">
                        <img src="${poster}" alt="${sanitize(m.Title)}" loading="lazy">
                    </div>
                    <div class="card-info">
                        <h4>${sanitize(m.Title)}</h4>
                        <span class="card-year">${m.Year}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    browseGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => loadAndDisplayDetails(card.dataset.id));
    });
}

// ============= DETAILS CLICK HANDLERS =============
function loadMovieDetails(){
    const searchListMovies = searchList.querySelectorAll('.search-list-item');
    searchListMovies.forEach(movie => {
        movie.addEventListener('click', async () => {
            searchList.classList.add('hide-search-list');
            movieSearchBox.value = "";
            loadAndDisplayDetails(movie.dataset.id);
        });
    });
}

async function loadAndDisplayDetails(imdbID) {
    // Show skeleton loader for details
    resultGrid.innerHTML = `
        <div class="movie-poster skeleton-poster-lg"></div>
        <div class="movie-info">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>
    `;
    resultGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const result = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=fc1fef96`);
        const movieDetails = await result.json();
        if (movieDetails.Response === 'True') {
            displayMovieDetails(movieDetails);
        } else {
            resultGrid.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> Movie not found</div>`;
        }
    } catch {
        resultGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load details</p>
                <button class="retry-btn" onclick="loadAndDisplayDetails('${imdbID}')"><i class="fas fa-redo"></i> Retry</button>
            </div>`;
    }
}

// ============= DISPLAY MOVIE DETAILS =============
function displayMovieDetails(details){
    const poster = (details.Poster !== "N/A") ? details.Poster : "image_not_found.png";

    // Build genre tags
    const genreTags = details.Genre
        ? details.Genre.split(', ').map(g => `<span class="genre-tag">${sanitize(g)}</span>`).join('')
        : '';

    // Build rating badges (IMDb, Rotten Tomatoes, Metacritic)
    let ratingsHTML = '';
    if (details.imdbRating && details.imdbRating !== 'N/A') {
        ratingsHTML += `
            <div class="rating-badge imdb">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" alt="IMDb">
                <span>${details.imdbRating}<small>/10</small></span>
                <small class="votes">${details.imdbVotes} votes</small>
            </div>`;
    }
    if (details.Ratings && details.Ratings.length > 0) {
        details.Ratings.forEach(r => {
            if (r.Source === 'Rotten Tomatoes') {
                ratingsHTML += `
                    <div class="rating-badge rt">
                        <i class="fas fa-lemon"></i>
                        <span>${r.Value}</span>
                    </div>`;
            }
            if (r.Source === 'Metacritic') {
                ratingsHTML += `
                    <div class="rating-badge meta">
                        <span class="meta-score">${r.Value.replace('/100', '')}</span>
                        <small>Metacritic</small>
                    </div>`;
            }
        });
    }

    resultGrid.innerHTML = `
    <div class="movie-poster">
        <img src="${poster}" alt="${sanitize(details.Title)} poster" loading="lazy">
    </div>
    <div class="movie-info">
        <h3 class="movie-title">${sanitize(details.Title)}</h3>

        <div class="ratings-row">${ratingsHTML}</div>

        <ul class="movie-misc-info">
            <li class="year"><i class="fas fa-calendar-alt" style="margin-right:5px;opacity:.6"></i>${details.Year}</li>
            <li class="rated">${details.Rated}</li>
            <li class="released">${details.Released}</li>
            ${details.Runtime && details.Runtime !== 'N/A' ? `<li class="runtime"><i class="fas fa-clock" style="margin-right:5px;opacity:.6"></i>${details.Runtime}</li>` : ''}
        </ul>

        <div class="genre">${genreTags}</div>

        <p class="plot">${sanitize(details.Plot)}</p>

        <p class="info-row"><b>Director:</b> ${sanitize(details.Director)}</p>
        <p class="info-row"><b>Writer:</b> ${sanitize(details.Writer)}</p>
        <p class="info-row"><b>Actors:</b> ${sanitize(details.Actors)}</p>
        <p class="language"><i class="fas fa-globe" style="margin-right:5px"></i>${sanitize(details.Language)}</p>

        ${details.Awards && details.Awards !== 'N/A' ? `<p class="awards"><i class="fas fa-award"></i> ${sanitize(details.Awards)}</p>` : ''}

        <div class="movie-actions">
            <a class="imdb-btn" href="https://www.imdb.com/title/${details.imdbID}/" target="_blank" rel="noopener noreferrer">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" alt="IMDb" class="imdb-logo"> View on IMDb
            </a>
            <button class="trailer-btn" onclick="openTrailer('${sanitize(details.Title)}', '${details.Year}')">
                <i class="fas fa-play"></i> Watch Trailer
            </button>
        </div>
    </div>
    `;
}

// ============= TRAILER MODAL =============
function openTrailer(title, year) {
    const query = encodeURIComponent(`${title} ${year} official trailer`);
    trailerBody.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed?listType=search&list=${query}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        ></iframe>
    `;
    trailerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
    trailerModal.classList.remove('active');
    trailerBody.innerHTML = '';
    document.body.style.overflow = '';
}

trailerModal.addEventListener('click', (e) => {
    if (e.target === trailerModal) closeTrailerModal();
});

// ============= KEYBOARD NAVIGATION =============
movieSearchBox.addEventListener('keydown', (e) => {
    const items = searchList.querySelectorAll('.search-list-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocusIdx = Math.min(currentFocusIdx + 1, items.length - 1);
        updateFocus(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocusIdx = Math.max(currentFocusIdx - 1, 0);
        updateFocus(items);
    } else if (e.key === 'Enter' && currentFocusIdx >= 0) {
        e.preventDefault();
        items[currentFocusIdx].click();
    } else if (e.key === 'Escape') {
        searchList.classList.add('hide-search-list');
    }
});

function updateFocus(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('focused', idx === currentFocusIdx);
    });
    if (currentFocusIdx >= 0) {
        items[currentFocusIdx].scrollIntoView({ block: 'nearest' });
    }
}

// ============= SCROLL TO TOP =============
window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= CLICK OUTSIDE =============
window.addEventListener('click', (event) => {
    if(!event.target.closest('.search-element')){
        searchList.classList.add('hide-search-list');
    }
});

// ============= INIT =============
document.addEventListener('DOMContentLoaded', () => {
    loadTrendingMovies();
    renderSearchHistory();
});