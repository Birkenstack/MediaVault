const state = {
  media: [],
  genres: [],
  contributors: [],
  selectedMediaId: null,
  lastFocusedTrigger: null,
  pagination: {
    page: 1,
    limit: 24,
    total: 0,
    hasMore: false
  },
  filters: parseFiltersFromUrl()
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
  detailsModal: document.getElementById('details-modal'),
  modalCloseButton: document.getElementById('modal-close-button'),
  detailEmpty: document.getElementById('detail-empty'),
  detailContent: document.getElementById('detail-content'),
  resultsSummary: document.getElementById('results-summary'),
  paginationControls: document.getElementById('pagination-controls'),
  paginationSummary: document.getElementById('pagination-summary'),
  previousPageButton: document.getElementById('previous-page-button'),
  nextPageButton: document.getElementById('next-page-button'),
  contributorsList: document.getElementById('contributors-list'),
  statMediaCount: document.getElementById('stat-media-count'),
  statGenreCount: document.getElementById('stat-genre-count'),
  refreshContributors: document.getElementById('refresh-contributors'),
  mediaCardTemplate: document.getElementById('media-card-template')
};

function parseFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = Number.parseInt(params.get('page'), 10);

  return {
    search: params.get('search') || '',
    type: params.get('type') || '',
    genres: params.getAll('genre'),
    minCriticScore: params.get('minCriticScore') || '',
    minAudienceScore: params.get('minAudienceScore') || '',
    sortBy: params.get('sortBy') || 'release_date',
    sortOrder: params.get('sortOrder') || 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1
  };
}

async function apiFetch(path) {
  const response = await fetch(path);
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

function applyFiltersToForm() {
  elements.filtersForm.elements.search.value = state.filters.search;
  elements.filtersForm.elements.type.value = state.filters.type;
  elements.filtersForm.elements.minCriticScore.value = state.filters.minCriticScore;
  elements.filtersForm.elements.minAudienceScore.value = state.filters.minAudienceScore;
  elements.filtersForm.elements.sortBy.value = state.filters.sortBy;
  elements.filtersForm.elements.sortOrder.value = state.filters.sortOrder;
  state.pagination.page = state.filters.page;
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

  params.set('limit', String(state.pagination.limit));
  params.set('offset', String((state.pagination.page - 1) * state.pagination.limit));
  return params.toString();
}

function syncUrlWithState() {
  const params = new URLSearchParams();
  const formData = new FormData(elements.filtersForm);

  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue).trim();
    if (value) {
      params.append(key, value);
    }
  }

  if (state.pagination.page > 1) {
    params.set('page', String(state.pagination.page));
  }

  const queryString = params.toString();
  const nextUrl = queryString ? window.location.pathname + '?' + queryString : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
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

function renderGenreOptions() {
  elements.genreDropdownMenu.innerHTML = '';

  for (const genre of state.genres) {
    const wrapper = document.createElement('label');
    wrapper.className = 'genre-checkbox-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'genre';
    checkbox.value = genre.genre_name;
    checkbox.checked = state.filters.genres.includes(genre.genre_name);
    checkbox.addEventListener('change', updateGenreDropdownLabel);

    const labelText = document.createElement('span');
    labelText.textContent = genre.genre_name;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelText);
    elements.genreDropdownMenu.appendChild(wrapper);
  }

  elements.statGenreCount.textContent = String(state.genres.length);
  updateGenreDropdownLabel();
}

function renderMediaCards() {
  elements.mediaGrid.innerHTML = '';

  if (state.media.length === 0) {
    elements.mediaGrid.innerHTML = '<p class="status-message">No titles matched the current filters.</p>';
    elements.resultsSummary.textContent = '0 results';
    elements.statMediaCount.textContent = '0';
    renderPagination();
    return;
  }

  const fragment = document.createDocumentFragment();

  state.media.forEach((item, index) => {
    const node = elements.mediaCardTemplate.content.firstElementChild.cloneNode(true);
    node.style.animationDelay = String(index * 35) + 'ms';
    node.querySelector('.media-type').textContent = formatMediaType(item.media_type);
    node.querySelector('.release-year').textContent = String(formatYear(item.release_date));
    node.querySelector('.media-title').textContent = item.title;
    node.querySelector('.media-genres').textContent = item.genres || 'No genres listed';
    node.querySelector('.critic-score').textContent = formatScore(item.average_critic_score);
    node.querySelector('.audience-score').textContent = formatScore(item.average_audience_score);
    node.querySelector('.view-details').addEventListener('click', function (event) {
      loadMediaDetails(item.media_id, event.currentTarget);
    });
    fragment.appendChild(node);
  });

  elements.mediaGrid.appendChild(fragment);
  renderPagination();
}

