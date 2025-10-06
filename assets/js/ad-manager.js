class AdvancedAdManager {
  constructor() {
    this.adContainers = new Map();
    this.networkPerformance = new Map();
    this.rotationInterval = 30000; // Rotate ads every 30 seconds
    this.init();
  }

  async init() {
    await this.initializeContainers();
    this.startAdRotation();
    this.setupPerformanceTracking();
  }

  async initializeContainers() {
    // Find all ad containers on the page
    const containers = document.querySelectorAll('[data-ad-container]');
    
    for (const container of containers) {
      const type = container.dataset.adType || 'banner';
      const placement = container.dataset.adPlacement || 'default';
      const id = container.id || `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.adContainers.set(id, {
        element: container,
        type: type,
        placement: placement,
        currentNetwork: null,
        performance: []
      });
      
      await this.loadAd(id, type, placement);
    }
  }

  async loadAd(containerId, type, placement) {
    try {
      const response = await fetch(`/.netlify/functions/ad-optimizer?type=${type}&placement=${placement}`);
      const adData = await response.json();
      
      if (adData.success) {
        const container = this.adContainers.get(containerId);
        container.element.innerHTML = adData.html;
        container.currentNetwork = adData.network;
        
        // Track performance
        this.trackAdRender(containerId, adData);
        
        // Initialize ad scripts if needed
        this.initializeAdScripts(adData.network, container.element);
      }
    } catch (error) {
      console.error('Failed to load ad:', error);
      this.loadFallbackAd(containerId);
    }
  }

  initializeAdScripts(network, element) {
    // Initialize ad network specific scripts
    switch(network) {
      case 'adsense':
        // AdSense auto-initializes
        break;
      case 'propellerads':
        // Initialize PropellerAds scripts [citation:1]
        this.loadScript('https://propellerads.com/script.js');
        break;
      case 'adsterra':
        // Initialize Adsterra scripts [citation:2]
        this.loadScript('https://adsterra.com/script.js');
        break;
      case 'medianet':
        // Media.net auto-initializes
        break;
    }
  }

  loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }

  startAdRotation() {
    // Rotate ads periodically for optimization
    setInterval(() => {
      this.rotateAds();
    }, this.rotationInterval);
  }

  async rotateAds() {
    for (const [containerId, container] of this.adContainers) {
      await this.loadAd(containerId, container.type, container.placement);
    }
  }

  trackAdRender(containerId, adData) {
    const container = this.adContainers.get(containerId);
    container.performance.push({
      network: adData.network,
      timestamp: Date.now(),
      revenueScore: adData.revenueScore
    });
    
    // Keep only last 100 performance records
    if (container.performance.length > 100) {
      container.performance.shift();
    }
  }

  setupPerformanceTracking() {
    // Track visibility and engagement
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.trackAdView(entry.target);
        }
      });
    }, { threshold: 0.5 });

    this.adContainers.forEach(container => {
      observer.observe(container.element);
    });
  }

  trackAdView(adElement) {
    // Send view tracking to analytics
    console.log('Ad viewed:', adElement);
  }

  loadFallbackAd(containerId) {
    const container = this.adContainers.get(containerId);
    container.element.innerHTML = `
      <div class="ad-container fallback">
        <div class="ad-label">Market Intelligence</div>
        <div class="fallback-content">
          <h5>Advanced Trading Signals</h5>
          <p>Real-time analysis powered by AI</p>
          <a href="/premium" class="btn btn-outline">Upgrade Now</a>
        </div>
      </div>
    `;
  }

  // Method to manually refresh specific ad container
  refreshAd(containerId) {
    const container = this.adContainers.get(containerId);
    if (container) {
      this.loadAd(containerId, container.type, container.placement);
    }
  }

  // Get performance analytics
  getPerformanceReport() {
    const report = {};
    
    this.adContainers.forEach((container, id) => {
      report[id] = {
        type: container.type,
        placement: container.placement,
        currentNetwork: container.currentNetwork,
        performanceHistory: container.performance
      };
    });
    
    return report;
  }
}

// Initialize ad manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adManager = new AdvancedAdManager();
});
