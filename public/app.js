const currentUserId = 1;
const state = {
  media: [],
  genres: [],
  contributors: [],
  favorites: [],
  selectedMediaId: null,
  page: 1,
  pagination: {
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

const elements = {
  filtersForm: document.getElementById('filters-form'),
  resetButton: document.getElementById('reset-button'),
  genreDropdown: document.getElementById('genre-dropdown'),
  genreDropdownToggle: document.getElementById('genre-dropdown-toggle'),
  genreDropdownMenu: document.getElementById('genre-dropdown-menu'),
  genreDropdownLabel: document.getElementById('genre-dropdown-label'),
  genreDropdownBadge: document.getElementById('genre-dropdown-badge'),
  mediaGrid: document.getElementById('media-grid'),
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  detailEmpty: document.getElementById('detail-empty'),
  detailContent: document.getElementById('detail-content'),
  resultsSummary: document.getElementById('results-summary'),
  pageSummary: document.getElementById('page-summary'),
  prevPageButton: document.getElementById('prev-page-button'),
  nextPageButton: document.getElementById('next-page-button'),
  contributorsList: document.getElementById('contributors-list'),
  favoritesList: document.getElementById('favorites-list'),
  statMediaCount: document.getElementById('stat-media-count'),
  statGenreCount: document.getElementById('stat-genre-count'),
  refreshContributors: document.getElementById('refresh-contributors'),
  mediaCardTemplate: document.getElementById('media-card-template')
};

async function apiFetch(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    throw new Error('Request failed with status ' + response.status);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setLoading(isLoading) {
  elements.loadingState.classList.toggle('hidden', !isLoading);
}

function setError(message) {
  const hasMessage = Boolean(message);
  elements.errorState.textContent = message || '';
  elements.errorState.classList.toggle('hidden', !hasMessage);
}

function formatScore(value) {
  return value == null ? 'N/A' : Number(value).toFixed(1);
}

function formatMediaType(value) {
  return value === 'TV_SHOW' ? 'TV Show' : 'Movie';
}

function formatYear(dateString) {
  return dateString ? new Date(dateString).getFullYear() : 'Unknown';
}

function isFavoritedValue(value) {
  return Number(value) === 1 || value === true;
}

function buildQueryString() {
  const formData = new FormData(elements.filtersForm);
  const params = new URLSearchParams();

  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue).trim();
    if (value) {
      params.append(key, value);
    }
  }

  params.set('page', String(state.page));
  return params.toString();
}

function syncStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.page = Number.parseInt(params.get('page') || '1', 10);
  if (!Number.isInteger(state.page) || state.page < 1) {
    state.page = 1;
  }

  document.getElementById('search-input').value = params.get('search') || '';
  document.getElementById('type-select').value = params.get('type') || '';
  document.getElementById('critic-input').value = params.get('minCriticScore') || '';
  document.getElementById('audience-input').value = params.get('minAudienceScore') || '';
  document.getElementById('sort-select').value = params.get('sortBy') || 'release_date';
  document.getElementById('order-select').value = params.get('sortOrder') || 'desc';
  document.getElementById('limit-select').value = params.get('limit') || '24';
}

function syncUrlWithCurrentFilters() {
  const queryString = buildQueryString();
  const nextUrl = queryString ? '?' + queryString : window.location.pathname;
  window.history.replaceState(null, '', nextUrl);
}

function setStarButtonState(button, isFavorited) {
  const glyph = button.querySelector('.star-glyph');
  glyph.textContent = isFavorited ? '★' : '☆';
  button.classList.toggle('favorited', isFavorited);
  button.setAttribute('aria-label', isFavorited ? 'Remove favorite' : 'Add favorite');
  button.title = isFavorited ? 'Remove favorite' : 'Add favorite';
}

function updateGenreDropdownLabel() {
  const selected = Array.from(elements.filtersForm.querySelectorAll('input[name="genre"]:checked'));

  if (selected.length === 0) {
    elements.genreDropdownLabel.textContent = 'All genres';
    elements.genreDropdownBadge.classList.add('hidden');
    return;
  }

  if (selected.length === 1) {
    elements.genreDropdownLabel.textContent = selected[0].value;
  } else {
    elements.genreDropdownLabel.textContent = selected.length + ' genres selected';
  }

  elements.genreDropdownBadge.textContent = String(selected.length);
  elements.genreDropdownBadge.classList.remove('hidden');
}

