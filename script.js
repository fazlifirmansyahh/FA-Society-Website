// =========================================================
// FA.SOCIETY - SCRIPT UTAMA (CART, CHECKOUT & TRACKING)
// =========================================================

const STORAGE_CART_KEY = 'fa_society_cart';
const STORAGE_ORDER_KEY = 'fa_society_last_order';

function readStoredJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Data localStorage "${key}" tidak valid.`, error);
        return fallback;
    }
}

// Tahapan timeline standar
const ORDER_STEPS = [
    { title: 'Pesanan dibuat', defaultNote: 'Menunggu konfirmasi sistem' },
    { title: 'Pembayaran diterima', defaultNote: 'Pembayaran terverifikasi' },
    { title: 'Diteruskan ke supplier', defaultNote: 'Sedang disiapkan mitra/supplier' },
    { title: 'Dikirim oleh kurir', defaultNote: 'Paket dalam proses pengiriman' },
    { title: 'Tiba di tujuan', defaultNote: 'Pesanan telah diterima' }
];

// Fungsi untuk mengubah status pesanan (0 = dibuat, 1 = dibayar, 2 = supplier, 3 = dikirim, 4 = sampai)
function updateOrderStatus(stepIndex, customNote = '') {
    const order = readStoredJSON(STORAGE_ORDER_KEY, null);
    if (!order) {
        alert('Belum ada data pesanan tersimpan.');
        return;
    }

    const clampedStep = Math.max(0, Math.min(4, Number(stepIndex)));
    const nowTime = new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    order.step = clampedStep;
    order.stepTimes = order.stepTimes || {};
    order.stepNotes = order.stepNotes || {};

    // Catat waktu & catatan untuk tahap yang sudah tercapai
    for (let i = 0; i <= clampedStep; i++) {
        if (!order.stepTimes[i]) order.stepTimes[i] = nowTime;
        if (customNote && i === clampedStep) {
            order.stepNotes[i] = customNote;
        }
    }

    localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(order));

    if (typeof renderTrackingTimeline === 'function') {
        renderTrackingTimeline(order);
    }
}

// Ambil keranjang dari localStorage jika ada
let cart = readStoredJSON(STORAGE_CART_KEY, []);
if (!Array.isArray(cart)) cart = [];

function formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function saveCart() {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    badge.textContent = totalQty;
}

// Cocok dengan pemanggilan di index.html: addToCart(name, price, image)
function addToCart(name, price, image = '') {
    const existingIndex = cart.findIndex(item => item.name === name);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({
            name: name,
            price: Number(price) || 0,
            image: image,
            size: 'All Size',
            qty: 1
        });
    }
    saveCart();
    renderCart();
    openCart();
}

function changeQty(index, delta) {
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    renderCart();
}

function removeItem(index) {
    if (!cart[index]) return;
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="color:#a1a1aa; text-align:center; padding:2rem 0;">Keranjang masih kosong.</p>';
        if (totalEl) totalEl.textContent = formatRupiah(0);
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, idx) => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        return `
            <div class="cart-item" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:48px; height:48px; object-fit:cover; border-radius:8px;">` : ''}
                    <div>
                        <div style="font-weight:700; font-size:0.9rem; color:#fff;">${item.name}</div>
                        <div style="font-size:0.8rem; color:#a1a1aa;">${formatRupiah(item.price)}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" onclick="changeQty(${idx}, -1)" style="width:24px; height:24px; cursor:pointer;">-</button>
                    <span style="font-size:0.85rem; color:#fff;">${item.qty}</span>
                    <button type="button" onclick="changeQty(${idx}, 1)" style="width:24px; height:24px; cursor:pointer;">+</button>
                    <button type="button" onclick="removeItem(${idx})" style="margin-left:4px; cursor:pointer;">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.textContent = formatRupiah(total);
}

function openCart() {
    const modal = document.getElementById('cartModal');
    const overlay = document.getElementById('cartOverlay');
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    renderCart();
}

