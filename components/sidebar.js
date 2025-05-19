class Sidebar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.hotPages = [];
        this.render();
        this.setupEventListeners();
        this.loadHotPages();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 64px;
                    height: 100%;
                    background-color: #ffffff;
                    border-right: 1px solid #e5e5e5;
                    display: flex;
                    flex-direction: column;
                }

                .sidebar-nav {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 20px;
                    flex: 1;
                }

                .nav-item {
                    width: 48px;
                    height: 48px;
                    margin-bottom: 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    border: 1px solid transparent;
                }

                .nav-item:hover {
                    background-color: #f0f7ff;
                    border-color: #e6f0ff;
                }

                .nav-item.active {
                    background-color: #e6f4ff;
                    border-color: #1890ff;
                }

                .nav-item img {
                    width: 24px;
                    height: 24px;
                    opacity: 0.5;
                    transition: all 0.3s ease;
                    filter: grayscale(100%);
                }

                .nav-item:hover img {
                    opacity: 0.8;
                    filter: grayscale(50%);
                    transform: scale(1.05);
                }

                .nav-item.active img {
                    opacity: 1;
                    filter: grayscale(0%);
                    filter: brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1600%) hue-rotate(199deg) brightness(105%) contrast(101%);
                }

                .tooltip {
                    position: absolute;
                    left: 64px;
                    background-color: #ffffff;
                    color: #333333;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    pointer-events: none;
                    white-space: nowrap;
                    z-index: 9999;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e5e5e5;
                }

                .nav-item:hover .tooltip {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(8px);
                }

                .admin-section {
                    padding-bottom: 20px;
                    display: flex;
                    justify-content: center;
                }

                .divider {
                    width: 32px;
                    height: 1px;
                    background-color: #e5e5e5;
                    margin: 8px 0;
                }

                /* 右键菜单样式 */
                .context-menu {
                    position: fixed;
                    background: #ffffff;
                    border: 1px solid #e5e5e5;
                    border-radius: 6px;
                    padding: 4px 0;
                    min-width: 160px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 10000;
                    display: none;
                    animation: menuFadeIn 0.15s ease-out;
                }

                @keyframes menuFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .context-menu-item {
                    padding: 8px 16px;
                    font-size: 13px;
                    color: #333333;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .context-menu-item:hover {
                    background-color: #f5f5f5;
                }
            </style>
            <nav class="sidebar-nav" id="sidebarNav">
                <div class="nav-item" data-page="shouye">
                    <img src="../assets/img/shouye.png" alt="home">
                    <span class="tooltip">home</span>
                </div>
                <div class="nav-item" data-page="tools">
                    <img src="../assets/img/tools.png" alt="tools">
                    <span class="tooltip">tools</span>
                </div>
                <div class="nav-item" data-page="online-tools">
                    <img src="../assets/img/tools.png" alt="online tools">
                    <span class="tooltip">online tools</span>
                </div>
                <div class="nav-item" data-page="community">
                    <img src="../assets/img/chart.png" alt="community">
                    <span class="tooltip">community</span>
                </div>
                <div class="divider"></div>
                <!-- 热门页面将在这里动态添加 -->
            </nav>
            <div class="admin-section">
                <div class="nav-item" data-page="admin">
                    <img src="../assets/img/admin.png" alt="developer console">
                    <span class="tooltip">developer console</span>
                </div>
            </div>
            <!-- 添加右键菜单 -->
            <div class="context-menu" id="adminContextMenu">
                <div class="context-menu-item" id="menuOpenInBrowser">open in browser</div>
            </div>
        `;

        // 设置当前页面的激活状态
        this.updateActiveState();
    }

    async loadHotPages() {
        try {
            const response = await fetch('https://www.rhythmdoctor.top/api/get_hotpages.php');
            const hotPages = await response.json();
            
            // 保存热门页面数据
            this.hotPages = hotPages;
            
            // 渲染热门页面导航项
            const nav = this.shadowRoot.getElementById('sidebarNav');
            
            hotPages.forEach((page, index) => {
                const pageId = `hot-page-${index}`;
                const navItem = document.createElement('div');
                navItem.className = 'nav-item';
                navItem.dataset.page = pageId;
                navItem.dataset.type = page.type;
                navItem.dataset.url = page.type === 'website' ? page.url : page.api;
                
                navItem.innerHTML = `
                    <img src="${page.icon}" alt="${page.name}">
                    <span class="tooltip">${page.name}</span>
                `;
                
                nav.appendChild(navItem);
            });
            
            // 更新事件监听
            this.setupEventListeners();
        } catch (error) {
            console.error('load hot pages failed:', error);
        }
    }

    updateActiveState() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const navItems = this.shadowRoot.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            if (item.dataset.page === currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    setupEventListeners() {
        const { shell } = require('electron');
        const navItems = this.shadowRoot.querySelectorAll('.nav-item');
        const adminButton = this.shadowRoot.querySelector('[data-page="admin"]');
        const contextMenu = this.shadowRoot.getElementById('adminContextMenu');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
                
                if (page !== currentPage) {
                    // 处理热门页面
                    if (page.startsWith('hot-page-')) {
                        const type = item.dataset.type;
                        const url = item.dataset.url;
                        const name = item.querySelector('.tooltip').textContent;
                        
                        if (type === 'website') {
                            window.location.href = `../pages/hot-website.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(name)}`;
                        }
                    } else {
                        window.location.href = `../pages/${page}.html`;
                    }
                }
            });
        });

        // 为开发者控制台按钮添加右键菜单
        adminButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // 显示右键菜单
            contextMenu.style.display = 'block';
            
            // 调整菜单位置
            let x = e.clientX;
            let y = e.clientY;
            
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            if (x + menuWidth > windowWidth) {
                x = windowWidth - menuWidth;
            }
            
            if (y + menuHeight > windowHeight) {
                y = windowHeight - menuHeight;
            }
            
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
        });

        // 点击页面其他地方时隐藏菜单
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        // 在浏览器中打开
        this.shadowRoot.getElementById('menuOpenInBrowser').addEventListener('click', () => {
            shell.openExternal('https://www.rhythmdoctor.top/');
            contextMenu.style.display = 'none';
        });
    }
}

customElements.define('side-bar', Sidebar); 