function closeGenreDropdown() {
  elements.genreDropdownMenu.classList.remove('open');
  elements.genreDropdownToggle.setAttribute('aria-expanded', 'false');
}

function toggleGenreDropdown() {
  const isOpen = !elements.genreDropdownMenu.classList.contains('open');
  elements.genreDropdownMenu.classList.toggle('open', isOpen);
  elements.genreDropdownToggle.setAttribute('aria-expanded', String(isOpen));
}

function applyGenreSelectionFromUrl() {
  const selectedSet = new Set(new URLSearchParams(window.location.search).getAll('genre'));
  const checkboxes = elements.filtersForm.querySelectorAll('input[name="genre"]');
  checkboxes.forEach(function (checkbox) {
    checkbox.checked = selectedSet.has(checkbox.value);
  });
}

function renderGenreOptions() {
  elements.genreDropdownMenu.innerHTML = '';
  for (const genre of state.genres) {
    const wrapper = document.createElement('label');
    wrapper.className = 'genre-checkbox-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'genre';
    checkbox.value = genre.genre_name;
    checkbox.addEventListener('change', updateGenreDropdownLabel);

    const labelText = document.createElement('span');
    labelText.textContent = genre.genre_name;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelText);
    elements.genreDropdownMenu.appendChild(wrapper);
  }

  elements.statGenreCount.textContent = String(state.genres.length);
  applyGenreSelectionFromUrl();
  updateGenreDropdownLabel();
}

function renderMediaCards() {
  elements.mediaGrid.innerHTML = '';

  if (state.media.length === 0) {
    elements.mediaGrid.innerHTML = '<p class="status-message">No titles matched the current filters.</p>';
    elements.resultsSummary.textContent = '0 results';
    elements.statMediaCount.textContent = '0';
    elements.pageSummary.textContent = 'Page 0 of 0';
    elements.prevPageButton.disabled = true;
    elements.nextPageButton.disabled = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.media.forEach(function (item, index) {
    const node = elements.mediaCardTemplate.content.firstElementChild.cloneNode(true);
    node.style.animationDelay = String(index * 35) + 'ms';
    node.querySelector('.media-type').textContent = formatMediaType(item.media_type);
    node.querySelector('.release-year').textContent = String(formatYear(item.release_date));
    node.querySelector('.media-title').textContent = item.title;
    node.querySelector('.media-genres').textContent = item.genres || 'No genres listed';
    node.querySelector('.critic-score').textContent = formatScore(item.average_critic_score);
    node.querySelector('.audience-score').textContent = formatScore(item.average_audience_score);
    node.querySelector('.view-details').addEventListener('click', function () {
      loadMediaDetails(item.media_id);
    });

    const starButton = node.querySelector('.favorite-star-button');
    setStarButtonState(starButton, isFavoritedValue(item.is_favorited));
    starButton.addEventListener('click', async function () {
      starButton.disabled = true;
      try {
        await setFavorite(item.media_id, !isFavoritedValue(item.is_favorited));
      } finally {
        starButton.disabled = false;
      }
    });
    fragment.appendChild(node);
  });

  elements.mediaGrid.appendChild(fragment);
  const startRow = state.pagination.total === 0 ? 0 : ((state.page - 1) * Number(document.getElementById('limit-select').value)) + 1;
  const endRow = Math.min(startRow + state.media.length - 1, state.pagination.total);
  elements.resultsSummary.textContent = 'Showing ' + startRow + '-' + endRow + ' of ' + state.pagination.total;
  elements.statMediaCount.textContent = String(state.pagination.total);
  elements.pageSummary.textContent = 'Page ' + state.page + ' of ' + state.pagination.totalPages;
  elements.prevPageButton.disabled = !state.pagination.hasPreviousPage;
  elements.nextPageButton.disabled = !state.pagination.hasNextPage;
}

function renderContributors() {
  elements.contributorsList.innerHTML = '';

  if (state.contributors.length === 0) {
    elements.contributorsList.innerHTML = '<p class="status-message">No contributor data available.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  state.contributors.slice(0, 6).forEach(function (contributor) {
    const item = document.createElement('article');
    item.className = 'contributor-item';
    item.innerHTML =
      '<strong>' + escapeHtml(contributor.full_name) + '</strong>' +
      '<p class="contributor-meta">' + escapeHtml(contributor.role_name) + ' • ' + escapeHtml(contributor.total_media_credits) + ' credited titles</p>' +
      '<p class="contributor-meta">' + escapeHtml(contributor.country_of_origin || 'Country unknown') + '</p>';
    fragment.appendChild(item);
  });

  elements.contributorsList.appendChild(fragment);
}

