/**
 * Service Worker - 缓存策略优化
 * 提升网站加载速度和离线体验
 */

const CACHE_NAME = 'cangshuqian-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.min.css',
    '/js/main.min.js',
    '/js/data.min.js',
    '/js/tree.min.js',
    '/favicon.ico',
    '/logo.svg'
];

// 需要缓存的动态资源（数据文件）
const DYNAMIC_ASSETS = [
    '/data/categories.csv',
    '/data/sites.csv'
];

// 外部资源（CDN）
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js'
];

/**
 * Service Worker 安装事件
 */
self.addEventListener('install', event => {
    console.log('Service Worker 安装中...');
    
    event.waitUntil(
        Promise.all([
            // 缓存静态资源
            caches.open(STATIC_CACHE).then(cache => {
                console.log('缓存静态资源...');
                return cache.addAll(STATIC_ASSETS);
            }),
            // 缓存外部资源
            caches.open(STATIC_CACHE).then(cache => {
                console.log('缓存外部资源...');
                return cache.addAll(EXTERNAL_ASSETS);
            })
        ]).then(() => {
            console.log('Service Worker 安装完成');
            // 强制激活新的 Service Worker
            return self.skipWaiting();
        })
    );
});

/**
 * Service Worker 激活事件
 */
self.addEventListener('activate', event => {
    console.log('Service Worker 激活中...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 删除旧版本的缓存
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker 激活完成');
            // 立即控制所有客户端
            return self.clients.claim();
        })
    );
});

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 只处理 GET 请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 跳过 chrome-extension 和其他非 http(s) 协议
    if (!request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        handleRequest(request, url)
    );
});

/**
 * 处理网络请求
 * @param {Request} request - 请求对象
 * @param {URL} url - URL对象
 * @returns {Promise<Response>} 响应
 */
async function handleRequest(request, url) {
    // 静态资源：缓存优先策略
    if (isStaticAsset(url.pathname)) {
        return cacheFirst(request, STATIC_CACHE);
    }
    
    // 数据文件：网络优先策略
    if (isDynamicAsset(url.pathname)) {
        return networkFirst(request, DYNAMIC_CACHE);
    }
    
    // 图片资源：缓存优先策略
    if (request.destination === 'image') {
        return cacheFirst(request, DYNAMIC_CACHE);
    }
    
    // 外部资源：缓存优先策略
    if (isExternalAsset(url.href)) {
        return cacheFirst(request, STATIC_CACHE);
    }
    
    // 其他请求：网络优先策略
    return networkFirst(request, DYNAMIC_CACHE);
}

/**
 * 缓存优先策略
 * @param {Request} request - 请求对象
 * @param {string} cacheName - 缓存名称
 * @returns {Promise<Response>} 响应
 */
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // 后台更新缓存
            updateCache(request, cache);
            return cachedResponse;
        }
        
        // 缓存未命中，从网络获取
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('缓存优先策略失败:', error);
        return new Response('网络错误', { status: 503 });
    }
}

/**
 * 网络优先策略
 * @param {Request} request - 请求对象
 * @param {string} cacheName - 缓存名称
 * @returns {Promise<Response>} 响应
 */
async function networkFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        
        try {
            const networkResponse = await fetch(request);
            
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        } catch (networkError) {
            // 网络失败，尝试从缓存获取
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                return cachedResponse;
            }
            
            throw networkError;
        }
    } catch (error) {
        console.error('网络优先策略失败:', error);
        return new Response('网络错误', { status: 503 });
    }
}

/**
 * 后台更新缓存
 * @param {Request} request - 请求对象
 * @param {Cache} cache - 缓存对象
 */
async function updateCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // 静默失败，不影响用户体验
        console.log('后台缓存更新失败:', error);
    }
}

/**
 * 判断是否为静态资源
 * @param {string} pathname - 路径
 * @returns {boolean} 是否为静态资源
 */
function isStaticAsset(pathname) {
    return STATIC_ASSETS.some(asset => 
        pathname === asset || pathname.endsWith(asset)
    );
}

/**
 * 判断是否为动态资源
 * @param {string} pathname - 路径
 * @returns {boolean} 是否为动态资源
 */
function isDynamicAsset(pathname) {
    return DYNAMIC_ASSETS.some(asset => 
        pathname === asset || pathname.endsWith(asset)
    );
}

/**
 * 判断是否为外部资源
 * @param {string} href - 完整URL
 * @returns {boolean} 是否为外部资源
 */
function isExternalAsset(href) {
    return EXTERNAL_ASSETS.some(asset => href.includes(asset));
}

/**
 * 监听消息事件（用于手动缓存清理等）
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearAllCaches().then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

/**
 * 清理所有缓存
 * @returns {Promise<void>}
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('所有缓存已清理');
}