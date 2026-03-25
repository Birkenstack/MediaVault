const state = {
  media: [],
  genres: [],
  contributors: [],
  selectedMediaId: null
};

const elements = {
  filtersForm: document.getElementById('filters-form'),
  resetButton: document.getElementById('reset-button'),
  genreSelect: document.getElementById('genre-select'),
  mediaGrid: document.getElementById('media-grid'),
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  detailEmpty: document.getElementById('detail-empty'),
  detailContent: document.getElementById('detail-content'),
  resultsSummary: document.getElementById('results-summary'),
  contributorsList: document.getElementById('contributors-list'),
  statMediaCount: document.getElementById('stat-media-count'),
  statGenreCount: document.getElementById('stat-genre-count'),
  refreshContributors: document.getElementById('refresh-contributors'),
  mediaCardTemplate: document.getElementById('media-card-template')
};

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

function buildQueryString() {
  const formData = new FormData(elements.filtersForm);
  const params = new URLSearchParams();

  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue).trim();
    if (value) {
      params.set(key, value);
    }
  }

  params.set('limit', '24');
  return params.toString();
}

function renderGenreOptions() {
  elements.genreSelect.innerHTML = '<option value="">All genres</option>';

  for (const genre of state.genres) {
    const option = document.createElement('option');
    option.value = genre.genre_name;
    option.textContent = genre.genre_name;
    elements.genreSelect.appendChild(option);
  }

  elements.statGenreCount.textContent = String(state.genres.length);
}

function renderMediaCards() {
  elements.mediaGrid.innerHTML = '';

  if (state.media.length === 0) {
    elements.mediaGrid.innerHTML = '<p class="status-message">No titles matched the current filters.</p>';
    elements.resultsSummary.textContent = '0 results';
    elements.statMediaCount.textContent = '0';
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
    node.querySelector('.view-details').addEventListener('click', function () {
      loadMediaDetails(item.media_id);
    });
    fragment.appendChild(node);
  });

  elements.mediaGrid.appendChild(fragment);
  elements.resultsSummary.textContent = state.media.length + ' titles loaded';
  elements.statMediaCount.textContent = String(state.media.length);
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
    const payload = await apiFetch('/api/media?' + queryString);
    state.media = payload.data || [];
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

async function loadMediaDetails(mediaId) {
  state.selectedMediaId = mediaId;

  try {
    const payload = await apiFetch('/api/media/' + mediaId);
    renderMediaDetail(payload.data);
  } catch (error) {
    setError('Could not load the selected media details.');
  }
}

function resetFilters() {
  elements.filtersForm.reset();
  loadMedia();
}

async function initializeApp() {
  await Promise.all([loadGenres(), loadContributors()]);
  await loadMedia();
}

elements.filtersForm.addEventListener('submit', function (event) {
  event.preventDefault();
  loadMedia();
});

elements.resetButton.addEventListener('click', resetFilters);

elements.refreshContributors.addEventListener('click', loadContributors);

initializeApp();