function renderPagination() {
  const total = state.pagination.total;
  const limit = state.pagination.limit;
  const currentPage = state.pagination.page;

  if (total === 0) {
    elements.paginationControls.classList.add('hidden');
    elements.resultsSummary.textContent = '0 results';
    elements.paginationSummary.textContent = 'Page 1';
    return;
  }

  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(start + state.media.length - 1, total);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  elements.resultsSummary.textContent = start + '-' + end + ' of ' + total + ' titles';
  elements.paginationSummary.textContent = 'Page ' + currentPage + ' of ' + totalPages;
  elements.previousPageButton.disabled = currentPage === 1;
  elements.nextPageButton.disabled = !state.pagination.hasMore;
  elements.paginationControls.classList.toggle('hidden', totalPages <= 1);
  elements.statMediaCount.textContent = String(total);
}

function renderContributors() {
  elements.contributorsList.innerHTML = '';

  if (state.contributors.length === 0) {
    elements.contributorsList.innerHTML = '<p class="status-message">No contributor data available.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  state.contributors.slice(0, 6).forEach((contributor) => {
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

function renderMediaDetail(item) {
  const genres = item.genres
    .map((genre) => '<span class="genre-chip">' + escapeHtml(genre.genre_name) + '</span>')
    .join('');

  const contributors = item.contributors
    .map((credit) => {
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
}

function openDetailsModal(triggerElement) {
  state.lastFocusedTrigger = triggerElement || document.activeElement;
  elements.detailsModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  elements.modalCloseButton.focus();
}

function closeDetailsModal() {
  elements.detailsModal.classList.add('hidden');
  document.body.classList.remove('modal-open');

  if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
    state.lastFocusedTrigger.focus();
  }
}

function showDetailLoading() {
  elements.detailEmpty.textContent = 'Loading title details...';
  elements.detailEmpty.classList.remove('hidden');
  elements.detailContent.classList.add('hidden');
  elements.detailContent.innerHTML = '';
}

function showDetailError() {
  elements.detailEmpty.textContent = 'Could not load the selected media details.';
  elements.detailEmpty.classList.remove('hidden');
  elements.detailContent.classList.add('hidden');
  elements.detailContent.innerHTML = '';
}

async function loadGenres() {
  const payload = await apiFetch('/api/genres');
  state.genres = payload.data || [];
  renderGenreOptions();
}

async function loadMedia() {
  setLoading(true);
  setError('');
  syncUrlWithState();

  try {
    const queryString = buildQueryString();
    const payload = await apiFetch('/api/media?' + queryString);
    state.media = payload.data || [];
    state.pagination.total = payload.pagination?.total || 0;
    state.pagination.hasMore = Boolean(payload.pagination?.hasMore);
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

async function loadMediaDetails(mediaId, triggerElement) {
  state.selectedMediaId = mediaId;
  showDetailLoading();
  openDetailsModal(triggerElement);

  try {
    const payload = await apiFetch('/api/media/' + mediaId);
    renderMediaDetail(payload.data);
  } catch (error) {
    showDetailError();
  }
}

function resetFilters() {
  state.pagination.page = 1;
  elements.filtersForm.reset();
  state.filters = {
    search: '',
    type: '',
    genres: [],
    minCriticScore: '',
    minAudienceScore: '',
    sortBy: 'release_date',
    sortOrder: 'desc',
    page: 1
  };
  updateGenreDropdownLabel();
  closeGenreDropdown();
  loadMedia();
}

async function initializeApp() {
  applyFiltersToForm();
  await Promise.all([loadGenres(), loadContributors()]);
  await loadMedia();
}

function handleFilterSubmit(event) {
  event.preventDefault();
  state.pagination.page = 1;
  loadMedia();
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage === state.pagination.page) {
    return;
  }

  state.pagination.page = nextPage;
  loadMedia();
}

function restoreStateFromUrl() {
  state.filters = parseFiltersFromUrl();
  applyFiltersToForm();
  renderGenreOptions();
  closeGenreDropdown();
  loadMedia();
}

elements.filtersForm.addEventListener('submit', handleFilterSubmit);

elements.resetButton.addEventListener('click', resetFilters);

elements.genreDropdownToggle.addEventListener('click', function () {
  toggleGenreDropdown();
});

elements.filtersForm.addEventListener('reset', function () {
  setTimeout(function () {
    updateGenreDropdownLabel();
    closeGenreDropdown();
  }, 0);
});

document.addEventListener('click', function (event) {
  if (elements.genreDropdown && !elements.genreDropdown.contains(event.target)) {
    closeGenreDropdown();
  }
});

elements.refreshContributors.addEventListener('click', loadContributors);
elements.previousPageButton.addEventListener('click', function () {
  changePage(state.pagination.page - 1);
});
elements.nextPageButton.addEventListener('click', function () {
  changePage(state.pagination.page + 1);
});
window.addEventListener('popstate', restoreStateFromUrl);
elements.modalCloseButton.addEventListener('click', closeDetailsModal);
elements.detailsModal.addEventListener('click', function (event) {
  if (event.target.dataset.closeModal === 'true') {
    closeDetailsModal();
  }
});
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !elements.detailsModal.classList.contains('hidden')) {
    closeDetailsModal();
  }
});

initializeApp();
