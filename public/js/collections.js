/**
 * PostPilot Collections Module
 * Handles collection management with drag-and-drop functionality
 */

class CollectionsManager {
  constructor(app) {
    this.app = app;
    this.currentCollection = null;
    this.draggedElement = null;
    this.draggedContentId = null;
    this.collections = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.dragOverThrottle = null; // For throttling drag over events
  }

  setupEventListeners() {
    // Collection management buttons
    document.getElementById('createCollectionBtn')?.addEventListener('click', () => this.showCreateCollectionModal());
    document.getElementById('closeCollectionModal')?.addEventListener('click', () => this.hideCollectionModal());
    document.getElementById('collectionForm')?.addEventListener('submit', (e) => this.handleCreateCollection(e));
    document.getElementById('collectionSelector')?.addEventListener('change', (e) => this.loadCollection(e.target.value));
    document.getElementById('scheduleCollectionBtn')?.addEventListener('click', () => this.showScheduleModal());
    document.getElementById('postCollectionBtn')?.addEventListener('click', () => this.postCollectionNow());
    document.getElementById('duplicateCollectionBtn')?.addEventListener('click', () => this.duplicateCollection());
    document.getElementById('deleteCollectionBtn')?.addEventListener('click', () => this.deleteCollection());

    // Scheduling modal
    document.getElementById('closeScheduleModal')?.addEventListener('click', () => this.hideScheduleModal());
    document.getElementById('scheduleForm')?.addEventListener('submit', (e) => this.handleScheduleCollection(e));
  }

