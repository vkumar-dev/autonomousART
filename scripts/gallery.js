/**
 * Gallery Script
 * Loads and displays artworks from the gallery
 */

class Gallery {
  constructor() {
    this.artworks = [];
    this.galleryGrid = document.getElementById('gallery-grid');
    this.init();
  }

  async init() {
    try {
      await this.loadArtworks();
      this.renderArtworks();
    } catch (error) {
      console.error('Failed to load gallery:', error);
      this.renderError();
    }
  }

  /**
   * Load artworks list
   */
  async loadArtworks() {
    const response = await fetch('artworks-list.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load artworks: ${response.status}`);
    }
    
    const files = await response.json();
    
    // Parse artwork metadata from filenames
    this.artworks = files
      .filter(f => f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => this.parseArtworkFile(filename));
    
    console.log(`[Gallery] Loaded ${this.artworks.length} artworks`);
  }

  /**
   * Parse artwork metadata from filename
   */
  parseArtworkFile(filename) {
    // Filename format: YYYYMMDD-HHMMSS-title-slug.html
    const match = filename.match(/^(\d{8})-(\d{6})-(.+)\.html$/);
    
    if (!match) {
      return null;
    }
    
    const [, dateStr, timeStr, slug] = match;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    const seconds = timeStr.substring(4, 6);
    
    const isoDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    const date = new Date(isoDate);
    
    // Convert slug back to title
    const title = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      filename,
      title,
      date: date.toISOString(),
      slug,
      path: `artworks/${filename}`
    };
  }

  /**
   * Render artworks to gallery
   */
  renderArtworks() {
    if (!this.galleryGrid) return;

    const validArtworks = this.artworks.filter(a => a !== null);

    if (validArtworks.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.galleryGrid.innerHTML = validArtworks
      .map((artwork, index) => this.createArtworkCard(artwork, index))
      .join('');
    
    // Update count
    const countElement = document.getElementById('artwork-count');
    if (countElement) {
      countElement.textContent = `${validArtworks.length} artwork${validArtworks.length !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Create artwork card HTML
   */
  createArtworkCard(artwork, index) {
    const date = new Date(artwork.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return `
      <a href="${artwork.path}" class="artwork-card" style="animation-delay:${Math.min(index * 35, 400)}ms" title="${this.escapeHtml(artwork.title)}" target="_blank">
        <div class="artwork-meta">
          <span class="artwork-type">Generative</span>
          <span class="artwork-date">${formattedDate}</span>
        </div>
        <h3 class="artwork-title">${this.escapeHtml(artwork.title)}</h3>
        <div class="artwork-footer">
          View artwork →
        </div>
      </a>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    if (!this.galleryGrid) return;

    this.galleryGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎨</div>
        <h3>No artworks yet</h3>
        <p>The AI is creating its first masterpiece. Check back soon!</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderError() {
    if (!this.galleryGrid) return;

    this.galleryGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Unable to load gallery</h3>
        <p>Please refresh the page or check back later.</p>
      </div>
    `;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.gallery = new Gallery();
});
