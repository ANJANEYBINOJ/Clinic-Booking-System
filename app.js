"use strict";
/**
 * Clinic Booking System - Full Implementation - Final
 * Patient & Doctor views with API integration
 */
const API_BASE = (typeof window !== 'undefined' && window.location?.origin)
    ? `${window.location.origin}/api`
    : 'http://localhost:3000/api';
const AUTH_TOKEN_KEY = 'clinic_token';
const AUTH_ROLE_KEY = 'clinic_role';
const AUTH_USER_KEY = 'clinic_user';
function getAuthToken() {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}
function getAuthRole() {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_ROLE_KEY) : null);
}
function getAuthUser() {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_USER_KEY) : null;
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function setAuthToken(token, role, user) {
    if (typeof localStorage === 'undefined')
        return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_ROLE_KEY, role);
    if (user)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearAuth() {
    if (typeof localStorage === 'undefined')
        return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}
// Inline SVG icons (24x24, outline style)
const ICONS = {
    arrowLeft: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>',
    calendar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
    clock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    user: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
    login: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>',
    userPlus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>',
    medical: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>',
    chevronRight: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>',
    check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
    settings: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    list: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
    lock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
    mail: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    phone: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>',
    logout: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
    calendarX: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 12l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>',
    clipboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
    viewGrid: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>',
    ban: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>',
};
function icon(name, className = 'icon') {
    const path = ICONS[name];
    if (!path)
        return '';
    return `<span class="${className}" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">${path}</svg></span>`;
}
class ClinicBookingApp {
    constructor() {
        this.currentScreen = 'Home';
        this.selectedDate = '';
        this.selectedSlot = null;
        this.slots = [];
        this.appointments = [];
        this.blockedSlots = [];
        this.bookingFormData = {};
        this.selectedAppointment = null;
        this.doctorLoggedIn = false;
        this.viewMode = 'patient';
        this.config = {
            businessHours: { start: 9, end: 17 },
            notificationsEnabled: true,
        };
        this.patientDashboard = null;
        this.doctorDashboard = null;
        this.adminDashboard = null;
        this.loadConfig();
        this.setupSiteShell();
        this.updateBookingStep();
        this.updateHeroVisibility();
        this.render();
    }
    setupSiteShell() {
        const goHome = (e) => {
            e.preventDefault();
            this.closeMenu();
            this.viewMode = 'patient';
            this.navigateTo('Home');
        };
        /* --- Hamburger toggle --- */
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('nav-links');
        let overlay = document.querySelector('.nav-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'nav-overlay';
            document.body.appendChild(overlay);
        }
        hamburger?.addEventListener('click', () => {
            const isOpen = navLinks?.classList.toggle('open');
            hamburger.classList.toggle('active', !!isOpen);
            if (isOpen)
                overlay?.classList.add('show');
            else
                overlay?.classList.remove('show');
        });
        overlay?.addEventListener('click', () => this.closeMenu());
        /* --- Scroll-aware header --- */
        const header = document.getElementById('site-header');
        window.addEventListener('scroll', () => {
            header?.classList.toggle('scrolled', window.scrollY > 20);
        }, { passive: true });
        /* --- Nav links --- */
        document.querySelectorAll('.nav-link[data-nav="home"], .nav-brand[data-nav="home"]').forEach((el) => {
            el.addEventListener('click', goHome);
        });
        document.querySelectorAll('.nav-link[data-nav]').forEach((el) => {
            const nav = el.getAttribute('data-nav');
            if (nav === 'home')
                return;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMenu();
                if (nav === 'services')
                    this.navigateTo('DateSelect');
                else
                    this.showToast(`${nav.charAt(0).toUpperCase() + nav.slice(1)} — coming soon`, 'info');
            });
        });
        /* --- Hero buttons --- */
        document.getElementById('hero-book-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const role = getAuthRole();
            if (role === 'client')
                this.navigateTo('DateSelect');
            else
                this.navigateTo('ClientLogin');
        });
        document.getElementById('hero-learn-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.main-content')?.scrollIntoView({ behavior: 'smooth' });
        });
        /* --- Footer nav links --- */
        document.querySelectorAll('.footer-link[data-nav], .footer-brand[data-nav]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const nav = el.getAttribute('data-nav');
                if (nav === 'home')
                    goHome(e);
                else if (nav === 'services')
                    this.navigateTo('DateSelect');
                else
                    this.showToast(`${el.textContent ?? 'Page'} — coming soon`, 'info');
            });
        });
        document.querySelectorAll('.footer-link:not([data-nav])').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showToast(`${link.textContent ?? 'Page'} — coming soon`, 'info');
            });
        });
        this.updateNavAuth();
    }
    closeMenu() {
        document.getElementById('nav-links')?.classList.remove('open');
        document.getElementById('hamburger')?.classList.remove('active');
        document.querySelector('.nav-overlay')?.classList.remove('show');
    }
    updateNavAuth() {
        const container = document.getElementById('nav-auth');
        if (!container)
            return;
        container.innerHTML = '';
        const role = getAuthRole();
        const user = getAuthUser();
        if (role && user) {
            const initial = (user.name || user.email || '?')[0].toUpperCase();
            container.innerHTML = `
        <span class="nav-auth-user">
          <span class="nav-auth-avatar">${initial}</span>
          <span>${user.name || user.email}</span>
        </span>
      `;
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'nav-auth-btn nav-auth-btn-ghost';
            logoutBtn.textContent = 'Log out';
            logoutBtn.addEventListener('click', () => {
                clearAuth();
                this.closeMenu();
                this.viewMode = 'patient';
                this.navigateTo('Home');
            });
            container.appendChild(logoutBtn);
        }
        else {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'nav-auth-btn nav-auth-btn-ghost';
            loginBtn.textContent = 'Log in';
            loginBtn.addEventListener('click', () => { this.closeMenu(); this.navigateTo('LoginRoleSelect'); });
            const signupBtn = document.createElement('button');
            signupBtn.className = 'nav-auth-btn nav-auth-btn-primary';
            signupBtn.textContent = 'Sign up';
            signupBtn.addEventListener('click', () => { this.closeMenu(); this.navigateTo('RoleSelect'); });
            container.appendChild(loginBtn);
            container.appendChild(signupBtn);
        }
    }
    createSectionHeading(title) {
        const h = document.createElement('h2');
        h.className = 'section-heading';
        h.textContent = title;
        return h;
    }
    wrapSection(content, heading) {
        const wrap = document.createElement('div');
        wrap.className = 'content-section';
        if (heading)
            wrap.appendChild(this.createSectionHeading(heading));
        wrap.appendChild(content);
        return wrap;
    }
    async loadConfig() {
        try {
            const res = await fetch(`${API_BASE}/config`);
            if (res.ok)
                this.config = await res.json();
        }
        catch {
            // Use defaults if API unavailable
        }
    }
    async api(url, options) {
        try {
            const token = getAuthToken();
            const headers = { 'Content-Type': 'application/json', ...options?.headers };
            if (token)
                headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401)
                clearAuth();
            if (!res.ok)
                throw new Error(data.error || 'Request failed');
            return data;
        }
        catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Cannot reach server. Run: npm run dev');
            }
            throw err;
        }
    }
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
    formatDateDisplay(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    }
    getMinDate() {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }
    getMaxDate() {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
    }
    navigateTo(screen, data) {
        this.currentScreen = screen;
        if (data) {
            if (screen === 'BookingForm' && typeof data === 'object' && data !== null && 'time' in data) {
                this.selectedSlot = data;
                this.bookingFormData = {
                    date: this.selectedDate,
                    time: data.time,
                    doctor: 'Dr. Sarah Johnson',
                    type: 'General Consultation',
                };
            }
            if (screen === 'AppointmentDetails' && typeof data === 'object') {
                this.selectedAppointment = data;
            }
        }
        // Load dashboard data asynchronously
        if (screen === 'PatientDashboard') {
            this.loadPatientDashboard().then(() => {
                this.updateBookingStep();
                this.updateNavAuth();
                this.updateHeroVisibility();
                this.render();
            });
            return;
        }
        if (screen === 'DoctorDashboard') {
            this.loadDoctorDashboard().then(() => {
                this.updateBookingStep();
                this.updateNavAuth();
                this.updateHeroVisibility();
                this.render();
            });
            return;
        }
        if (screen === 'AdminDashboard') {
            this.loadAdminDashboard().then(() => {
                this.updateBookingStep();
                this.updateNavAuth();
                this.updateHeroVisibility();
                this.render();
            });
            return;
        }
        this.updateBookingStep();
        this.updateNavAuth();
        this.updateHeroVisibility();
        this.render();
    }
    updateHeroVisibility() {
        const hero = document.getElementById('hero-section');
        const features = document.getElementById('features-section');
        const steps = document.getElementById('booking-steps');
        const main = document.querySelector('.main-content');
        const isHome = this.currentScreen === 'Home';
        hero?.style.setProperty('display', isHome ? '' : 'none');
        features?.style.setProperty('display', isHome ? '' : 'none');
        steps?.style.setProperty('display', isHome ? 'none' : '');
        main?.style.setProperty('display', isHome ? 'none' : '');
    }
    updateBookingStep() {
        const stepEl = document.getElementById('booking-steps');
        if (!stepEl)
            return;
        const map = {
            Home: 0,
            ClientLogin: 0,
            ClientRegister: 0,
            DoctorLogin: 0,
            DoctorRegister: 0,
            DoctorDashboard: 0,
            DateSelect: 1,
            BrowseAvailability: 2,
            BookingForm: 3,
            BookingConfirmation: 4,
        };
        const step = map[this.currentScreen] ?? 0;
        stepEl.setAttribute('data-step', String(step));
    }
    createElement(tag, className, content) {
        const el = document.createElement(tag);
        if (className)
            el.className = className;
        if (content)
            el.textContent = content;
        return el;
    }
    createHeader(title, showBack = false, backTo) {
        const header = document.createElement('div');
        header.className = 'header';
        if (showBack && backTo) {
            const backBtn = document.createElement('button');
            backBtn.className = 'back-button';
            backBtn.innerHTML = icon('arrowLeft', 'icon icon-sm');
            backBtn.setAttribute('aria-label', 'Go back');
            backBtn.onclick = () => this.navigateTo(backTo);
            header.appendChild(backBtn);
        }
        const titleEl = document.createElement('h2');
        titleEl.className = 'header-title';
        titleEl.textContent = title;
        header.appendChild(titleEl);
        return header;
    }
    createButton(text, onClick, primary = true, options) {
        const btn = document.createElement('button');
        btn.className = primary ? 'btn btn-primary' : 'btn btn-secondary';
        if (options?.icon) {
            btn.innerHTML = icon(options.icon, 'icon btn-icon') + `<span class="btn-text">${text}</span>`;
        }
        else {
            btn.textContent = text;
        }
        btn.onclick = onClick;
        if (options) {
            if (options.width)
                btn.style.width = `${options.width}px`;
            if (options.disabled)
                btn.disabled = true;
            if (options.fullWidth)
                btn.classList.add('btn-full');
        }
        return btn;
    }
    createActionCard(iconName, title, subtitle, onClick) {
        const card = document.createElement('div');
        card.className = 'action-card';
        card.onclick = onClick;
        card.innerHTML = `
      <span class="action-card-icon">${icon(iconName, 'icon')}</span>
      <div class="action-card-body">
        <h3 class="action-card-title">${title}</h3>
        <p class="action-card-subtitle">${subtitle}</p>
      </div>
      <span class="action-card-chevron">${icon('chevronRight', 'icon icon-sm')}</span>
    `;
        return card;
    }
    createInput(label, placeholder, options) {
        const container = document.createElement('div');
        container.className = 'input-container';
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        if (options?.id)
            labelEl.htmlFor = options.id;
        container.appendChild(labelEl);
        if (options?.multiline) {
            const ta = document.createElement('textarea');
            ta.placeholder = placeholder;
            ta.value = options.value || '';
            ta.className = 'input';
            ta.id = options.id || '';
            container.appendChild(ta);
        }
        else {
            const input = document.createElement('input');
            input.type = options?.type || 'text';
            input.placeholder = placeholder;
            input.value = options?.value || '';
            input.className = 'input';
            input.id = options?.id || '';
            if (options?.required)
                input.required = true;
            container.appendChild(input);
        }
        return container;
    }
    createCard(title, content, onClick, badge, badgeType, options) {
        const card = document.createElement('div');
        card.className = 'card';
        if (onClick) {
            card.classList.add('card-clickable');
            card.onclick = onClick;
        }
        if (badge) {
            const badgeEl = document.createElement('span');
            badgeEl.className = `slot-badge slot-badge-${badgeType || 'available'}`;
            badgeEl.textContent = badge;
            card.appendChild(badgeEl);
        }
        const inner = document.createElement('div');
        inner.className = 'card-inner';
        if (options?.showClockIcon) {
            inner.innerHTML = `<span class="card-icon">${icon('clock', 'icon icon-sm')}</span>`;
        }
        const titleEl = document.createElement('h3');
        titleEl.className = 'card-title';
        titleEl.textContent = title;
        inner.appendChild(titleEl);
        const contentEl = document.createElement('p');
        contentEl.className = 'card-content';
        contentEl.textContent = content;
        inner.appendChild(contentEl);
        card.appendChild(inner);
        return card;
    }
    createSpacer(h) {
        const s = document.createElement('div');
        s.style.height = `${h}px`;
        return s;
    }
    renderHome() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Clinic Booking'));
        const hero = document.createElement('div');
        hero.className = 'hero-block';
        hero.innerHTML = `
      <div class="hero-icon-wrap">${icon('medical', 'icon hero-icon')}</div>
      <h1 class="hero-title">Welcome</h1>
      <p class="hero-subtitle">Book your appointment in just a few taps</p>
    `;
        c.appendChild(hero);
        c.appendChild(this.createSpacer(32));
        const isClientLoggedIn = getAuthRole() === 'client';
        const actionCards = document.createElement('div');
        actionCards.className = 'action-cards';
        actionCards.appendChild(this.createActionCard('calendar', 'Browse & Book', 'Choose a date and time for your visit', () => (isClientLoggedIn ? this.navigateTo('DateSelect') : this.navigateTo('ClientLogin'))));
        actionCards.appendChild(this.createActionCard('clipboard', 'My Appointments', 'View or cancel your bookings', () => (isClientLoggedIn ? this.navigateTo('CancelAppointment') : this.navigateTo('ClientLogin'))));
        c.appendChild(actionCards);
        c.appendChild(this.createSpacer(16));
        const staffAccessCards = document.createElement('div');
        staffAccessCards.className = 'action-cards';
        staffAccessCards.appendChild(this.createActionCard('medical', 'Doctor Login', 'Manage schedule and appointments', () => {
            this.viewMode = 'doctor';
            this.navigateTo('DoctorLogin');
        }));
        staffAccessCards.appendChild(this.createActionCard('settings', 'Admin Login', 'Access system dashboard and users', () => {
            this.viewMode = 'admin';
            this.navigateTo('AdminLogin');
        }));
        c.appendChild(staffAccessCards);
        c.appendChild(this.createSpacer(24));
        const authBlock = document.createElement('div');
        authBlock.className = 'auth-block';
        if (isClientLoggedIn) {
            const user = getAuthUser();
            authBlock.innerHTML = `
        <p class="auth-label">Signed in as <strong>${user?.email ?? ''}</strong></p>
      `;
            const logoutBtn = this.createButton('Log out', () => {
                clearAuth();
                this.viewMode = 'patient';
                this.navigateTo('Home');
            }, false, { fullWidth: true, icon: 'logout' });
            logoutBtn.className = 'btn btn-ghost btn-full';
            authBlock.appendChild(logoutBtn);
        }
        else {
            authBlock.innerHTML = `
        <div class="auth-links">
          <a href="#" class="link-button" data-action="login">${icon('login', 'icon icon-sm')} Log in</a>
          <a href="#" class="link-button" data-action="register">${icon('userPlus', 'icon icon-sm')} Register</a>
        </div>
      `;
            authBlock.querySelector('[data-action="login"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('LoginRoleSelect');
            });
            authBlock.querySelector('[data-action="register"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('RoleSelect');
            });
        }
        c.appendChild(authBlock);
        c.appendChild(this.createSpacer(16));
        const switchWrap = document.createElement('div');
        switchWrap.className = 'view-switch-wrap';
        switchWrap.innerHTML = `
      <a href="#" class="view-switcher" id="doctor-view-link">${icon('medical', 'icon icon-sm')} Doctor Access</a>
      <span class="view-switcher-separator">|</span>
      <a href="#" class="view-switcher" id="admin-view-link">${icon('settings', 'icon icon-sm')} Admin Access</a>
    `;
        switchWrap.querySelector('#doctor-view-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.viewMode = 'doctor';
            this.navigateTo('DoctorLogin');
        });
        switchWrap.querySelector('#admin-view-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.viewMode = 'admin';
            this.navigateTo('AdminLogin');
        });
        c.appendChild(switchWrap);
        return c;
    }
    renderDateSelect() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Select Date', true, 'Home'));
        const banner = document.createElement('div');
        banner.className = 'service-banner';
        banner.innerHTML = `
      <div class="service-banner-icon">${icon('calendar', 'icon')}</div>
      <div class="service-banner-text">
        <h2>Choose Your Date</h2>
        <p>Pick a date to see available time slots with our practitioners.</p>
      </div>
    `;
        c.appendChild(banner);
        const section = document.createElement('div');
        section.className = 'content-section';
        const dateInput = this.createInput('Appointment Date', 'YYYY-MM-DD', {
            type: 'date',
            value: this.selectedDate || this.getMinDate(),
            id: 'date-picker',
        });
        const inputEl = dateInput.querySelector('input');
        if (inputEl) {
            inputEl.min = this.getMinDate();
            inputEl.max = this.getMaxDate();
            inputEl.value = this.selectedDate || this.getMinDate();
            inputEl.onchange = () => { this.selectedDate = inputEl.value; };
        }
        section.appendChild(dateInput);
        section.appendChild(this.createSpacer(24));
        section.appendChild(this.createButton('View Available Slots', async () => {
            const val = document.getElementById('date-picker')?.value;
            if (!val) {
                this.showToast('Please select a date', 'error');
                return;
            }
            this.selectedDate = val;
            await this.loadSlotsAndNavigate();
        }, true, { fullWidth: true, icon: 'calendar' }));
        c.appendChild(section);
        const infoCards = document.createElement('div');
        infoCards.className = 'info-cards';
        infoCards.innerHTML = `
      <div class="info-card">
        <span class="info-card-icon">${icon('clock', 'icon icon-sm')}</span>
        <div><strong>30 min</strong><span>Per session</span></div>
      </div>
      <div class="info-card">
        <span class="info-card-icon">${icon('medical', 'icon icon-sm')}</span>
        <div><strong>Dr. Johnson</strong><span>General practitioner</span></div>
      </div>
      <div class="info-card">
        <span class="info-card-icon">${icon('check', 'icon icon-sm')}</span>
        <div><strong>Instant</strong><span>Confirmation</span></div>
      </div>
    `;
        c.appendChild(infoCards);
        return c;
    }
    async loadSlotsAndNavigate() {
        try {
            const data = await this.api(`/slots/${this.selectedDate}`);
            this.slots = data.slots;
            this.navigateTo('BrowseAvailability');
        }
        catch (err) {
            this.showToast(err instanceof Error ? err.message : 'Failed to load slots', 'error');
        }
    }
    renderBrowseAvailability() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Available Slots', true, 'DateSelect'));
        const banner = document.createElement('div');
        banner.className = 'service-banner service-banner-compact';
        const availableCount = this.slots.filter(s => s.status === 'available').length;
        banner.innerHTML = `
      <div class="service-banner-icon">${icon('clock', 'icon')}</div>
      <div class="service-banner-text">
        <h2>${this.formatDateDisplay(this.selectedDate)}</h2>
        <p>${availableCount} slots available out of ${this.slots.length}</p>
      </div>
    `;
        c.appendChild(banner);
        const legend = document.createElement('div');
        legend.className = 'slot-legend';
        legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot legend-dot-available"></span> Available</span>
      <span class="legend-item"><span class="legend-dot legend-dot-booked"></span> Booked</span>
      <span class="legend-item"><span class="legend-dot legend-dot-blocked"></span> Blocked</span>
    `;
        c.appendChild(legend);
        const grid = document.createElement('div');
        grid.className = 'slot-grid';
        this.slots.forEach(slot => {
            const statusLabel = slot.status === 'available' ? 'Available' : slot.status === 'booked' ? 'Booked' : 'Blocked';
            const card = this.createCard(slot.time, statusLabel, slot.status === 'available' ? () => this.navigateTo('BookingForm', slot) : undefined, statusLabel, slot.status, { showClockIcon: true });
            if (slot.status !== 'available')
                card.classList.add('slot-disabled');
            grid.appendChild(card);
        });
        c.appendChild(grid);
        return c;
    }
    renderBookingForm() {
        const authUser = getAuthUser();
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Booking Details', true, 'BrowseAvailability'));
        const summaryCard = document.createElement('div');
        summaryCard.className = 'booking-summary-card';
        summaryCard.innerHTML = `
      <div class="bsc-row">
        <span class="bsc-icon">${icon('calendar', 'icon icon-sm')}</span>
        <span>${this.formatDateDisplay(this.selectedDate)}</span>
      </div>
      <div class="bsc-row">
        <span class="bsc-icon">${icon('clock', 'icon icon-sm')}</span>
        <span>${this.bookingFormData.time || ''}</span>
      </div>
      <div class="bsc-row">
        <span class="bsc-icon">${icon('user', 'icon icon-sm')}</span>
        <span>${this.bookingFormData.doctor || 'Dr. Sarah Johnson'}</span>
      </div>
    `;
        c.appendChild(summaryCard);
        const section = document.createElement('div');
        section.className = 'content-section';
        section.appendChild(this.createSectionHeading('Patient Information'));
        const nameInput = this.createInput('Full Name *', 'John Doe', { id: 'name', required: true, value: authUser?.name || '' });
        section.appendChild(nameInput);
        section.appendChild(this.createSpacer(16));
        const emailInput = this.createInput('Email *', 'john@example.com', { type: 'email', id: 'email', required: true, value: authUser?.email || '' });
        section.appendChild(emailInput);
        section.appendChild(this.createSpacer(16));
        const phoneInput = this.createInput('Phone *', '+1 (555) 123-4567', { type: 'tel', id: 'phone', required: true });
        section.appendChild(phoneInput);
        section.appendChild(this.createSpacer(16));
        const reasonInput = this.createInput('Reason for Visit (optional)', 'Brief description', { multiline: true, id: 'reason' });
        section.appendChild(reasonInput);
        section.appendChild(this.createSpacer(32));
        section.appendChild(this.createButton('Confirm Booking', async () => {
            const name = document.getElementById('name')?.value?.trim();
            const email = document.getElementById('email')?.value?.trim();
            const phone = document.getElementById('phone')?.value?.trim();
            const reason = document.getElementById('reason')?.value?.trim();
            if (!name || !email || !phone) {
                this.showToast('Please fill in name, email, and phone', 'error');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.showToast('Please enter a valid email address', 'error');
                return;
            }
            if (!/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
                this.showToast('Please enter a valid phone number (at least 10 digits)', 'error');
                return;
            }
            try {
                const result = await this.api('/book', {
                    method: 'POST',
                    body: JSON.stringify({ date: this.selectedDate, time: this.bookingFormData.time, patientName: name, email, phone, doctor: this.bookingFormData.doctor, type: this.bookingFormData.type, reason: reason || undefined }),
                });
                this.selectedAppointment = result.appointment;
                this.selectedAppointment.id = result.appointmentId;
                this.showToast('Appointment booked successfully!', 'success');
                this.navigateTo('BookingConfirmation');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Booking failed', 'error');
            }
        }, true, { fullWidth: true, icon: 'check' }));
        section.appendChild(this.createSpacer(12));
        section.appendChild(this.createButton('Cancel', () => this.navigateTo('BrowseAvailability'), false, { fullWidth: true }));
        c.appendChild(section);
        return c;
    }
    renderBookingConfirmation() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Booking Confirmed', true, 'Home'));
        const successBlock = document.createElement('div');
        successBlock.className = 'confirmation-block';
        successBlock.innerHTML = `
      <div class="success-icon">${icon('check', 'icon')}</div>
      <h2 class="confirm-title">Appointment Confirmed!</h2>
      <p class="confirm-id">Booking ID: ${this.selectedAppointment?.id || '—'}</p>
    `;
        c.appendChild(successBlock);
        const details = document.createElement('div');
        details.className = 'confirmation-details';
        details.innerHTML = `
      <div class="conf-detail-row">
        <span class="conf-detail-label">${icon('calendar', 'icon icon-sm')} Date</span>
        <span class="conf-detail-value">${this.formatDateDisplay(this.selectedAppointment?.date || '')}</span>
      </div>
      <div class="conf-detail-row">
        <span class="conf-detail-label">${icon('clock', 'icon icon-sm')} Time</span>
        <span class="conf-detail-value">${this.selectedAppointment?.time || ''}</span>
      </div>
      <div class="conf-detail-row">
        <span class="conf-detail-label">${icon('user', 'icon icon-sm')} Doctor</span>
        <span class="conf-detail-value">${this.selectedAppointment?.doctor || 'Dr. Sarah Johnson'}</span>
      </div>
      <div class="conf-detail-row">
        <span class="conf-detail-label">${icon('medical', 'icon icon-sm')} Location</span>
        <span class="conf-detail-value">Main Clinic, Room 205</span>
      </div>
    `;
        c.appendChild(details);
        if (this.config.notificationsEnabled) {
            const note = document.createElement('div');
            note.className = 'confirm-note-box';
            note.innerHTML = `${icon('mail', 'icon icon-sm')} <span>You'll receive email and SMS confirmation. A reminder will be sent 24h before.</span>`;
            c.appendChild(note);
        }
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Back to Home', () => this.navigateTo('Home'), true, { fullWidth: true }));
        return c;
    }
    renderCancelAppointment() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('My Appointments', true, 'Home'));
        const section = document.createElement('div');
        section.className = 'content-section';
        section.appendChild(this.createSectionHeading('Cancel an appointment'));
        section.appendChild(this.createElement('p', 'section-label', 'Enter your Booking ID to cancel'));
        section.appendChild(this.createSpacer(16));
        const idInput = this.createInput('Booking ID', 'BK-2026-1234', { id: 'cancel-id' });
        section.appendChild(idInput);
        section.appendChild(this.createSpacer(20));
        section.appendChild(this.createButton('Cancel Appointment', async () => {
            const id = document.getElementById('cancel-id')?.value?.trim();
            if (!id) {
                this.showToast('Please enter your booking ID', 'error');
                return;
            }
            try {
                await this.api('/cancel', {
                    method: 'POST',
                    body: JSON.stringify({ appointmentId: id }),
                });
                this.showToast('Appointment cancelled successfully', 'success');
                this.navigateTo('Home');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Cancellation failed', 'error');
            }
        }, true, { fullWidth: true }));
        section.appendChild(this.createSpacer(32));
        section.appendChild(this.createElement('h3', 'section-label', 'Need help?'));
        section.appendChild(this.createElement('p', 'help-text', 'Your Booking ID was sent to your email when you made the appointment. It looks like BK-2026-1234.'));
        c.appendChild(section);
        return c;
    }
    renderRoleSelect() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Create Account', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('p', 'section-label', 'Choose your role to create an account'));
        c.appendChild(this.createSpacer(32));
        const roleCards = document.createElement('div');
        roleCards.className = 'action-cards';
        // Patient role card
        roleCards.appendChild(this.createActionCard('user', 'Patient', 'Book and manage your medical appointments', () => this.navigateTo('ClientRegister')));
        // Doctor role card
        roleCards.appendChild(this.createActionCard('medical', 'Doctor', 'Manage schedule and handle appointments', () => this.navigateTo('DoctorRegister')));
        // Admin role card
        roleCards.appendChild(this.createActionCard('settings', 'Admin', 'Access system dashboard and user management', () => this.navigateTo('AdminRegister')));
        c.appendChild(roleCards);
        c.appendChild(this.createSpacer(24));
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'view-switcher';
        loginLink.textContent = 'Already have an account? Log in';
        loginLink.onclick = (e) => { e.preventDefault(); this.navigateTo('Home'); };
        c.appendChild(loginLink);
        return c;
    }
    renderLoginRoleSelect() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Login', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('p', 'section-label', 'Choose your role to sign in'));
        c.appendChild(this.createSpacer(32));
        const roleCards = document.createElement('div');
        roleCards.className = 'action-cards';
        // Patient login card
        roleCards.appendChild(this.createActionCard('user', 'Patient', 'Sign in to book and manage appointments', () => this.navigateTo('ClientLogin')));
        // Doctor login card
        roleCards.appendChild(this.createActionCard('medical', 'Doctor', 'Sign in to manage your schedule', () => this.navigateTo('DoctorLogin')));
        // Admin login card
        roleCards.appendChild(this.createActionCard('settings', 'Admin', 'Sign in to access system dashboard', () => this.navigateTo('AdminLogin')));
        c.appendChild(roleCards);
        c.appendChild(this.createSpacer(24));
        const signupLink = document.createElement('a');
        signupLink.href = '#';
        signupLink.className = 'view-switcher';
        signupLink.textContent = "Don't have an account? Sign up";
        signupLink.onclick = (e) => { e.preventDefault(); this.navigateTo('RoleSelect'); };
        c.appendChild(signupLink);
        return c;
    }
    renderClientLogin() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Client Login', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('p', 'section-label', 'Sign in to book or manage appointments'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Email', 'you@example.com', { type: 'email', id: 'client-login-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'client-login-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Sign In', async () => {
            const email = document.getElementById('client-login-email')?.value?.trim();
            const password = document.getElementById('client-login-password')?.value;
            if (!email || !password) {
                this.showToast('Please enter email and password', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, role: 'client' }),
                });
                setAuthToken(data.token, 'client', data.user);
                this.showToast('Signed in successfully', 'success');
                this.navigateTo('PatientDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Login failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const regLink = document.createElement('a');
        regLink.href = '#';
        regLink.className = 'view-switcher';
        regLink.textContent = 'Create an account';
        regLink.onclick = (e) => { e.preventDefault(); this.navigateTo('ClientRegister'); };
        c.appendChild(regLink);
        return c;
    }
    renderClientRegister() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Create Account', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Full Name', 'Jane Doe', { id: 'client-reg-name' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Email', 'jane@example.com', { type: 'email', id: 'client-reg-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'client-reg-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Register', async () => {
            const name = document.getElementById('client-reg-name')?.value?.trim();
            const email = document.getElementById('client-reg-email')?.value?.trim();
            const password = document.getElementById('client-reg-password')?.value;
            if (!name || !email || !password) {
                this.showToast('Please fill in all fields', 'error');
                return;
            }
            if (password.length < 6) {
                this.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, name, role: 'client' }),
                });
                setAuthToken(data.token, 'client', data.user);
                this.showToast('Account created. You are signed in.', 'success');
                this.navigateTo('PatientDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'view-switcher';
        loginLink.textContent = 'Already have an account? Log in';
        loginLink.onclick = (e) => { e.preventDefault(); this.navigateTo('ClientLogin'); };
        c.appendChild(loginLink);
        return c;
    }
    renderDoctorLogin() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Doctor Access', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('p', 'section-label', 'Sign in with your doctor account'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Email', 'doctor@clinic.com', { type: 'email', id: 'doctor-login-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'doctor-login-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Sign In', async () => {
            const email = document.getElementById('doctor-login-email')?.value?.trim();
            const password = document.getElementById('doctor-login-password')?.value;
            if (!email || !password) {
                this.showToast('Please enter email and password', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                const userRole = data.user.role || 'doctor';
                setAuthToken(data.token, userRole, data.user);
                this.doctorLoggedIn = true;
                this.showToast('Signed in successfully', 'success');
                if (userRole === 'admin') {
                    this.navigateTo('AdminDashboard');
                }
                else {
                    this.navigateTo('DoctorDashboard');
                }
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Login failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const regLink = document.createElement('a');
        regLink.href = '#';
        regLink.className = 'view-switcher';
        regLink.textContent = 'Create doctor account';
        regLink.onclick = (e) => { e.preventDefault(); this.navigateTo('DoctorRegister'); };
        c.appendChild(regLink);
        c.appendChild(this.createSpacer(8));
        const backLink = document.createElement('a');
        backLink.href = '#';
        backLink.className = 'view-switcher';
        backLink.textContent = '← Back to Patient View';
        backLink.onclick = (e) => {
            e.preventDefault();
            this.viewMode = 'patient';
            this.navigateTo('Home');
        };
        c.appendChild(backLink);
        return c;
    }
    renderDoctorRegister() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Doctor Registration', true, 'DoctorLogin'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Full Name', 'Dr. Sarah Johnson', { id: 'doctor-reg-name' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Email', 'doctor@clinic.com', { type: 'email', id: 'doctor-reg-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'doctor-reg-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Register', async () => {
            const name = document.getElementById('doctor-reg-name')?.value?.trim();
            const email = document.getElementById('doctor-reg-email')?.value?.trim();
            const password = document.getElementById('doctor-reg-password')?.value;
            if (!name || !email || !password) {
                this.showToast('Please fill in all fields', 'error');
                return;
            }
            if (password.length < 6) {
                this.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, name, role: 'doctor' }),
                });
                setAuthToken(data.token, 'doctor', data.user);
                this.doctorLoggedIn = true;
                this.showToast('Account created. You are signed in.', 'success');
                this.navigateTo('DoctorDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'view-switcher';
        loginLink.textContent = 'Already have an account? Log in';
        loginLink.onclick = (e) => { e.preventDefault(); this.navigateTo('DoctorLogin'); };
        c.appendChild(loginLink);
        return c;
    }
    renderAdminLogin() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Admin Access', true, 'Home'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('p', 'section-label', 'Sign in with your admin account'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Email', 'admin@clinic.com', { type: 'email', id: 'admin-login-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'admin-login-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Sign In', async () => {
            const email = document.getElementById('admin-login-email')?.value?.trim();
            const password = document.getElementById('admin-login-password')?.value;
            if (!email || !password) {
                this.showToast('Please enter email and password', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                const userRole = data.user.role || 'admin';
                if (userRole !== 'admin') {
                    this.showToast('This account does not have admin privileges', 'error');
                    return;
                }
                setAuthToken(data.token, userRole, data.user);
                this.showToast('Signed in successfully', 'success');
                this.navigateTo('AdminDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Login failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const regLink = document.createElement('a');
        regLink.href = '#';
        regLink.className = 'view-switcher';
        regLink.textContent = 'Create admin account';
        regLink.onclick = (e) => { e.preventDefault(); this.navigateTo('AdminRegister'); };
        c.appendChild(regLink);
        c.appendChild(this.createSpacer(8));
        const backLink = document.createElement('a');
        backLink.href = '#';
        backLink.className = 'view-switcher';
        backLink.textContent = '← Back to Main';
        backLink.onclick = (e) => {
            e.preventDefault();
            this.navigateTo('Home');
        };
        c.appendChild(backLink);
        return c;
    }
    renderAdminRegister() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Admin Registration', true, 'AdminLogin'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createInput('Full Name', 'Administrator', { id: 'admin-reg-name' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Email', 'admin@clinic.com', { type: 'email', id: 'admin-reg-email' }));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createInput('Password', '••••••••', { type: 'password', id: 'admin-reg-password' }));
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Register', async () => {
            const name = document.getElementById('admin-reg-name')?.value?.trim();
            const email = document.getElementById('admin-reg-email')?.value?.trim();
            const password = document.getElementById('admin-reg-password')?.value;
            if (!name || !email || !password) {
                this.showToast('Please fill in all fields', 'error');
                return;
            }
            if (password.length < 6) {
                this.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            try {
                const data = await this.api('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, name, role: 'admin' }),
                });
                setAuthToken(data.token, 'admin', data.user);
                this.showToast('Account created. You are signed in.', 'success');
                this.navigateTo('AdminDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(16));
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'view-switcher';
        loginLink.textContent = 'Already have an account? Log in';
        loginLink.onclick = (e) => { e.preventDefault(); this.navigateTo('AdminLogin'); };
        c.appendChild(loginLink);
        return c;
    }
    renderDoctorDashboard() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Doctor Dashboard'));
        c.appendChild(this.createSpacer(20));
        const hero = document.createElement('div');
        hero.className = 'hero-block hero-block-compact';
        hero.innerHTML = `
      <h2 class="hero-title">Schedule Management</h2>
      <p class="hero-subtitle">View and manage appointments</p>
    `;
        c.appendChild(hero);
        c.appendChild(this.createSpacer(24));
        const actionCards = document.createElement('div');
        actionCards.className = 'action-cards';
        actionCards.appendChild(this.createActionCard('viewGrid', 'View Day Schedule', 'See appointments and blocked slots', () => this.navigateTo('DoctorDaySelect')));
        actionCards.appendChild(this.createActionCard('ban', 'Block Time Slot', 'Make a slot unavailable', () => this.navigateTo('BlockTimeSlot')));
        actionCards.appendChild(this.createActionCard('calendar', 'Unblock Time Slot', 'Restore availability', () => this.loadBlockedSlots().then(() => this.navigateTo('UnblockTimeSlot'))));
        actionCards.appendChild(this.createActionCard('list', 'View Past History', 'Browse previous appointments', () => this.navigateTo('AppointmentHistory')));
        actionCards.appendChild(this.createActionCard('settings', 'Clinic Settings', 'Business hours and notifications', () => this.navigateTo('Settings')));
        c.appendChild(actionCards);
        c.appendChild(this.createSpacer(20));
        const logoutBtn = this.createButton('Log out', () => {
            clearAuth();
            this.doctorLoggedIn = false;
            this.viewMode = 'patient';
            this.navigateTo('Home');
        }, false, { fullWidth: true, icon: 'logout' });
        logoutBtn.className = 'btn btn-ghost btn-full';
        c.appendChild(logoutBtn);
        c.appendChild(this.createSpacer(12));
        const switchWrap = document.createElement('div');
        switchWrap.className = 'view-switch-wrap';
        switchWrap.innerHTML = '<a href="#" class="view-switcher">Switch to Patient View</a>';
        switchWrap.querySelector('.view-switcher')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.viewMode = 'patient';
            this.navigateTo('Home');
        });
        c.appendChild(switchWrap);
        return c;
    }
    renderPatientDashboard() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('My Appointments'));
        c.appendChild(this.createSpacer(20));
        const user = getAuthUser();
        const hero = document.createElement('div');
        hero.className = 'hero-block hero-block-compact';
        hero.innerHTML = `
      <h2 class="hero-title">Welcome, ${user?.name || 'Patient'}</h2>
      <p class="hero-subtitle">Manage your appointment schedule</p>
    `;
        c.appendChild(hero);
        c.appendChild(this.createSpacer(24));
        const section = document.createElement('div');
        section.className = 'content-section';
        section.appendChild(this.createSectionHeading('Quick Actions'));
        const actionCards = document.createElement('div');
        actionCards.className = 'action-cards';
        actionCards.appendChild(this.createActionCard('calendar', 'Book Appointment', 'Schedule a new visit', () => this.navigateTo('DateSelect')));
        actionCards.appendChild(this.createActionCard('clipboard', 'Cancel Appointment', 'Manage existing bookings', () => this.navigateTo('CancelAppointment')));
        actionCards.appendChild(this.createActionCard('settings', 'Account Settings', 'Update preferences', () => this.navigateTo('Settings')));
        section.appendChild(actionCards);
        section.appendChild(this.createSpacer(24));
        section.appendChild(this.createSectionHeading('Upcoming Appointments'));
        const appointmentsList = document.createElement('div');
        if (this.patientDashboard?.upcomingAppointments?.length) {
            this.patientDashboard.upcomingAppointments.forEach((appt) => {
                const card = this.createCard(`${appt.date} at ${appt.time}`, `${appt.patientName} - ${appt.type}`, () => this.navigateTo('AppointmentDetails', appt), 'Confirmed', 'available');
                appointmentsList.appendChild(card);
            });
        }
        else {
            const empty = document.createElement('p');
            empty.textContent = 'No upcoming appointments. Book one now!';
            empty.className = 'section-label';
            appointmentsList.appendChild(empty);
        }
        section.appendChild(appointmentsList);
        c.appendChild(section);
        c.appendChild(this.createSpacer(24));
        const logoutBtn = this.createButton('Log out', () => {
            clearAuth();
            this.navigateTo('Home');
        }, false, { fullWidth: true, icon: 'logout' });
        logoutBtn.className = 'btn btn-ghost btn-full';
        c.appendChild(logoutBtn);
        return c;
    }
    renderAdminDashboard() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Admin Dashboard'));
        c.appendChild(this.createSpacer(20));
        const hero = document.createElement('div');
        hero.className = 'hero-block hero-block-compact';
        hero.innerHTML = `
      <h2 class="hero-title">System Administration</h2>
      <p class="hero-subtitle">Manage users, appointments, and settings</p>
    `;
        c.appendChild(hero);
        c.appendChild(this.createSpacer(24));
        const statsSection = document.createElement('div');
        statsSection.className = 'content-section';
        if (this.adminDashboard?.stats) {
            const stats = this.adminDashboard.stats;
            statsSection.innerHTML = `
        <h3 class="section-heading">System Statistics</h3>
        <div class="info-cards">
          <div class="info-card">
            <span class="info-card-icon">${icon('user', 'icon icon-sm')}</span>
            <div><strong>${stats.totalUsers}</strong><span>Total Users</span></div>
          </div>
          <div class="info-card">
            <span class="info-card-icon">${icon('medical', 'icon icon-sm')}</span>
            <div><strong>${stats.totalDoctors}</strong><span>Doctors</span></div>
          </div>
          <div class="info-card">
            <span class="info-card-icon">${icon('user', 'icon icon-sm')}</span>
            <div><strong>${stats.totalClients}</strong><span>Patients</span></div>
          </div>
          <div class="info-card">
            <span class="info-card-icon">${icon('calendar', 'icon icon-sm')}</span>
            <div><strong>${stats.totalAppointments}</strong><span>Appointments</span></div>
          </div>
        </div>
      `;
        }
        c.appendChild(statsSection);
        c.appendChild(this.createSpacer(20));
        const actionSection = document.createElement('div');
        actionSection.className = 'content-section';
        actionSection.appendChild(this.createSectionHeading('Management'));
        const actionCards = document.createElement('div');
        actionCards.className = 'action-cards';
        actionCards.appendChild(this.createActionCard('user', 'Manage Users', 'Add, edit, or remove users', () => this.showToast('User management coming soon', 'info')));
        actionCards.appendChild(this.createActionCard('list', 'Activity Logs', 'View system activity', () => this.showToast('Activity logs coming soon', 'info')));
        actionCards.appendChild(this.createActionCard('settings', 'System Configuration', 'Configure business hours', () => this.navigateTo('Settings')));
        actionCards.appendChild(this.createActionCard('calendar', 'Appointment History', 'View all appointments', () => this.showToast('Appointment history coming soon', 'info')));
        actionSection.appendChild(actionCards);
        c.appendChild(actionSection);
        c.appendChild(this.createSpacer(24));
        const logoutBtn = this.createButton('Log out', () => {
            clearAuth();
            this.navigateTo('Home');
        }, false, { fullWidth: true, icon: 'logout' });
        logoutBtn.className = 'btn btn-ghost btn-full';
        c.appendChild(logoutBtn);
        return c;
    }
    renderDoctorDaySelect() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Select Day', true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(24));
        const dateInput = this.createInput('Date', '', { type: 'date', id: 'doctor-date' });
        const inputEl = dateInput.querySelector('input');
        if (inputEl) {
            inputEl.value = this.selectedDate || new Date().toISOString().split('T')[0];
            inputEl.min = this.getMinDate();
            inputEl.max = this.getMaxDate();
        }
        c.appendChild(dateInput);
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createButton('View Schedule', async () => {
            const val = document.getElementById('doctor-date')?.value;
            if (!val) {
                this.showToast('Please select a date', 'error');
                return;
            }
            this.selectedDate = val;
            try {
                const [aptRes, blockRes] = await Promise.all([
                    this.api(`/appointments/${this.selectedDate}`),
                    this.api(`/blocked/${this.selectedDate}`),
                ]);
                this.appointments = aptRes.appointments || [];
                this.blockedSlots = blockRes.blocked || [];
                this.navigateTo('DayView');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Failed to load schedule', 'error');
            }
        }, true, { fullWidth: true }));
        return c;
    }
    renderDayView() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader("Day Schedule", true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(16));
        c.appendChild(this.createElement('h2', 'date-display', this.formatDateDisplay(this.selectedDate)));
        c.appendChild(this.createSpacer(20));
        const allItems = [];
        this.appointments.forEach((a) => allItems.push({ time: a.time, type: 'appointment', data: a }));
        this.blockedSlots.forEach((b) => allItems.push({ time: b.startTime, type: 'blocked', data: b }));
        allItems.sort((a, b) => {
            const parse = (t) => {
                const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (!m)
                    return 0;
                let h = parseInt(m[1], 10);
                if ((m[3] || '').toUpperCase() === 'PM' && h < 12)
                    h += 12;
                if ((m[3] || '').toUpperCase() === 'AM' && h === 12)
                    h = 0;
                return h * 60 + parseInt(m[2], 10);
            };
            return parse(a.time) - parse(b.time);
        });
        allItems.forEach((item) => {
            if (item.type === 'appointment') {
                const apt = item.data;
                const card = this.createCard(apt.time, `${apt.patientName}\n${apt.email} • ${apt.phone}\n${apt.type || 'Consultation'}`, () => this.navigateTo('AppointmentDetails', apt), undefined, undefined);
                card.classList.add('card-appointment');
                c.appendChild(card);
            }
            else {
                const block = item.data;
                const card = this.createCard(`${block.startTime} – ${block.endTime}`, `Blocked: ${block.reason}`, undefined, 'Blocked', 'blocked');
                card.classList.add('card-blocked');
                c.appendChild(card);
            }
            c.appendChild(this.createSpacer(12));
        });
        if (allItems.length === 0) {
            c.appendChild(this.createElement('p', 'empty-state', 'No appointments or blocked slots for this day'));
        }
        return c;
    }
    renderBlockTimeSlot() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Block Time Slot', true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(24));
        const dateInput = this.createInput('Date', '', { type: 'date', id: 'block-date' });
        const dateEl = dateInput.querySelector('input');
        if (dateEl)
            dateEl.value = this.selectedDate || new Date().toISOString().split('T')[0];
        c.appendChild(dateInput);
        c.appendChild(this.createSpacer(16));
        const startInput = this.createInput('Start Time', '9:00 AM', { id: 'block-start' });
        c.appendChild(startInput);
        c.appendChild(this.createSpacer(16));
        const endInput = this.createInput('End Time', '10:00 AM', { id: 'block-end' });
        c.appendChild(endInput);
        c.appendChild(this.createSpacer(16));
        const reasonInput = this.createInput('Reason', 'Lunch break, Meeting, etc.', {
            multiline: true,
            id: 'block-reason',
        });
        c.appendChild(reasonInput);
        c.appendChild(this.createSpacer(32));
        c.appendChild(this.createButton('Block Slot', async () => {
            const date = document.getElementById('block-date')?.value;
            const startTime = document.getElementById('block-start')?.value;
            const endTime = document.getElementById('block-end')?.value;
            const reason = document.getElementById('block-reason')?.value?.trim();
            if (!date || !startTime || !endTime || !reason) {
                this.showToast('Please fill in all fields', 'error');
                return;
            }
            try {
                await this.api('/block', {
                    method: 'POST',
                    body: JSON.stringify({ date, startTime, endTime, reason }),
                });
                this.showToast('Time slot blocked successfully', 'success');
                this.navigateTo('DoctorDashboard');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Failed to block slot', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(12));
        c.appendChild(this.createButton('Cancel', () => this.navigateTo('DoctorDashboard'), false, { fullWidth: true }));
        return c;
    }
    async loadBlockedSlots() {
        try {
            const data = await this.api('/blocked');
            this.blockedSlots = data;
        }
        catch {
            this.blockedSlots = [];
        }
    }
    async loadPatientDashboard() {
        try {
            const data = await this.api('/patient/dashboard');
            this.patientDashboard = data;
        }
        catch (err) {
            console.error('Failed to load patient dashboard:', err);
            this.patientDashboard = null;
        }
    }
    async loadDoctorDashboard() {
        try {
            const data = await this.api('/doctor/dashboard');
            this.doctorDashboard = data;
        }
        catch (err) {
            console.error('Failed to load doctor dashboard:', err);
            this.doctorDashboard = null;
        }
    }
    async loadAdminDashboard() {
        try {
            const data = await this.api('/admin/dashboard');
            this.adminDashboard = data;
        }
        catch (err) {
            console.error('Failed to load admin dashboard:', err);
            this.adminDashboard = null;
        }
    }
    renderUnblockTimeSlot() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Unblock Time Slot', true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(24));
        if (this.blockedSlots.length === 0) {
            c.appendChild(this.createElement('p', 'empty-state', 'No blocked slots'));
            c.appendChild(this.createSpacer(24));
        }
        else {
            this.blockedSlots.forEach((slot) => {
                const card = this.createCard(`${slot.date} • ${slot.startTime} – ${slot.endTime}`, slot.reason, async () => {
                    if (!confirm(`Unblock ${slot.startTime}–${slot.endTime} on ${slot.date}?`))
                        return;
                    try {
                        await this.api('/unblock', {
                            method: 'POST',
                            body: JSON.stringify({ slotId: slot.id }),
                        });
                        this.showToast('Slot unblocked successfully', 'success');
                        await this.loadBlockedSlots();
                        this.render();
                    }
                    catch (err) {
                        this.showToast(err instanceof Error ? err.message : 'Failed to unblock', 'error');
                    }
                }, 'Blocked', 'blocked');
                card.classList.add('card-clickable');
                c.appendChild(card);
                c.appendChild(this.createSpacer(12));
            });
        }
        c.appendChild(this.createButton('Back', () => this.navigateTo('DoctorDashboard'), false, { fullWidth: true }));
        return c;
    }
    renderAppointmentDetails() {
        const apt = this.selectedAppointment;
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Appointment Details', true, 'DayView'));
        c.appendChild(this.createSpacer(24));
        if (apt) {
            const details = document.createElement('div');
            details.className = 'detail-card';
            details.innerHTML = `
        <h3>Patient Contact</h3>
        <p><strong>Name:</strong> ${apt.patientName}</p>
        <p><strong>Email:</strong> ${apt.email}</p>
        <p><strong>Phone:</strong> ${apt.phone}</p>
        <h3>Appointment</h3>
        <p><strong>Date:</strong> ${this.formatDateDisplay(apt.date)}</p>
        <p><strong>Time:</strong> ${apt.time}</p>
        <p><strong>Type:</strong> ${apt.type || 'Consultation'}</p>
        ${apt.reason ? `<p><strong>Reason:</strong> ${apt.reason}</p>` : ''}
      `;
            c.appendChild(details);
        }
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createButton('Back to Schedule', () => this.navigateTo('DoctorDaySelect'), true, {
            fullWidth: true,
        }));
        return c;
    }
    renderAppointmentHistory() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Past Appointments', true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(24));
        const dateInput = this.createInput('Show appointments before', '', {
            type: 'date',
            id: 'history-date',
        });
        const inputEl = dateInput.querySelector('input');
        if (inputEl) {
            inputEl.value = new Date().toISOString().split('T')[0];
        }
        c.appendChild(dateInput);
        c.appendChild(this.createSpacer(16));
        const loadBtn = this.createButton('Load History', async () => {
            const val = document.getElementById('history-date')?.value;
            if (!val) {
                this.showToast('Please select a date', 'error');
                return;
            }
            try {
                const data = await this.api(`/appointments/history/${val}`);
                this.appointments = data.appointments || [];
                this.selectedDate = val;
                this.navigateTo('AppointmentHistory');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Failed to load history', 'error');
            }
        }, true, { fullWidth: true });
        c.appendChild(loadBtn);
        c.appendChild(this.createSpacer(24));
        if (this.appointments.length > 0 && this.selectedDate) {
            c.appendChild(this.createElement('p', 'section-label', `Showing ${this.appointments.length} past appointment(s) before ${this.formatDateDisplay(this.selectedDate)}`));
            c.appendChild(this.createSpacer(12));
            this.appointments.forEach((apt) => {
                const card = this.createCard(`${apt.date} • ${apt.time}`, `${apt.patientName}\n${apt.email} • ${apt.phone}`, () => this.navigateTo('AppointmentDetails', apt));
                card.classList.add('card-appointment', 'card-clickable');
                c.appendChild(card);
                c.appendChild(this.createSpacer(12));
            });
        }
        else if (this.appointments.length === 0 && this.selectedDate) {
            c.appendChild(this.createElement('p', 'empty-state', 'No past appointments found'));
        }
        return c;
    }
    renderSettings() {
        const c = document.createElement('div');
        c.className = 'screen';
        c.appendChild(this.createHeader('Clinic Settings', true, 'DoctorDashboard'));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('h3', 'section-label', 'Business Hours (N2)'));
        c.appendChild(this.createElement('p', 'help-text', `Current: ${this.config.businessHours?.start ?? 9}:00 – ${this.config.businessHours?.end ?? 17}:00`));
        c.appendChild(this.createSpacer(16));
        const startInput = this.createInput('Start Hour', '9', { type: 'number', id: 'config-start' });
        startInput.querySelector('input').value = String(this.config.businessHours?.start ?? 9);
        c.appendChild(startInput);
        c.appendChild(this.createSpacer(12));
        const endInput = this.createInput('End Hour', '17', { type: 'number', id: 'config-end' });
        endInput.querySelector('input').value = String(this.config.businessHours?.end ?? 17);
        c.appendChild(endInput);
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createButton('Save Hours', async () => {
            const start = parseInt(document.getElementById('config-start')?.value || '9', 10);
            const end = parseInt(document.getElementById('config-end')?.value || '17', 10);
            if (start < 0 || start > 23 || end < 0 || end > 24 || start >= end) {
                this.showToast('Invalid hours. Start must be before end.', 'error');
                return;
            }
            try {
                await this.api('/config', {
                    method: 'PATCH',
                    body: JSON.stringify({ businessHours: { start, end } }),
                });
                await this.loadConfig();
                this.showToast('Business hours updated', 'success');
            }
            catch (err) {
                this.showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
            }
        }, true, { fullWidth: true }));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createElement('h3', 'section-label', 'Notifications (S5)'));
        c.appendChild(this.createElement('p', 'help-text', `Status: ${this.config.notificationsEnabled ? 'Enabled' : 'Disabled'} — Email/SMS work when enabled`));
        c.appendChild(this.createSpacer(24));
        c.appendChild(this.createButton('Back', () => this.navigateTo('DoctorDashboard'), false, { fullWidth: true }));
        return c;
    }
    render() {
        const app = document.getElementById('app');
        if (!app)
            return;
        app.innerHTML = '';
        let screen;
        switch (this.currentScreen) {
            case 'Home':
                screen = this.renderHome();
                break;
            case 'RoleSelect':
                screen = this.renderRoleSelect();
                break;
            case 'LoginRoleSelect':
                screen = this.renderLoginRoleSelect();
                break;
            case 'DateSelect':
                screen = this.renderDateSelect();
                break;
            case 'BrowseAvailability':
                screen = this.renderBrowseAvailability();
                break;
            case 'BookingForm':
                screen = this.renderBookingForm();
                break;
            case 'BookingConfirmation':
                screen = this.renderBookingConfirmation();
                break;
            case 'CancelAppointment':
                screen = this.renderCancelAppointment();
                break;
            case 'ClientLogin':
                screen = this.renderClientLogin();
                break;
            case 'ClientRegister':
                screen = this.renderClientRegister();
                break;
            case 'DoctorLogin':
                screen = this.renderDoctorLogin();
                break;
            case 'DoctorRegister':
                screen = this.renderDoctorRegister();
                break;
            case 'AdminLogin':
                screen = this.renderAdminLogin();
                break;
            case 'AdminRegister':
                screen = this.renderAdminRegister();
                break;
            case 'DoctorDashboard':
                screen = this.renderDoctorDashboard();
                break;
            case 'PatientDashboard':
                screen = this.renderPatientDashboard();
                break;
            case 'AdminDashboard':
                screen = this.renderAdminDashboard();
                break;
            case 'DoctorDaySelect':
                screen = this.renderDoctorDaySelect();
                break;
            case 'DayView':
                screen = this.renderDayView();
                break;
            case 'BlockTimeSlot':
                screen = this.renderBlockTimeSlot();
                break;
            case 'UnblockTimeSlot':
                screen = this.renderUnblockTimeSlot();
                break;
            case 'AppointmentDetails':
                screen = this.renderAppointmentDetails();
                break;
            case 'Settings':
                screen = this.renderSettings();
                break;
            case 'AppointmentHistory':
                screen = this.renderAppointmentHistory();
                break;
            default:
                screen = this.renderHome();
        }
        screen.classList.add('screen-inner');
        app.appendChild(screen);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new ClinicBookingApp();
});