  /**
   * Load all collections for the user
   */
  async loadCollections() {
    try {
      const response = await fetch(`${this.app.apiBase}/collection`, {
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to load collections');

      const data = await response.json();
      this.collections = data.collections;

      this.renderCollectionsList();
      this.updateCollectionSelector();

      // Load stats
      this.loadCollectionStats();
    } catch (error) {
      console.error('Load collections error:', error);
      this.app.showError('Failed to load collections');
    }
  }

  /**
   * Render collections list in sidebar
   */
  renderCollectionsList() {
    const container = document.getElementById('collectionsListContainer');
    if (!container) return;

    if (this.collections.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No collections yet</p>
          <button onclick="collectionsManager.showCreateCollectionModal()" class="btn btn-primary">
            Create Collection
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.collections.map(collection => `
      <div class="collection-card" data-collection-id="${collection._id}">
        <div class="collection-header">
          <h4>${collection.name}</h4>
          <span class="badge ${this.getStatusBadgeClass(collection.status)}">${collection.status}</span>
        </div>
        <div class="collection-info">
          <span class="platform-badge">${collection.platform}</span>
          <span class="item-count">${collection.stats.postedItems}/${collection.stats.totalItems} posted</span>
        </div>
        <div class="collection-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${collection.completionPercentage || 0}%"></div>
          </div>
        </div>
        ${collection.scheduling.enabled ? `
          <div class="collection-schedule">
            <i class="icon-clock"></i>
            <span>Next post: ${this.formatDate(collection.stats.nextPostAt)}</span>
          </div>
        ` : ''}
        <div class="collection-actions">
          <button onclick="collectionsManager.loadCollection('${collection._id}')" class="btn btn-sm">View</button>
          <button onclick="collectionsManager.editCollection('${collection._id}')" class="btn btn-sm">Edit</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Update collection selector dropdown
   */
  updateCollectionSelector() {
    const selector = document.getElementById('collectionSelector');
    if (!selector) return;

    selector.innerHTML = `
      <option value="">Select Collection...</option>
      ${this.collections.map(c => `
        <option value="${c._id}">${c.name} (${c.stats.totalItems} items)</option>
      `).join('')}
    `;
  }

  /**
   * Load a specific collection
   */
  async loadCollection(collectionId) {
    if (!collectionId) return;

    try {
      const response = await fetch(`${this.app.apiBase}/collection/${collectionId}`, {
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to load collection');

      const data = await response.json();
      this.currentCollection = data.collection;

      this.renderCollectionGrid();
      this.updateCollectionDetails();
    } catch (error) {
      console.error('Load collection error:', error);
      this.app.showError('Failed to load collection');
    }
  }

  /**
   * Render collection grid with drag-and-drop
   */
  renderCollectionGrid() {
    const container = document.getElementById('collectionGridContainer');
    if (!this.currentCollection) return;

    const { columns, rows, gridType } = this.currentCollection.gridConfig;
    const items = this.currentCollection.items;

    let gridHTML = `
      <div class="collection-grid"
           data-grid-type="${gridType || 'standard'}"
           style="grid-template-columns: repeat(${columns}, 1fr);">
    `;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const item = items.find(i => i.position.row === row && i.position.col === col);

        gridHTML += `
          <div class="grid-cell"
               data-row="${row}"
               data-col="${col}"
               ondrop="collectionsManager.handleDrop(event)"
               ondragover="collectionsManager.handleDragOver(event)"
               ondragleave="collectionsManager.handleDragLeave(event)">
        `;

        if (item && item.contentId) {
          const content = item.contentId;
          gridHTML += `
            <div class="grid-item"
                 draggable="true"
                 data-content-id="${content._id}"
                 ondragstart="collectionsManager.handleDragStart(event)">
              <img src="${content.thumbnailUrl || content.mediaUrl}" alt="${content.title}">
              ${item.posted ? '<div class="posted-badge">Posted</div>' : ''}
              <div class="item-overlay">
                <button onclick="collectionsManager.removeFromCollection('${content._id}')" class="btn-remove">×</button>
                <span class="item-title">${content.title}</span>
              </div>
            </div>
          `;
        } else {
          gridHTML += `
            <div class="empty-cell">
              <span>+</span>
            </div>
          `;
        }

        gridHTML += `</div>`;
      }
    }

    gridHTML += `</div>`;

    // Add content library for dragging
    gridHTML += this.renderContentLibraryForDragging();

    container.innerHTML = gridHTML;
  }

  /**
   * Render content library for dragging items
   */
  renderContentLibraryForDragging() {
    if (!this.app.currentContent || this.app.currentContent.length === 0) {
      return '<div class="content-library-empty">No content available. Upload some first!</div>';
    }

    const gridType = this.currentCollection?.gridConfig?.gridType || 'standard';

    return `
      <div class="drag-source-library">
        <h3>Drag Content to Grid</h3>
        <p class="text-muted">Grid Type: ${gridType === 'reel' ? 'Reel (Videos only)' : 'Standard (Photos only)'}</p>
        <div class="content-items">
          ${this.app.currentContent.map(content => {
            const isVideo = content.mediaType === 'video';
            const isCompatible = (gridType === 'reel' && isVideo) || (gridType === 'standard' && !isVideo);
            const mediaTypeIcon = isVideo ? '🎬' : '📷';

            return `
            <div class="content-item-small ${!isCompatible ? 'incompatible' : ''}"
                 draggable="${isCompatible}"
                 data-content-id="${content._id}"
                 data-media-type="${content.mediaType}"
                 ondragstart="collectionsManager.handleDragStart(event)"
                 title="${!isCompatible ? `Cannot add ${isVideo ? 'video' : 'image'} to ${gridType} grid` : ''}">
              <img src="${content.thumbnailUrl || content.mediaUrl}" alt="${content.title}">
              <span class="media-type-badge">${mediaTypeIcon}</span>
              <span class="content-title">${content.title}</span>
              <div class="ai-score-badge">${Math.round(content.aiScores?.overallScore || 0)}</div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Drag and drop handlers
   */
  handleDragStart(event) {
    this.draggedElement = event.target;
    this.draggedContentId = event.target.dataset.contentId;
    this.draggedMediaType = event.target.dataset.mediaType;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
    event.dataTransfer.setData('mediaType', this.draggedMediaType);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Throttle the visual update for better performance
    if (!this.dragOverThrottle) {
      event.currentTarget.classList.add('drag-over');
      this.dragOverThrottle = setTimeout(() => {
        this.dragOverThrottle = null;
      }, 50); // Update visual state max every 50ms
    }
  }

  handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
  }

  async handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const cell = event.currentTarget;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (!this.draggedContentId) return;

    // Validate media type against grid type
    const gridType = this.currentCollection?.gridConfig?.gridType || 'standard';
    const isVideo = this.draggedMediaType === 'video';
    const isCompatible = (gridType === 'reel' && isVideo) || (gridType === 'standard' && !isVideo);

    if (!isCompatible) {
      this.app.showNotification(
        `Cannot add ${isVideo ? 'videos' : 'images'} to ${gridType === 'reel' ? 'reel' : 'standard'} grid. ${gridType === 'reel' ? 'Use videos only.' : 'Use images only.'}`,
        'error'
      );
      if (this.draggedElement) {
        this.draggedElement.classList.remove('dragging');
      }
      this.draggedElement = null;
      this.draggedContentId = null;
      this.draggedMediaType = null;
      return;
    }

    try {
      // Add content to collection at this position
      const response = await fetch(`${this.app.apiBase}/collection/${this.currentCollection._id}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.app.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentId: this.draggedContentId,
          position: { row, col }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add content');
      }

      const data = await response.json();
      this.currentCollection = data.collection;

      this.renderCollectionGrid();
      this.app.showNotification('Content added to collection', 'success');
    } catch (error) {
      console.error('Drop error:', error);
      this.app.showNotification(error.message, 'error');
    } finally {
      if (this.draggedElement) {
        this.draggedElement.classList.remove('dragging');
      }
      this.draggedElement = null;
      this.draggedContentId = null;
      this.draggedMediaType = null;
    }
  }

  /**
   * Remove content from collection
   */
  async removeFromCollection(contentId) {
    if (!this.currentCollection) return;

    if (!confirm('Remove this item from the collection?')) return;

    try {
      const response = await fetch(`${this.app.apiBase}/collection/${this.currentCollection._id}/content/${contentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to remove content');

      const data = await response.json();
      this.currentCollection = data.collection;

      this.renderCollectionGrid();
      this.app.showSuccess('Content removed from collection');
    } catch (error) {
      console.error('Remove content error:', error);
      this.app.showError('Failed to remove content');
    }
  }

  /**
   * Show create collection modal
   */
  showCreateCollectionModal() {
    const modal = document.getElementById('collectionModal');
    if (modal) {
      modal.classList.add('active');
      document.getElementById('collectionName').focus();
    }
  }

  hideCollectionModal() {
    const modal = document.getElementById('collectionModal');
    if (modal) {
      modal.classList.remove('active');
      document.getElementById('collectionForm').reset();
    }
  }

  /**
   * Create new collection
   */
  async handleCreateCollection(event) {
    event.preventDefault();

    const formData = {
      name: document.getElementById('collectionName').value,
      description: document.getElementById('collectionDescription').value,
      platform: document.getElementById('collectionPlatform').value,
      gridConfig: {
        columns: parseInt(document.getElementById('collectionColumns').value) || 3,
        rows: parseInt(document.getElementById('collectionRows').value) || 3,
        gridType: document.getElementById('collectionGridType').value || 'standard'
      }
    };

    try {
      const response = await fetch(`${this.app.apiBase}/collection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.app.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create collection');

      const data = await response.json();

      this.app.showSuccess('Collection created successfully');
      this.hideCollectionModal();
      this.loadCollections();
      this.loadCollection(data.collection._id);
    } catch (error) {
      console.error('Create collection error:', error);
      this.app.showError('Failed to create collection');
    }
  }

  /**
   * Show scheduling modal
   */
  showScheduleModal() {
    if (!this.currentCollection) {
      this.app.showError('Please select a collection first');
      return;
    }

    const modal = document.getElementById('scheduleModal');
    if (modal) {
      // Pre-fill with existing schedule if any
      if (this.currentCollection.scheduling) {
        document.getElementById('scheduleEnabled').checked = this.currentCollection.scheduling.enabled;
        document.getElementById('scheduleStartDate').value = this.currentCollection.scheduling.startDate ? new Date(this.currentCollection.scheduling.startDate).toISOString().slice(0, 16) : '';
        document.getElementById('scheduleInterval').value = this.currentCollection.scheduling.interval || 'daily';
        document.getElementById('autoPostEnabled').checked = this.currentCollection.scheduling.autoPost;
      }

      modal.classList.add('active');
    }
  }

  hideScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Handle schedule collection
   */
  async handleScheduleCollection(event) {
    event.preventDefault();

    if (!this.currentCollection) return;

    const scheduling = {
      enabled: document.getElementById('scheduleEnabled').checked,
      startDate: document.getElementById('scheduleStartDate').value,
      interval: document.getElementById('scheduleInterval').value,
      autoPost: document.getElementById('autoPostEnabled').checked
    };

    // Get posting times if specified
    const hour = document.getElementById('postingHour').value;
    const minute = document.getElementById('postingMinute').value;

    if (hour && minute) {
      scheduling.postingTimes = [{
        hour: parseInt(hour),
        minute: parseInt(minute),
        timezone: 'UTC'
      }];
    }

    try {
      const response = await fetch(`${this.app.apiBase}/collection/${this.currentCollection._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.app.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scheduling })
      });

      if (!response.ok) throw new Error('Failed to schedule collection');

      const data = await response.json();
      this.currentCollection = data.collection;

      this.app.showSuccess('Collection scheduled successfully');
      this.hideScheduleModal();
      this.updateCollectionDetails();
      this.loadCollections(); // Refresh list
    } catch (error) {
      console.error('Schedule collection error:', error);
      this.app.showError('Failed to schedule collection');
    }
  }

  /**
   * Post collection now
   */
  async postCollectionNow() {
    if (!this.currentCollection) return;

    if (!confirm('Post the next item in this collection now?')) return;

    try {
      const response = await fetch(`${this.app.apiBase}/post/collection/${this.currentCollection._id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post collection');
      }

      this.app.showSuccess('Posting collection...');

      // Reload collection to see updates
      setTimeout(() => this.loadCollection(this.currentCollection._id), 2000);
    } catch (error) {
      console.error('Post collection error:', error);
      this.app.showError(error.message);
    }
  }

  /**
   * Duplicate collection
   */
  async duplicateCollection() {
    if (!this.currentCollection) return;

    try {
      const response = await fetch(`${this.app.apiBase}/collection/${this.currentCollection._id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to duplicate collection');

      const data = await response.json();

      this.app.showSuccess('Collection duplicated successfully');
      this.loadCollections();
      this.loadCollection(data.collection._id);
    } catch (error) {
      console.error('Duplicate collection error:', error);
      this.app.showError('Failed to duplicate collection');
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection() {
    if (!this.currentCollection) return;

    if (!confirm(`Delete collection "${this.currentCollection.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`${this.app.apiBase}/collection/${this.currentCollection._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to delete collection');

      this.app.showSuccess('Collection deleted successfully');
      this.currentCollection = null;
      document.getElementById('collectionGridContainer').innerHTML = '';
      this.loadCollections();
    } catch (error) {
      console.error('Delete collection error:', error);
      this.app.showError('Failed to delete collection');
    }
  }

  /**
   * Update collection details display
   */
  updateCollectionDetails() {
    if (!this.currentCollection) return;

    const detailsContainer = document.getElementById('collectionDetails');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = `
      <div class="collection-detail-card">
        <h2>${this.currentCollection.name}</h2>
        <p>${this.currentCollection.description || ''}</p>
        <div class="collection-stats-grid">
          <div class="stat">
            <span class="stat-label">Platform</span>
            <span class="stat-value">${this.currentCollection.platform}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Items</span>
            <span class="stat-value">${this.currentCollection.stats.totalItems}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Posted</span>
            <span class="stat-value">${this.currentCollection.stats.postedItems}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Status</span>
            <span class="stat-value badge ${this.getStatusBadgeClass(this.currentCollection.status)}">${this.currentCollection.status}</span>
          </div>
        </div>
        ${this.currentCollection.scheduling.enabled ? `
          <div class="schedule-info">
            <h4>Schedule Active</h4>
            <p>Interval: ${this.currentCollection.scheduling.interval}</p>
            <p>Auto-post: ${this.currentCollection.scheduling.autoPost ? 'Yes' : 'No'}</p>
            ${this.currentCollection.stats.nextPostAt ? `<p>Next post: ${this.formatDate(this.currentCollection.stats.nextPostAt)}</p>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Load collection statistics
   */
  async loadCollectionStats() {
    try {
      const response = await fetch(`${this.app.apiBase}/collection/stats`, {
        headers: { 'Authorization': `Bearer ${this.app.token}` }
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      this.renderCollectionStats(data.stats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }

  renderCollectionStats(stats) {
    const container = document.getElementById('collectionStatsContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Total Collections</h4>
          <p class="stat-number">${stats.totalCollections || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Active</h4>
          <p class="stat-number">${stats.activeCollections || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Scheduled</h4>
          <p class="stat-number">${stats.scheduledCollections || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Completed</h4>
          <p class="stat-number">${stats.completedCollections || 0}</p>
        </div>
      </div>
    `;
  }

  /**
   * Helper methods
   */
  getStatusBadgeClass(status) {
    const classes = {
      draft: 'badge-secondary',
      scheduled: 'badge-info',
      posting: 'badge-warning',
      completed: 'badge-success',
      paused: 'badge-warning',
      failed: 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  formatDate(dateString) {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}

// Initialize when document is ready
let collectionsManager;
document.addEventListener('DOMContentLoaded', () => {
  if (window.app) {
    collectionsManager = new CollectionsManager(window.app);
  }
});
