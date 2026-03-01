class Gallery {
  constructor() {
    this.artworks = [];
    this.galleryEl = document.getElementById('gallery');
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

  async loadArtworks() {
    const response = await fetch('artworks-list.json');
    if (!response.ok) throw new Error(`Failed to load artworks: ${response.status}`);
    
    const files = await response.json();
    this.artworks = files
      .filter(f => f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => this.parseArtwork(filename));
  }

  parseArtwork(filename) {
    const match = filename.match(/^(\d{8})-(\d{6})-(.+)\.html$/);
    if (!match) return null;
    
    const [, dateStr, timeStr, slug] = match;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    const seconds = timeStr.substring(4, 6);
    
    const isoDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    const date = new Date(isoDate);
    
    const title = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      filename,
      title,
      date: date.toISOString(),
      path: `artworks/${filename}`
    };
  }

  renderArtworks() {
    if (!this.galleryEl) return;

    const valid = this.artworks.filter(a => a !== null);
    if (valid.length === 0) {
      this.renderEmpty();
      return;
    }

    this.galleryEl.innerHTML = valid
      .map((artwork, index) => this.createCard(artwork, index))
      .join('');
    
    const count = valid.length;
    const countEl = document.getElementById('artwork-count');
    if (countEl) countEl.textContent = `${count} artwork${count !== 1 ? 's' : ''}`;
    
    const badgeEl = document.getElementById('badge-count');
    if (badgeEl) badgeEl.textContent = count;
  }

  createCard(artwork, index) {
    const date = new Date(artwork.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return `
      <a href="${artwork.path}" class="gallery-item" style="animation-delay:${Math.min(index * 30, 300)}ms" title="${this.escapeHtml(artwork.title)}" target="_blank">
        <div class="item-number">#${index + 1}</div>
        <div class="item-meta">
          <span class="item-badge">✨ AI Art</span>
          <span class="item-date">${formattedDate}</span>
        </div>
        <h3 class="item-title">${this.escapeHtml(artwork.title)}</h3>
        <div class="item-footer">
          <span>View</span>
        </div>
      </a>
    `;
  }

  renderEmpty() {
    if (!this.galleryEl) return;
    this.galleryEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3>No artworks yet</h3>
        <p>The AI is creating its first masterpiece. Check back soon!</p>
      </div>
    `;
  }

  renderError() {
    if (!this.galleryEl) return;
    this.galleryEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load gallery</h3>
        <p>Please refresh the page or check back later.</p>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Gallery();
});
