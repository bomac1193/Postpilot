// PostPilot Frontend Application
class PostPilot {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('postpilot_token');
    this.currentUser = null;
    this.currentGrid = null;
    this.currentContent = [];
    window.app = this; // Make available globally for collections manager
    this.init();
  }

  async init() {
    this.setupEventListeners();

    // Check for Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('google')) {
      this.handleGoogleCallback(urlParams);
      return;
    }

    if (this.token) {
      await this.loadCurrentUser();
    } else {
      this.showAuthModal();
    }
    this.loadDashboard();
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // Auth
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    document.getElementById('authForm')?.addEventListener('submit', (e) => this.handleAuth(e));
    document.getElementById('authSwitchLink')?.addEventListener('click', (e) => this.toggleAuthMode(e));
    document.getElementById('closeAuthModal')?.addEventListener('click', () => this.hideAuthModal());
    document.getElementById('googleSignInBtn')?.addEventListener('click', () => this.handleGoogleSignIn());

    // Upload
    document.getElementById('uploadContentBtn')?.addEventListener('click', () => this.showUploadModal());
    document.getElementById('closeUploadModal')?.addEventListener('click', () => this.hideUploadModal());
    document.getElementById('cancelUpload')?.addEventListener('click', () => this.hideUploadModal());
    document.getElementById('uploadForm')?.addEventListener('submit', (e) => this.handleUpload(e));
    document.getElementById('mediaFile')?.addEventListener('change', (e) => this.previewFile(e));
    document.getElementById('generateCaptionBtn')?.addEventListener('click', () => this.generateCaption());

    // Grid
    document.getElementById('createGridBtn')?.addEventListener('click', () => this.createGrid());
    document.getElementById('saveGridBtn')?.addEventListener('click', () => this.saveGrid());
    document.getElementById('addRowBtn')?.addEventListener('click', () => this.addRow());
    document.getElementById('removeRowBtn')?.addEventListener('click', () => this.removeRow());
    document.getElementById('gridColumns')?.addEventListener('change', (e) => this.updateGridColumns(e));
    document.getElementById('gridSelector')?.addEventListener('change', (e) => this.loadGrid(e.target.value));

    // Content Modal
    document.getElementById('closeContentModal')?.addEventListener('click', () => this.hideContentModal());
    document.getElementById('analyzeAgainBtn')?.addEventListener('click', () => this.analyzeContent());
    document.getElementById('addToGridBtn')?.addEventListener('click', () => this.addContentToGrid());

    // Social Accounts
    document.getElementById('connectSocial')?.addEventListener('click', () => this.showSocialModal());
    document.getElementById('closeSocialModal')?.addEventListener('click', () => this.hideSocialModal());
    document.getElementById('connectInstagramBtn')?.addEventListener('click', () => this.connectInstagram());
    document.getElementById('disconnectInstagramBtn')?.addEventListener('click', () => this.disconnectInstagram());
    document.getElementById('connectTikTokBtn')?.addEventListener('click', () => this.connectTikTok());
    document.getElementById('disconnectTikTokBtn')?.addEventListener('click', () => this.disconnectTikTok());
  }

  // View Management
  switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const view = document.getElementById(`${viewName}View`);
    if (view) {
      view.classList.add('active');
      document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

      // Load data for the view
      switch(viewName) {
        case 'dashboard':
          this.loadDashboard();
          break;
        case 'content':
          this.loadContentLibrary();
          break;
        case 'collections':
          if (window.collectionsManager) {
            window.collectionsManager.loadCollections();
          }
          break;
        case 'grid':
          this.loadGrids();
          break;
        case 'analytics':
          this.loadAnalytics();
          break;
      }
    }
  }

  // Auth Methods
  async handleAuth(e) {
    e.preventDefault();
    const isLogin = document.getElementById('authModalTitle').textContent === 'Login';

    const data = {
      email: document.getElementById('authEmail').value,
      password: document.getElementById('authPassword').value
    };

    if (!isLogin) {
      data.name = document.getElementById('authName').value;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await this.api(endpoint, 'POST', data, false);

      if (response.token) {
        this.token = response.token;
        localStorage.setItem('postpilot_token', this.token);
        this.currentUser = response.user;
        this.hideAuthModal();
        this.showNotification('Welcome to PostPilot!', 'success');
        this.loadDashboard();
      }
    } catch (error) {
      this.showNotification(error.message || 'Authentication failed', 'error');
    }
  }

  toggleAuthMode(e) {
    e.preventDefault();
    const isLogin = document.getElementById('authModalTitle').textContent === 'Login';

    if (isLogin) {
      document.getElementById('authModalTitle').textContent = 'Sign Up';
      document.getElementById('authSubmitBtn').textContent = 'Sign Up';
      document.getElementById('authSwitchText').textContent = 'Already have an account?';
      document.getElementById('authSwitchLink').textContent = 'Login';
      document.getElementById('nameGroup').style.display = 'block';
    } else {
      document.getElementById('authModalTitle').textContent = 'Login';
      document.getElementById('authSubmitBtn').textContent = 'Login';
      document.getElementById('authSwitchText').textContent = "Don't have an account?";
      document.getElementById('authSwitchLink').textContent = 'Sign up';
      document.getElementById('nameGroup').style.display = 'none';
    }
  }

  async loadCurrentUser() {
    try {
      const response = await this.api('/auth/me');
      this.currentUser = response.user;
      document.querySelector('.user-name').textContent = this.currentUser.name;
    } catch (error) {
      this.logout();
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('postpilot_token');
    this.showAuthModal();
  }

  handleGoogleSignIn() {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  }

  handleGoogleCallback(urlParams) {
    const status = urlParams.get('google');
    const token = urlParams.get('token');

    // Clear URL parameters
    window.history.replaceState({}, document.title, '/');

    if (status === 'success' && token) {
      this.token = token;
      localStorage.setItem('postpilot_token', this.token);
      this.showNotification('Successfully signed in with Google!', 'success');
      this.loadCurrentUser().then(() => {
        this.loadDashboard();
      });
    } else {
      this.showNotification('Google sign-in failed. Please try again.', 'error');
      this.showAuthModal();
    }
  }

  // Modal Management
  showAuthModal() {
    document.getElementById('authModal').classList.add('active');
  }

  hideAuthModal() {
    document.getElementById('authModal').classList.remove('active');
  }

  showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
  }

  hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadForm').reset();
    document.getElementById('filePreview').innerHTML = '';
  }

  async showSocialModal() {
    document.getElementById('socialAccountsModal').classList.add('active');
    await this.loadSocialStatus();
  }

  hideSocialModal() {
    document.getElementById('socialAccountsModal').classList.remove('active');
  }

  async loadSocialStatus() {
    try {
      const response = await this.api('/auth/social/status');

      // Update Instagram status
      const instagramStatus = document.getElementById('instagramStatus');
      const connectInstagramBtn = document.getElementById('connectInstagramBtn');
      const disconnectInstagramBtn = document.getElementById('disconnectInstagramBtn');

      if (response.instagram.connected) {
        instagramStatus.textContent = `Connected${response.instagram.username ? ' as ' + response.instagram.username : ''}`;
        instagramStatus.classList.add('connected');
        connectInstagramBtn.style.display = 'none';
        disconnectInstagramBtn.style.display = 'block';
      } else {
        instagramStatus.textContent = 'Not connected';
        instagramStatus.classList.remove('connected');
        connectInstagramBtn.style.display = 'block';
        disconnectInstagramBtn.style.display = 'none';
      }

      // Update TikTok status
      const tiktokStatus = document.getElementById('tiktokStatus');
      const connectTikTokBtn = document.getElementById('connectTikTokBtn');
      const disconnectTikTokBtn = document.getElementById('disconnectTikTokBtn');

      if (response.tiktok.connected) {
        tiktokStatus.textContent = `Connected${response.tiktok.username ? ' as ' + response.tiktok.username : ''}`;
        tiktokStatus.classList.add('connected');
        connectTikTokBtn.style.display = 'none';
        disconnectTikTokBtn.style.display = 'block';
      } else {
        tiktokStatus.textContent = 'Not connected';
        tiktokStatus.classList.remove('connected');
        connectTikTokBtn.style.display = 'block';
        disconnectTikTokBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to load social status:', error);
    }
  }

  connectInstagram() {
    window.location.href = '/api/auth/instagram';
  }

  async disconnectInstagram() {
    try {
      await this.api('/auth/instagram/disconnect', 'POST');
      this.showNotification('Instagram disconnected successfully', 'success');
      this.loadSocialStatus();
    } catch (error) {
      this.showNotification('Failed to disconnect Instagram', 'error');
    }
  }

  connectTikTok() {
    window.location.href = '/api/auth/tiktok';
  }

  async disconnectTikTok() {
    try {
      await this.api('/auth/tiktok/disconnect', 'POST');
      this.showNotification('TikTok disconnected successfully', 'success');
      this.loadSocialStatus();
    } catch (error) {
      this.showNotification('Failed to disconnect TikTok', 'error');
    }
  }

  showContentModal(content) {
    const modal = document.getElementById('contentModal');
    modal.classList.add('active');
    modal.dataset.contentId = content._id;

    document.getElementById('contentPreviewImage').src = content.thumbnailUrl || content.mediaUrl;
    document.getElementById('contentDetailTitle').textContent = content.title;
    document.getElementById('contentDetailCaption').textContent = content.caption || 'No caption';

    // Display AI scores
    this.displayScores(content.aiScores);
    this.displayRecommendations(content.aiSuggestions);
  }

  hideContentModal() {
    document.getElementById('contentModal').classList.remove('active');
  }

  // Dashboard
  async loadDashboard() {
    try {
      const [content, grids] = await Promise.all([
        this.api('/content'),
        this.api('/grid')
      ]);

      document.getElementById('totalContent').textContent = content.content?.length || 0;
      document.getElementById('totalGrids').textContent = grids.grids?.length || 0;

      const scheduled = content.content?.filter(c => c.status === 'scheduled').length || 0;
      document.getElementById('scheduledPosts').textContent = scheduled;

      const avgScore = this.calculateAverageScore(content.content || []);
      document.getElementById('avgScore').textContent = avgScore;

    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }

  calculateAverageScore(content) {
    if (!content.length) return 0;
    const total = content.reduce((sum, item) => {
      return sum + (item.aiScores?.overallScore || 0);
    }, 0);
    return Math.round(total / content.length);
  }

  // Content Library
  async loadContentLibrary() {
    try {
      const response = await this.api('/content');
      this.currentContent = response.content || [];

      const container = document.getElementById('contentLibrary');
      container.innerHTML = '';

      if (this.currentContent.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No content yet. Upload your first piece!</p>';
        return;
      }

      this.currentContent.forEach(content => {
        const item = this.createContentItem(content);
        container.appendChild(item);
      });
    } catch (error) {
      console.error('Content library load error:', error);
    }
  }

  createContentItem(content) {
    const div = document.createElement('div');
    div.className = 'content-item';
    div.onclick = () => this.showContentModal(content);

    div.innerHTML = `
      <img src="${content.thumbnailUrl || content.mediaUrl}" alt="${content.title}" class="content-item-image">
      <div class="content-item-info">
        <div class="content-item-title">${content.title}</div>
        <div class="content-item-meta">
          <span>${content.platform}</span>
          <span class="content-score">${content.aiScores?.overallScore || 0}/100</span>
        </div>
      </div>
    `;

    return div;
  }

  // Upload
  previewFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('filePreview');
      if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 0.5rem;">`;
      } else if (file.type.startsWith('video/')) {
        preview.innerHTML = `<video src="${e.target.result}" controls style="max-width: 100%; border-radius: 0.5rem;"></video>`;
      }

      // Show AI suggestion
      this.showContentTypeSuggestion(file);
    };
    reader.readAsDataURL(file);
  }

  async showContentTypeSuggestion(file) {
    const suggestionsDiv = document.getElementById('aiSuggestions');
    suggestionsDiv.style.display = 'block';

    if (file.type.startsWith('video/')) {
      document.getElementById('suggestionText').textContent =
        '💡 This video would work great as a Reel on Instagram or a standard video on TikTok for maximum engagement!';
    } else {
      document.getElementById('suggestionText').textContent =
        '💡 Consider using this as a carousel post with multiple images to tell a story and increase engagement!';
    }
  }

  async handleUpload(e) {
    e.preventDefault();

    const formData = new FormData();
    const fileInput = document.getElementById('mediaFile');
    formData.append('media', fileInput.files[0]);
    formData.append('title', document.getElementById('contentTitle').value);
    formData.append('caption', document.getElementById('contentCaption').value);
    formData.append('platform', document.getElementById('contentPlatform').value);
    formData.append('mediaType', document.getElementById('contentMediaType').value);

    try {
      const response = await this.apiUpload('/content', formData);
      this.showNotification('Content uploaded successfully!', 'success');
      this.hideUploadModal();

      // Analyze the content
      await this.analyzeContent(response.content._id);
      this.loadContentLibrary();
    } catch (error) {
      this.showNotification(error.message || 'Upload failed', 'error');
    }
  }

  async generateCaption() {
    const contentId = document.getElementById('contentModal').dataset.contentId;
    if (!contentId) return;

    try {
      const response = await this.api('/ai/generate-caption', 'POST', {
        contentId,
        tone: 'casual',
        length: 'medium'
      });

      if (response.captions && response.captions.length > 0) {
        document.getElementById('contentCaption').value = response.captions[0];
        this.showNotification('Caption generated!', 'success');
      }
    } catch (error) {
      console.error('Caption generation error:', error);
    }
  }

  // AI Analysis
  async analyzeContent(contentId = null) {
    const id = contentId || document.getElementById('contentModal').dataset.contentId;
    if (!id) return;

    try {
      this.showNotification('Analyzing content with AI...', 'info');

      const response = await this.api('/ai/analyze', 'POST', { contentId: id });

      this.showNotification('Analysis complete!', 'success');

      // Refresh content display
      const content = await this.api(`/content/${id}`);
      this.displayScores(content.content.aiScores);
      this.displayRecommendations(content.content.aiSuggestions);

    } catch (error) {
      this.showNotification('Analysis failed', 'error');
    }
  }

  displayScores(scores) {
    if (!scores) return;

    this.animateScore('scoreVirality', scores.viralityScore);
    this.animateScore('scoreEngagement', scores.engagementScore);
    this.animateScore('scoreAesthetic', scores.aestheticScore);
    this.animateScore('scoreTrend', scores.trendScore);
    this.animateScore('scoreOverall', scores.overallScore);
  }

  animateScore(elementId, value) {
    const fill = document.getElementById(elementId);
    const valueSpan = document.getElementById(elementId + 'Value');

    if (fill && valueSpan) {
      setTimeout(() => {
        fill.style.width = value + '%';
        valueSpan.textContent = value + '/100';
      }, 100);
    }
  }

  displayRecommendations(suggestions) {
    const container = document.getElementById('recommendationsList');
    if (!container || !suggestions) return;

    container.innerHTML = `
      <p><strong>Recommended Type:</strong> ${suggestions.recommendedType || 'N/A'}</p>
      <p><strong>Reason:</strong> ${suggestions.reason || 'No recommendation available'}</p>
      <p><strong>Best Time to Post:</strong> ${suggestions.bestTimeToPost || 'Anytime'}</p>
      ${suggestions.improvements && suggestions.improvements.length > 0 ? `
        <p><strong>Improvements:</strong></p>
        <ul>
          ${suggestions.improvements.map(imp => `<li>${imp}</li>`).join('')}
        </ul>
      ` : ''}
    `;
  }

  // Grid Management
  async loadGrids() {
    try {
      const response = await this.api('/grid');
      const grids = response.grids || [];

      const selector = document.getElementById('gridSelector');
      selector.innerHTML = '<option value="">Select a grid...</option>';

      grids.forEach(grid => {
        const option = document.createElement('option');
        option.value = grid._id;
        option.textContent = grid.name;
        selector.appendChild(option);
      });

      if (grids.length > 0) {
        this.loadGrid(grids[0]._id);
        selector.value = grids[0]._id;
      }
    } catch (error) {
      console.error('Grids load error:', error);
    }
  }

  async loadGrid(gridId) {
    if (!gridId) return;

    try {
      const response = await this.api(`/grid/${gridId}`);
      this.currentGrid = response.grid;

      document.getElementById('gridName').value = this.currentGrid.name;
      document.getElementById('gridPlatform').value = this.currentGrid.platform;
      document.getElementById('gridColumns').value = this.currentGrid.columns;

      this.renderGrid();
    } catch (error) {
      console.error('Grid load error:', error);
    }
  }

  async createGrid() {
    const name = prompt('Enter grid name:');
    if (!name) return;

    try {
      const response = await this.api('/grid', 'POST', {
        name,
        platform: 'instagram',
        columns: 3,
        totalRows: 3
      });

      this.currentGrid = response.grid;
      this.showNotification('Grid created!', 'success');
      this.loadGrids();
      this.renderGrid();
    } catch (error) {
      this.showNotification('Failed to create grid', 'error');
    }
  }

  renderGrid() {
    if (!this.currentGrid) {
      this.renderEmptyGrid();
      return;
    }

    const container = document.getElementById('instagramGrid');
    container.style.gridTemplateColumns = `repeat(${this.currentGrid.columns}, 1fr)`;
    container.innerHTML = '';

    this.currentGrid.cells.forEach(cell => {
      const cellDiv = this.createGridCell(cell);
      container.appendChild(cellDiv);
    });
  }

  renderEmptyGrid() {
    const container = document.getElementById('instagramGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';

    for (let i = 0; i < 9; i++) {
      const cell = this.createEmptyGridCell(i);
      container.appendChild(cell);
    }
  }

  createGridCell(cell) {
    const div = document.createElement('div');
    div.className = 'grid-cell';
    div.dataset.row = cell.position.row;
    div.dataset.col = cell.position.col;

    if (cell.isEmpty) {
      div.innerHTML = '<span class="grid-cell-placeholder">+</span>';
      div.onclick = () => this.selectContentForCell(cell.position);
    } else {
      div.classList.add('filled');
      const content = cell.contentId;
      if (content) {
        div.innerHTML = `
          <img src="${content.thumbnailUrl || content.mediaUrl}" alt="${content.title}">
          <div class="grid-cell-actions">
            <button class="grid-cell-btn" onclick="postPilot.removeFromGrid(${cell.position.row}, ${cell.position.col})">✕</button>
          </div>
        `;
      }
    }

    return div;
  }

  createEmptyGridCell(index) {
    const div = document.createElement('div');
    div.className = 'grid-cell';
    div.innerHTML = '<span class="grid-cell-placeholder">+</span>';
    return div;
  }

  async addRow() {
    if (!this.currentGrid) return;

    try {
      const response = await this.api(`/grid/${this.currentGrid._id}/add-row`, 'POST');
      this.currentGrid = response.grid;
      this.renderGrid();
      this.showNotification('Row added!', 'success');
    } catch (error) {
      this.showNotification('Failed to add row', 'error');
    }
  }

  async removeRow() {
    if (!this.currentGrid) return;

    try {
      const response = await this.api(`/grid/${this.currentGrid._id}/remove-row`, 'POST');
      this.currentGrid = response.grid;
      this.renderGrid();
      this.showNotification('Row removed!', 'success');
    } catch (error) {
      this.showNotification('Failed to remove row', 'error');
    }
  }

  updateGridColumns(e) {
    const columns = parseInt(e.target.value);
    const container = document.getElementById('instagramGrid');
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  }

  async saveGrid() {
    if (!this.currentGrid) return;

    try {
      await this.api(`/grid/${this.currentGrid._id}`, 'PUT', {
        name: document.getElementById('gridName').value,
        platform: document.getElementById('gridPlatform').value,
        columns: parseInt(document.getElementById('gridColumns').value)
      });

      this.showNotification('Grid saved!', 'success');
    } catch (error) {
      this.showNotification('Failed to save grid', 'error');
    }
  }

  selectContentForCell(position) {
    // Show content library and select content to add
    this.switchView('content');
    this.showNotification('Click on content to add it to the grid', 'info');
    this.selectedGridPosition = position;
  }

  async addContentToGrid() {
    const contentId = document.getElementById('contentModal').dataset.contentId;
    if (!contentId || !this.currentGrid) return;

    try {
      // If we have a selected position, use it; otherwise find first empty cell
      let position = this.selectedGridPosition;
      if (!position) {
        const emptyCell = this.currentGrid.cells.find(c => c.isEmpty);
        if (emptyCell) {
          position = emptyCell.position;
        }
      }

      if (!position) {
        this.showNotification('Grid is full! Add more rows.', 'warning');
        return;
      }

      const response = await this.api(`/grid/${this.currentGrid._id}/add-content`, 'POST', {
        contentId,
        row: position.row,
        col: position.col
      });

      this.currentGrid = response.grid;
      this.hideContentModal();
      this.switchView('grid');
      this.renderGrid();
      this.showNotification('Content added to grid!', 'success');
      this.selectedGridPosition = null;
    } catch (error) {
      this.showNotification('Failed to add content to grid', 'error');
    }
  }

  async removeFromGrid(row, col) {
    if (!this.currentGrid) return;

    try {
      const response = await this.api(`/grid/${this.currentGrid._id}/remove-content`, 'POST', {
        row,
        col
      });

      this.currentGrid = response.grid;
      this.renderGrid();
      this.showNotification('Content removed from grid!', 'success');
    } catch (error) {
      this.showNotification('Failed to remove content', 'error');
    }
  }

  // Analytics
  async loadAnalytics() {
    try {
      const response = await this.api('/content');
      const content = response.content || [];

      const container = document.getElementById('analyticsContent');
      container.innerHTML = '';

      if (content.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No content to analyze yet.</p>';
        return;
      }

      // Sort by overall score
      const sorted = content.sort((a, b) =>
        (b.aiScores?.overallScore || 0) - (a.aiScores?.overallScore || 0)
      );

      sorted.slice(0, 6).forEach(item => {
        const card = this.createAnalyticsCard(item);
        container.appendChild(card);
      });
    } catch (error) {
      console.error('Analytics load error:', error);
    }
  }

  createAnalyticsCard(content) {
    const div = document.createElement('div');
    div.className = 'content-item';
    div.onclick = () => this.showContentModal(content);

    div.innerHTML = `
      <img src="${content.thumbnailUrl || content.mediaUrl}" alt="${content.title}" class="content-item-image">
      <div class="content-item-info">
        <div class="content-item-title">${content.title}</div>
        <div style="font-size: 0.875rem; margin-top: 0.5rem;">
          <div>Overall: ${content.aiScores?.overallScore || 0}/100</div>
          <div>Virality: ${content.aiScores?.viralityScore || 0}/100</div>
          <div>Engagement: ${content.aiScores?.engagementScore || 0}/100</div>
        </div>
      </div>
    `;

    return div;
  }

  // API Methods
  async api(endpoint, method = 'GET', body = null, requireAuth = true) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (requireAuth && this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(this.apiBase + endpoint, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async apiUpload(endpoint, formData) {
    const options = {
      method: 'POST',
      headers: {}
    };

    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    options.body = formData;

    const response = await fetch(this.apiBase + endpoint, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  // Notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }
}

// Initialize the app
const postPilot = new PostPilot();
