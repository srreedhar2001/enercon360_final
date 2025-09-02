// Navigation Component Loader
// Global Loader: injects an overlay and patches fetch/XHR to show it during API calls
(() => {
    if (window.__globalLoaderInitialized) return;
    window.__globalLoaderInitialized = true;

    const GlobalLoader = {
        _pending: 0,
        _showTimer: null,
        _hideTimer: null,
        init() {
            // Styles for overlay and spinner (no external CSS required)
            const style = document.createElement('style');
            style.textContent = `
                #global-loader-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.5); display: none; align-items: center; justify-content: center; z-index: 99999; }
                #global-loader-overlay.active { display: flex; }
                .gl-spinner { width: 48px; height: 48px; border: 4px solid rgba(0,0,0,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: gl-spin 1s linear infinite; }
                @keyframes gl-spin { to { transform: rotate(360deg); } }
                .gl-box { background: rgba(255,255,255,0.9); padding: 16px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; gap: 12px; align-items: center; }
                .gl-text { color: #374151; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 14px; }
            `;
            document.head.appendChild(style);

            const overlay = document.createElement('div');
            overlay.id = 'global-loader-overlay';
            overlay.innerHTML = `
                <div class="gl-box">
                    <div class="gl-spinner" aria-hidden="true"></div>
                    <div class="gl-text">Loading…</div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Patch fetch
            const originalFetch = window.fetch?.bind(window);
            if (originalFetch) {
                window.fetch = async (...args) => {
                    GlobalLoader._inc();
                    try {
                        const res = await originalFetch(...args);
                        return res;
                    } finally {
                        GlobalLoader._dec();
                    }
                };
            }

            // Patch XMLHttpRequest (optional, for legacy calls)
            const XHR = window.XMLHttpRequest;
            if (XHR) {
                const send = XHR.prototype.send;
                const open = XHR.prototype.open;
                XHR.prototype.open = function(...a) { this.__glPatched = true; return open.apply(this, a); };
                XHR.prototype.send = function(...a) {
                    if (this.__glPatched) GlobalLoader._inc();
                    this.addEventListener('loadend', () => GlobalLoader._dec(), { once: true });
                    return send.apply(this, a);
                };
            }
        },
        show() {
            clearTimeout(this._hideTimer);
            if (this._pending <= 0) this._pending = 1; // force visible
            // small delay to avoid flicker on ultra-fast calls
            this._showTimer = setTimeout(() => {
                document.getElementById('global-loader-overlay')?.classList.add('active');
            }, 120);
        },
        hide() {
            clearTimeout(this._showTimer);
            this._hideTimer = setTimeout(() => {
                if (this._pending === 0) {
                    document.getElementById('global-loader-overlay')?.classList.remove('active');
                }
            }, 120);
        },
        _inc() {
            this._pending++;
            if (this._pending === 1) this.show();
        },
        _dec() {
            this._pending = Math.max(0, this._pending - 1);
            if (this._pending === 0) this.hide();
        }
    };

    // Initialize as early as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GlobalLoader.init(), { once: true });
    } else {
        GlobalLoader.init();
    }

    // Expose manual controls if needed
    window.GlobalLoader = GlobalLoader;
})();
class NavigationLoader {
    static async loadNavigation(containerId = 'navigation-container') {
        try {
            const response = await fetch('/components/navbar.html');
            const navbarHTML = await response.text();
            
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = navbarHTML;
                
                // Execute any scripts in the loaded content
                const scripts = container.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.head.appendChild(newScript);
                    script.remove();
                });

                // Initialize navbar behaviors (login/logout toggle, active link) if available
                if (typeof window.initializeNavigation === 'function') {
                    try { window.initializeNavigation(); } catch (e) { /* noop */ }
                }

                // After navbar loads, ensure access helper is present and hide links without access
                async function ensureAccessHelper() {
                    if (typeof window.applyNavPermissions === 'function') return true;
                    // Dynamically load access.js if not already present
                    await new Promise((resolve) => {
                        const existing = Array.from(document.scripts).some(s => s.src && s.src.includes('/js/access.js'));
                        if (existing) return resolve();
                        const s = document.createElement('script');
                        s.src = '/js/access.js';
                        s.onload = () => resolve();
                        s.onerror = () => resolve();
                        document.head.appendChild(s);
                    });
                    return typeof window.applyNavPermissions === 'function';
                }

                try {
                    const ok = await ensureAccessHelper();
                    if (ok) await window.applyNavPermissions();
                } catch (_) { /* ignore */ }

                // Highlight current page link
                (function highlightActive() {
                    const links = container.querySelectorAll('.nav-link');
                    links.forEach(l => l.classList.remove('active'));
                    const path = window.location.pathname;
                    const pageKey = (p => {
                        if (p.includes('dashboard.html')) return 'dashboard';
                        if (p.includes('user.html')) return 'users';
                        if (p.includes('product.html')) return 'products';
                        if (p.includes('counter.html')) return 'counters';
                        if (p.includes('order.html')) return 'orders';
                        if (p.includes('collections.html')) return 'collections';
                        if (p.includes('payments.html')) return 'payments';
                        if (p.includes('page-access.html')) return 'page-access';
                        return null;
                    })(path);
                    if (pageKey) {
                        const activeLink = container.querySelector(`.nav-link[data-page="${pageKey}"]`);
                        if (activeLink && activeLink.style.display !== 'none') {
                            activeLink.classList.add('active');
                        }
                    }
                })();
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load navigation:', error);
            return false;
        }
    }
    
    static async initializeForAuthenticatedPages() {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
            return;
        }
        
        // Load navigation for authenticated users
        await this.loadNavigation();
    }
}

// Auto-initialize on pages that have the navigation container
document.addEventListener('DOMContentLoaded', function() {
    const navContainer = document.getElementById('navigation-container');
    if (navContainer) {
        NavigationLoader.loadNavigation();
    }
});

// Make it globally available
window.NavigationLoader = NavigationLoader;