function closeCartModal() {
    const modal = document.getElementById('cartModal');
    const overlay = document.getElementById('cartOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// Menggantikan checkoutWhatsApp(event) -> ke checkout.html
function goToCheckout(event) {
    if (event) event.preventDefault();
    const currentCart = readStoredJSON(STORAGE_CART_KEY, cart);
    if (!Array.isArray(currentCart)) {
        alert('Data keranjang tidak valid.');
        return;
    }
    if (!currentCart || currentCart.length === 0) {
        alert('Keranjang belanja Anda masih kosong.');
        return;
    }
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(currentCart));
    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    renderCart();

    // Toggle Keranjang & Overlay
    const cartToggle = document.getElementById('cartToggle');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');

    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (closeCart) closeCart.addEventListener('click', closeCartModal);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartModal);

    // Hamburger Menu Mobile
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Tombol checkout di modal keranjang
    const checkoutLink = document.getElementById('whatsappCheckout');
    if (checkoutLink) {
        checkoutLink.addEventListener('click', goToCheckout);
    }

    // =========================================================
    // LOGIKA HALAMAN CHECKOUT (checkout.html)
    // =========================================================
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        const itemsEl = document.getElementById('checkoutItems');
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const totalEl = document.getElementById('summaryTotal');

        let activeCart = readStoredJSON(STORAGE_CART_KEY, []);
        if (!Array.isArray(activeCart)) activeCart = [];
        let subtotal = 0;

        const checkedCourier = document.querySelector('input[name="courier"]:checked');
        let shippingCost = checkedCourier ? Number(checkedCourier.dataset.cost || 18000) : 18000;

        if (itemsEl) {
            if (activeCart.length === 0) {
                itemsEl.innerHTML = '<p style="color:#a1a1aa; font-size:0.85rem;">Belum ada produk di keranjang.</p>';
            } else {
                itemsEl.innerHTML = activeCart.map(item => {
                    const itemTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
                    subtotal += itemTotal;
                    return `
                        <div class="summary-item">
                            <div class="summary-item-left">
                                <div class="item-icon-box"><i class="fa-solid fa-shirt"></i></div>
                                <div class="summary-item-info">
                                    <strong>${item.name}</strong>
                                    <span>Ukuran ${item.size || 'All Size'} · ${item.qty}x</span>
                                </div>
                            </div>
                            <span class="summary-item-price">${formatRupiah(itemTotal)}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        function updateCheckoutSummary() {
            if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
            if (shippingEl) shippingEl.textContent = formatRupiah(shippingCost);
            if (totalEl) totalEl.textContent = formatRupiah(subtotal + shippingCost);
        }

        updateCheckoutSummary();

        document.querySelectorAll('.radio-box input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const list = e.target.closest('.radio-list');
                if (list) list.querySelectorAll('.radio-box').forEach(b => b.classList.remove('active'));
                const box = e.target.closest('.radio-box');
                if (box) box.classList.add('active');

                if (e.target.name === 'courier') {
                    shippingCost = Number(e.target.dataset.cost || 0);
                    updateCheckoutSummary();
                }
            });
        });

        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (activeCart.length === 0) {
                alert('Keranjang kosong.');
                return;
            }

            const paymentElement = document.querySelector('input[name="payment"]:checked');
            const payment = paymentElement ? paymentElement.value : 'Transfer bank';
            const courierEl = document.querySelector('input[name="courier"]:checked');
            const courier = courierEl ? courierEl.value : 'JNE Reguler';

            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const invoice = `INV-2611-${randomNum}`;
            const prefix = courier.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'JNE';
            const resi = `${prefix}0123456789`.slice(0, 13);

            const nameElement = document.getElementById('custName');
            const addressElement = document.getElementById('custAddress');
            const cityElement = document.getElementById('custCity');
            const postalElement = document.getElementById('custPostal');
            const name = nameElement ? nameElement.value.trim() : 'Nama Penerima';
            const address = addressElement ? addressElement.value.trim() : '';
            const city = cityElement ? cityElement.value.trim() : 'Malang';
            const postal = postalElement ? postalElement.value.trim() : '';
            const fullAddress = [address, city, postal].filter(Boolean).join(', ');

            const orderData = {
                invoice,
                resi,
                date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                name,
                address: fullAddress,
                payment,
                courier,
                step: 0, // 0 = Pesanan dibuat (belum bayar)
                stepTimes: {
                    0: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                },
                stepNotes: {},
                items: activeCart
            };

            localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(orderData));
            localStorage.removeItem(STORAGE_CART_KEY);
            cart = [];
            updateCartBadge();

            window.location.href = 'tracking.html';
        });
    }

    // =========================================================
    // LOGIKA HALAMAN LACAK PESANAN (tracking.html)
    // =========================================================
    function renderTrackingTimeline(order) {
        const timelineEl = document.querySelector('.timeline');
        const badgeEl = document.querySelector('.status-badge');
        if (!timelineEl) return;

        const currentStep = typeof order.step === 'number' ? order.step : 0;
        const stepTimes = order.stepTimes || {};
        const stepNotes = order.stepNotes || {};

        if (badgeEl) {
            if (currentStep >= 4) {
                badgeEl.textContent = 'Selesai / Tiba';
            } else if (currentStep === 3) {
                badgeEl.textContent = 'Dalam pengiriman';
            } else if (currentStep === 2) {
                badgeEl.textContent = 'Diproses supplier';
            } else if (currentStep === 1) {
                badgeEl.textContent = 'Pembayaran diterima';
            } else {
                badgeEl.textContent = 'Menunggu pembayaran';
            }
        }

        timelineEl.innerHTML = ORDER_STEPS.map((st, idx) => {
            let stateClass = '';
            let dotContent = '';

            if (idx < currentStep) {
                stateClass = 'done';
                dotContent = '<i class="fa-solid fa-check"></i>';
            } else if (idx === currentStep && currentStep < 4) {
                stateClass = 'current';
                dotContent = '<span class="inner-dot"></span>';
            } else if (idx === currentStep && currentStep === 4) {
                stateClass = 'done';
                dotContent = '<i class="fa-solid fa-check"></i>';
            }

            const desc = stepNotes[idx] || stepTimes[idx] || st.defaultNote;

            return `
                <div class="timeline-item ${stateClass}">
                    <div class="tl-dot">${dotContent}</div>
                    <div class="tl-content">
                        <strong>${st.title}</strong>
                        <span>${desc}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateOrderStatus(stepIndex, customNote = '') {
        const order = readStoredJSON(STORAGE_ORDER_KEY, null);
        if (!order) {
            alert('Belum ada data pesanan tersimpan.');
            return;
        }

        const clampedStep = Math.max(0, Math.min(4, Number(stepIndex)));
        const nowTime = new Date().toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        order.step = clampedStep;
        order.stepTimes = order.stepTimes || {};
        order.stepNotes = order.stepNotes || {};

        for (let i = 0; i <= clampedStep; i++) {
            if (!order.stepTimes[i]) order.stepTimes[i] = nowTime;
            if (customNote && i === clampedStep) {
                order.stepNotes[i] = customNote;
            }
        }

        localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(order));
        renderTrackingTimeline(order);
    }

    const trackingResult = document.getElementById('trackingResult');
    if (trackingResult) {
        const urlParams = new URLSearchParams(window.location.search);
        const isOwner = urlParams.get('admin') === 'fazli1509';
        const adminPanel = document.getElementById('statusControlPanel');
        if (adminPanel && isOwner) {
            adminPanel.style.display = 'block';
        }

        const input = document.getElementById('trackingInput');
        const btn = document.getElementById('trackBtn');
        const savedOrder = JSON.parse(localStorage.getItem(STORAGE_ORDER_KEY));

        function fillTracking(order) {
            if (!order) return;
            if (input && !input.value) input.value = order.resi || order.invoice || '';
            if (document.getElementById('trackInvoice')) document.getElementById('trackInvoice').textContent = order.invoice;
            if (document.getElementById('trackDate')) document.getElementById('trackDate').textContent = `Dipesan ${order.date}`;
            if (document.getElementById('detailCourier')) document.getElementById('detailCourier').textContent = order.courier;
            if (document.getElementById('detailResi')) document.getElementById('detailResi').textContent = order.resi;
            if (document.getElementById('detailName')) document.getElementById('detailName').textContent = order.name;
            if (document.getElementById('detailAddress')) document.getElementById('detailAddress').textContent = order.address;

            const itemsBox = document.getElementById('trackedItems');
            if (itemsBox && Array.isArray(order.items)) {
                itemsBox.innerHTML = order.items.map(item => `
                    <div class="summary-item">
                        <div class="summary-item-left">
                            <div class="item-icon-box"><i class="fa-solid fa-shirt"></i></div>
                            <div class="summary-item-info">
                                <strong>${item.name}</strong>
                            </div>
                        </div>
                        <span class="summary-item-price">${item.qty}x</span>
                    </div>
                `).join('');
            }

            renderTrackingTimeline(order);
        }

        function syncStatusButtons(stepIndex) {
            const current = typeof stepIndex === 'number' ? stepIndex : 0;
            const labelEl = document.getElementById('currentStepLabel');
            if (labelEl) {
                labelEl.textContent = `Status: Tahap ${current}/4`;
            }

            document.querySelectorAll('.status-step-btn').forEach(stepBtn => {
                const btnStep = Number(stepBtn.dataset.step);
                stepBtn.classList.toggle('active', btnStep === current);
            });
        }

        const originalRenderTimeline = renderTrackingTimeline;
        renderTrackingTimeline = function(order) {
            originalRenderTimeline(order);
            syncStatusButtons(order ? order.step : 0);
        };

        document.querySelectorAll('.status-step-btn').forEach(stepBtn => {
            stepBtn.addEventListener('click', () => {
                const targetStep = Number(stepBtn.dataset.step);
                const noteInput = document.getElementById('statusNoteInput');
                const customNote = noteInput ? noteInput.value.trim() : '';

                updateOrderStatus(targetStep, customNote);
                if (noteInput) noteInput.value = '';
            });
        });

        if (savedOrder) {
            fillTracking(savedOrder);
        } else {
            syncStatusButtons(0);
        }

        if (btn) btn.addEventListener('click', () => {
                if (!input) return;
                const query = input.value.trim();
                if (!query) {
                    alert('Masukkan nomor resi atau invoice.');
                    return;
                }

                const order = readStoredJSON(STORAGE_ORDER_KEY, null);
                if (!order) {
                    alert('Pesanan tidak ditemukan.');
                    return;
                }

                if (query !== order.resi && query !== order.invoice) {
                    alert('Nomor resi atau invoice tidak cocok.');
                    return;
                }

                fillTracking(order);
            });

        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (btn) btn.click();
                }
            });
        }
    }
});