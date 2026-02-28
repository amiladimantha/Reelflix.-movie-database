// Titles: https://omdbapi.com/?s=thor&page=1&apikey=fc1fef96
// details: http://www.omdbapi.com/?i=tt3896198&apikey=fc1fef96

const movieSearchBox = document.getElementById('movie-search-box');
const searchList = document.getElementById('search-list');
const resultGrid = document.getElementById('result-grid');
const clearBtn = document.getElementById('clear-btn');

// load movies from API
async function loadMovies(searchTerm){
    // Show loading state
    searchList.innerHTML = `
        <div class="search-list-empty">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Searching…</span>
        </div>`;

    const URL = `https://omdbapi.com/?s=${searchTerm}&page=1&apikey=fc1fef96`;
    const res = await fetch(`${URL}`);
    const data = await res.json();

    if(data.Response == "True"){
        displayMovieList(data.Search);
    } else {
        searchList.innerHTML = `
            <div class="search-list-empty">
                <i class="fas fa-film"></i>
                <span>No results for "<strong>${searchTerm}</strong>"</span>
            </div>`;
    }
}

let searchDebounce;

function findMovies(){
    clearTimeout(searchDebounce);
    let searchTerm = (movieSearchBox.value).trim();
    if(searchTerm.length > 0){
        searchList.classList.remove('hide-search-list');
        searchDebounce = setTimeout(() => loadMovies(searchTerm), 300);
    } else {
        searchList.classList.add('hide-search-list');
    }
}

function clearSearch(){
    movieSearchBox.value = "";
    searchList.classList.add('hide-search-list');
    movieSearchBox.focus();
}

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
            <img src="${poster}" alt="${movies[idx].Title}">
        </div>
        <div class="search-item-info">
            <h3>${movies[idx].Title}</h3>
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

function loadMovieDetails(){
    const searchListMovies = searchList.querySelectorAll('.search-list-item');
    searchListMovies.forEach(movie => {
        movie.addEventListener('click', async () => {
            searchList.classList.add('hide-search-list');
            movieSearchBox.value = "";
            const result = await fetch(`http://www.omdbapi.com/?i=${movie.dataset.id}&apikey=fc1fef96`);
            const movieDetails = await result.json();
            displayMovieDetails(movieDetails);
        });
    });
}

function displayMovieDetails(details){
    const poster = (details.Poster != "N/A") ? details.Poster : "image_not_found.png";

    // Build genre tags
    const genreTags = details.Genre
        ? details.Genre.split(', ').map(g => `<span class="genre-tag">${g}</span>`).join('')
        : '';

    resultGrid.innerHTML = `
    <div class="movie-poster">
        <img src="${poster}" alt="${details.Title} poster">
    </div>
    <div class="movie-info">
        <h3 class="movie-title">${details.Title}</h3>

        <ul class="movie-misc-info">
            <li class="year"><i class="fas fa-calendar-alt" style="margin-right:5px;opacity:.6"></i>${details.Year}</li>
            <li class="rated">${details.Rated}</li>
            <li class="released">${details.Released}</li>
        </ul>

        <div class="genre">${genreTags}</div>

        <p class="plot">${details.Plot}</p>

        <p class="info-row"><b>Director:</b> ${details.Director}</p>
        <p class="info-row"><b>Writer:</b> ${details.Writer}</p>
        <p class="info-row"><b>Actors:</b> ${details.Actors}</p>
        <p class="language"><i class="fas fa-globe" style="margin-right:5px"></i>${details.Language}</p>

        <p class="awards"><i class="fas fa-award"></i> ${details.Awards}</p>
    </div>
    `;
}

window.addEventListener('click', (event) => {
    if(!event.target.closest('.search-element')){
        searchList.classList.add('hide-search-list');
    }
});