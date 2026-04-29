const currentUserId = 1;
const state = {
  media: [],
  genres: [],
  contributors: [],
  favorites: [],
  selectedMediaId: null,
  detailData: null,
  crudMode: 'add',
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
  mediaCardTemplate: document.getElementById('media-card-template'),
  openAddMedia: document.getElementById('open-add-media'),
  modalRoot: document.getElementById('modal-root'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalClose: document.getElementById('modal-close'),
  modalTitle: document.getElementById('modal-title'),
  mediaCrudForm: document.getElementById('media-crud-form'),
  crudCancel: document.getElementById('crud-cancel'),
  crudFormError: document.getElementById('crud-form-error'),
  crudMediaId: document.getElementById('crud-media-id'),
  crudMediaType: document.getElementById('crud-media-type'),
  crudMovieFields: document.getElementById('crud-movie-fields'),
  crudTvFields: document.getElementById('crud-tv-fields'),
  crudRuntime: document.getElementById('crud-runtime')
};

async function apiFetch(path, options) {
  const response = await fetch(path, options);
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = {};
    }
  }
  if (!response.ok) {
    const message = data.error || 'Request failed with status ' + response.status;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
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

function toInputDate(dateString) {
  if (!dateString) {
    return '';
  }
  const s = String(dateString);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseGenresInput(value) {
  return String(value || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function toggleCrudSubtypeFields() {
  const type = elements.crudMediaType.value;
  const isMovie = type === 'MOVIE';
  elements.crudMovieFields.classList.toggle('hidden', !isMovie);
  elements.crudTvFields.classList.toggle('hidden', !isMovie);
  elements.crudRuntime.required = state.crudMode === 'add' && isMovie;
}

function setCrudFormError(message) {
  const has = Boolean(message);
  elements.crudFormError.textContent = message || '';
  elements.crudFormError.classList.toggle('hidden', !has);
}

function openMediaModal(mode) {
  state.crudMode = mode;
  elements.modalRoot.classList.remove('hidden');
  elements.modalRoot.setAttribute('aria-hidden', 'false');
  setCrudFormError('');
  elements.crudMediaType.disabled = mode === 'edit';
  toggleCrudSubtypeFields();

  if (mode === 'add') {
    elements.modalTitle.textContent = 'Add title';
    elements.mediaCrudForm.reset();
    elements.crudMediaId.value = '';
    elements.crudMediaType.disabled = false;
    toggleCrudSubtypeFields();
  } else if (state.detailData) {
    const d = state.detailData;
    elements.modalTitle.textContent = 'Edit title';
    elements.crudMediaId.value = String(d.media_id);
    elements.crudMediaType.value = d.media_type;
    document.getElementById('crud-title').value = d.title || '';
    document.getElementById('crud-release-date').value = toInputDate(d.release_date);
    document.getElementById('crud-language').value = d.original_language || '';
    document.getElementById('crud-genres').value = (d.genres || [])
      .map(function (g) { return g.genre_name; })
      .join(', ');
    document.getElementById('crud-synopsis').value = d.synopsis || '';
    if (d.media_type === 'MOVIE') {
      elements.crudRuntime.value = d.runtime_minutes != null ? String(d.runtime_minutes) : '';
      document.getElementById('crud-box-office').value =
        d.box_office_usd != null ? String(d.box_office_usd) : '';
    } else {
      document.getElementById('crud-tv-status').value = d.current_status || 'RUNNING';
      document.getElementById('crud-tv-seasons').value =
        d.total_seasons != null ? String(d.total_seasons) : '1';
      document.getElementById('crud-tv-episodes').value =
        d.total_episodes != null ? String(d.total_episodes) : '';
      document.getElementById('crud-tv-end').value = toInputDate(d.end_date);
    }
    toggleCrudSubtypeFields();
  }

  document.getElementById('crud-title').focus();
}

function closeMediaModal() {
  elements.modalRoot.classList.add('hidden');
  elements.modalRoot.setAttribute('aria-hidden', 'true');
  setCrudFormError('');
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
      '<div class="detail-toolbar">' +
        '<button id="detail-star-button" class="favorite-star-button' + (isFavoritedValue(item.is_favorited) ? ' favorited' : '') + '" type="button" aria-label="Toggle favorite"><span class="star-glyph">' + (isFavoritedValue(item.is_favorited) ? '★' : '☆') + '</span></button>' +
        '<button type="button" id="detail-edit-button" class="button secondary compact">Edit</button>' +
        '<button type="button" id="detail-delete-button" class="button danger compact">Delete</button>' +
      '</div>' +
    '</div>' +
    '<div class="detail-grid">' +
      '<div class="detail-metric"><span class="score-label">Critic Score</span><strong>' + escapeHtml(formatScore(item.average_critic_score)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Audience Score</span><strong>' + escapeHtml(formatScore(item.average_audience_score)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Avg User Rating</span><strong>' + escapeHtml(formatScore(item.user_summary.avg_user_rating)) + '</strong></div>' +
      '<div class="detail-metric"><span class="score-label">Total Ratings</span><strong>' + escapeHtml(item.user_summary.total_ratings) + '</strong></div>' +
      subtypeMeta +
    '</div>' +
    '<section class="detail-section"><p class="score-label">Genres</p><div class="genre-chip-row">' + (genres || '<span class="detail-meta">No genres</span>') + '</div></section>' +
    '<section class="detail-section"><p class="score-label">Contributor Credits</p><div class="credit-list">' + (contributors || '<span class="detail-meta">No credits</span>') + '</div></section>' +
    '<div class="detail-rating-box">' +
      '<p class="score-label">Your rating</p>' +
      '<form id="rating-form">' +
        '<div class="rating-row">' +
          '<label><span>Score (0–10)</span><input id="rating-value" name="ratingValue" type="number" min="0" max="10" step="0.1" required placeholder="e.g. 8.5" /></label>' +
          '<label><span>Review (optional)</span><textarea id="rating-review" name="reviewText" rows="2" placeholder="Short note"></textarea></label>' +
        '</div>' +
        '<div class="button-row">' +
          '<button type="submit" class="button primary">Save rating</button>' +
          '<button type="button" id="rating-remove" class="button secondary">Remove my rating</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  elements.detailEmpty.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');
  const detailStarButton = document.getElementById('detail-star-button');
  detailStarButton.addEventListener('click', async function () {
    await setFavorite(item.media_id, !isFavoritedValue(item.is_favorited));
  });
  document.getElementById('detail-edit-button').addEventListener('click', function () {
    openMediaModal('edit');
  });
  document.getElementById('detail-delete-button').addEventListener('click', deleteSelectedMedia);
  document.getElementById('rating-form').addEventListener('submit', submitRatingForm);
  document.getElementById('rating-remove').addEventListener('click', removeMyRating);
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

function showDetailEmpty() {
  state.selectedMediaId = null;
  state.detailData = null;
  elements.detailEmpty.classList.remove('hidden');
  elements.detailContent.classList.add('hidden');
}

async function loadMediaDetails(mediaId) {
  state.selectedMediaId = mediaId;
  try {
    const payload = await apiFetch('/api/media/' + mediaId + '?userId=' + currentUserId);
    state.detailData = payload.data;
    renderMediaDetail(payload.data);
    setError('');
  } catch (error) {
    setError('Could not load the selected media details.');
  }
}

async function deleteSelectedMedia() {
  if (!state.detailData) {
    return;
  }
  const title = state.detailData.title || 'this title';
  if (!window.confirm('Delete “' + title + '” from the catalog? Related credits and ratings will be removed.')) {
    return;
  }
  const id = state.detailData.media_id;
  try {
    await apiFetch('/api/media/' + id, { method: 'DELETE' });
    showDetailEmpty();
    setError('');
    await loadMedia();
    await loadFavorites();
  } catch (error) {
    setError(error.message);
  }
}

function buildMediaPayloadFromCrudForm(isPatch) {
  const type = elements.crudMediaType.value;
  const title = document.getElementById('crud-title').value.trim();
  const releaseDate = document.getElementById('crud-release-date').value;
  const originalLanguage = document.getElementById('crud-language').value.trim();
  const synopsisRaw = document.getElementById('crud-synopsis').value.trim();
  const genres = parseGenresInput(document.getElementById('crud-genres').value);

  const body = {
    title: title,
    mediaType: type,
    releaseDate: releaseDate,
    originalLanguage: originalLanguage,
    synopsis: synopsisRaw || null
  };

  if (genres.length > 0 || isPatch) {
    body.genres = genres;
  }

  if (type === 'MOVIE') {
    const runtime = Number(document.getElementById('crud-runtime').value);
    body.runtimeMinutes = runtime;
    const boxRaw = document.getElementById('crud-box-office').value.trim();
    if (boxRaw !== '') {
      body.boxOfficeUsd = Number(boxRaw);
    } else if (isPatch) {
      body.boxOfficeUsd = null;
    }
  } else {
    body.currentStatus = document.getElementById('crud-tv-status').value;
    body.totalSeasons = Number(document.getElementById('crud-tv-seasons').value) || 1;
    const epRaw = document.getElementById('crud-tv-episodes').value.trim();
    body.totalEpisodes = epRaw === '' ? null : Number(epRaw);
    const endRaw = document.getElementById('crud-tv-end').value;
    body.endDate = endRaw || null;
  }

  return body;
}

async function submitMediaCrudForm(event) {
  event.preventDefault();
  setCrudFormError('');
  try {
    if (state.crudMode === 'add') {
      const body = buildMediaPayloadFromCrudForm(false);
      const payload = await apiFetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      closeMediaModal();
      await loadMedia();
      if (payload.data && payload.data.media_id) {
        await loadMediaDetails(payload.data.media_id);
      }
    } else {
      const id = elements.crudMediaId.value;
      const body = buildMediaPayloadFromCrudForm(true);
      delete body.mediaType;
      await apiFetch('/api/media/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      closeMediaModal();
      await loadMedia();
      await loadMediaDetails(Number(id));
    }
  } catch (error) {
    setCrudFormError(error.message);
  }
}

async function submitRatingForm(event) {
  event.preventDefault();
  if (!state.detailData) {
    return;
  }
  const mediaId = state.detailData.media_id;
  const ratingValue = Number(document.getElementById('rating-value').value);
  const reviewText = document.getElementById('rating-review').value.trim();
  try {
    await apiFetch('/api/media/' + mediaId + '/rating?userId=' + currentUserId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ratingValue: ratingValue,
        reviewText: reviewText || null
      })
    });
    setError('');
    await loadMediaDetails(mediaId);
  } catch (error) {
    setError(error.message);
  }
}

async function removeMyRating() {
  if (!state.detailData) {
    return;
  }
  const mediaId = state.detailData.media_id;
  try {
    await apiFetch('/api/media/' + mediaId + '/rating?userId=' + currentUserId, {
      method: 'DELETE'
    });
    document.getElementById('rating-value').value = '';
    document.getElementById('rating-review').value = '';
    setError('');
    await loadMediaDetails(mediaId);
  } catch (error) {
    setError(error.message);
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

elements.openAddMedia.addEventListener('click', function () {
  openMediaModal('add');
});
elements.mediaCrudForm.addEventListener('submit', submitMediaCrudForm);
elements.crudCancel.addEventListener('click', closeMediaModal);
elements.modalClose.addEventListener('click', closeMediaModal);
elements.modalBackdrop.addEventListener('click', closeMediaModal);
elements.crudMediaType.addEventListener('change', toggleCrudSubtypeFields);

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !elements.modalRoot.classList.contains('hidden')) {
    closeMediaModal();
  }
});

syncStateFromUrl();
initializeApp();