function renderFavorites() {
  elements.favoritesList.innerHTML = '';
  if (state.favorites.length === 0) {
    elements.favoritesList.innerHTML = '<p class="status-message">No favorites yet. Star titles from the catalog.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  state.favorites.forEach(function (item) {
    const row = document.createElement('article');
    row.className = 'contributor-item favorite-item';
    row.innerHTML =
      '<div class="favorite-row">' +
        '<button class="favorite-title-button" type="button">' + escapeHtml(item.title) + '</button>' +
        '<button class="favorite-star-button favorited" type="button" aria-label="Remove favorite" title="Remove favorite"><span class="star-glyph" aria-hidden="true">★</span></button>' +
      '</div>' +
      '<p class="contributor-meta">' + escapeHtml(formatMediaType(item.media_type)) + ' • ' + escapeHtml(formatYear(item.release_date)) + '</p>';

    row.querySelector('.favorite-title-button').addEventListener('click', function () {
      loadMediaDetails(item.media_id);
    });
    row.querySelector('.favorite-star-button').addEventListener('click', async function () {
      await setFavorite(item.media_id, false);
    });
    fragment.appendChild(row);
  });
  elements.favoritesList.appendChild(fragment);
}

function renderMediaDetail(item) {
  const genres = item.genres
    .map(function (genre) { return '<span class="genre-chip">' + escapeHtml(genre.genre_name) + '</span>'; })
    .join('');

  const contributors = item.contributors
    .map(function (credit) {
      const roleLine = credit.role_name + (credit.character_name ? ' • ' + credit.character_name : '');
      return '<span class="genre-chip">' + escapeHtml(credit.full_name + ' · ' + roleLine) + '</span>';
    })
    .join('');

  const subtypeMeta = item.media_type === 'MOVIE'
    ? '<div class="detail-metric"><span class="score-label">Runtime</span><strong>' + escapeHtml(item.runtime_minutes || 'N/A') + ' min</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Box Office</span><strong>' + escapeHtml(item.box_office_usd ? '$' + Number(item.box_office_usd).toLocaleString() : 'N/A') + '</strong></div>'
    : '<div class="detail-metric"><span class="score-label">Seasons</span><strong>' + escapeHtml(item.total_seasons || 'N/A') + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Episodes</span><strong>' + escapeHtml(item.total_episodes || 'N/A') + '</strong></div>';

  elements.detailContent.innerHTML =
    '<div class="detail-top">' +
      '<div class="detail-pills">' +
        '<span class="pill">' + escapeHtml(formatMediaType(item.media_type)) + '</span>' +
        '<span class="pill">' + escapeHtml(formatYear(item.release_date)) + '</span>' +
        '<span class="pill">' + escapeHtml(item.age_certification || 'Unrated') + '</span>' +
      '</div>' +
      '<h3 class="detail-title">' + escapeHtml(item.title) + '</h3>' +
      '<p class="detail-copy">' + escapeHtml(item.synopsis || 'No synopsis available.') + '</p>' +
      '<button id="detail-star-button" class="favorite-star-button' + (isFavoritedValue(item.is_favorited) ? ' favorited' : '') + '" type="button" aria-label="Toggle favorite"><span class="star-glyph">' + (isFavoritedValue(item.is_favorited) ? '★' : '☆') + '</span></button>' +
    '</div>' +
    '<div class="detail-grid">' +
      '<div class="detail-metric"><span class="score-label">Critic Score</span><strong>' + escapeHtml(formatScore(item.average_critic_score)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Audience Score</span><strong>' + escapeHtml(formatScore(item.average_audience_score)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Avg User Rating</span><strong>' + escapeHtml(formatScore(item.user_summary.avg_user_rating)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Total Ratings</span><strong>' + escapeHtml(item.user_summary.total_ratings) + '</strong></div>' +
      subtypeMeta +
    '</div>' +
    '<section class="detail-section"><p class="score-label">Genres</p><div class="genre-chip-row">' + (genres || '<span class="detail-meta">No genres</span>') + '</div></section>' +
    '<section class="detail-section"><p class="score-label">Contributor Credits</p><div class="credit-list">' + (contributors || '<span class="detail-meta">No credits</span>') + '</div></section>';

  elements.detailEmpty.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');
  const detailStarButton = document.getElementById('detail-star-button');
  detailStarButton.addEventListener('click', async function () {
    await setFavorite(item.media_id, !isFavoritedValue(item.is_favorited));
  });
}

async function loadGenres() {
  const payload = await apiFetch('/api/genres');
  state.genres = payload.data || [];
  renderGenreOptions();
}

async function loadMedia() {
  setLoading(true);
  setError('');
  try {
    const queryString = buildQueryString();
    const payload = await apiFetch('/api/media?' + queryString + '&userId=' + currentUserId);
    state.media = payload.data || [];
    state.pagination = payload.pagination || state.pagination;
    state.page = state.pagination.page || state.page;
    syncUrlWithCurrentFilters();
    renderMediaCards();
  } catch (error) {
    setError('Could not load media catalog. Check the API and database connection.');
  } finally {
    setLoading(false);
  }
}

async function loadContributors() {
  try {
    const payload = await apiFetch('/api/contributors');
    state.contributors = payload.data || [];
    renderContributors();
  } catch (error) {
    elements.contributorsList.innerHTML = '<p class="status-message error">Could not load contributors.</p>';
  }
}

async function loadFavorites() {
  try {
    const payload = await apiFetch('/api/media/favorites?userId=' + currentUserId);
    state.favorites = payload.data || [];
    renderFavorites();
  } catch (error) {
    elements.favoritesList.innerHTML = '<p class="status-message error">Could not load favorites.</p>';
  }
}

async function loadMediaDetails(mediaId) {
  state.selectedMediaId = mediaId;
  try {
    const payload = await apiFetch('/api/media/' + mediaId + '?userId=' + currentUserId);
    renderMediaDetail(payload.data);
  } catch (error) {
    setError('Could not load the selected media details.');
  }
}

function updateLocalFavoriteState(mediaId, isFavorited) {
  state.media = state.media.map(function (item) {
    if (item.media_id !== mediaId) {
      return item;
    }
    return {
      ...item,
      is_favorited: isFavorited ? 1 : 0
    };
  });
}

async function setFavorite(mediaId, shouldFavorite) {
  const method = shouldFavorite ? 'POST' : 'DELETE';
  await apiFetch('/api/media/' + mediaId + '/favorite?userId=' + currentUserId, { method });
  updateLocalFavoriteState(mediaId, shouldFavorite);
  renderMediaCards();
  await loadFavorites();
  if (state.selectedMediaId === mediaId) {
    await loadMediaDetails(mediaId);
  }
}

function resetFilters() {
  elements.filtersForm.reset();
  state.page = 1;
  updateGenreDropdownLabel();
  closeGenreDropdown();
  loadMedia();
}

async function initializeApp() {
  await Promise.all([loadGenres(), loadContributors(), loadFavorites()]);
  await loadMedia();
}

elements.filtersForm.addEventListener('submit', function (event) {
  event.preventDefault();
  state.page = 1;
  loadMedia();
});

elements.filtersForm.addEventListener('change', function () {
  state.page = 1;
});

elements.resetButton.addEventListener('click', resetFilters);
elements.genreDropdownToggle.addEventListener('click', toggleGenreDropdown);
elements.filtersForm.addEventListener('reset', function () {
  setTimeout(function () {
    updateGenreDropdownLabel();
    closeGenreDropdown();
  }, 0);
});

elements.prevPageButton.addEventListener('click', function () {
  if (state.pagination.hasPreviousPage) {
    state.page -= 1;
    loadMedia();
  }
});

elements.nextPageButton.addEventListener('click', function () {
  if (state.pagination.hasNextPage) {
    state.page += 1;
    loadMedia();
  }
});

document.addEventListener('click', function (event) {
  if (elements.genreDropdown && !elements.genreDropdown.contains(event.target)) {
    closeGenreDropdown();
  }
});

elements.refreshContributors.addEventListener('click', loadContributors);

syncStateFromUrl();
initializeApp();
