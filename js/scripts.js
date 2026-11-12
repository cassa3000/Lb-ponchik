
(function () {
    'use strict';

    var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

    /* =========================================================
       СКРИПТ 1. СЧЁТЧИК ПОСЕТИТЕЛЕЙ
       Гибридный: localStorage + попытка запросить внешний API
       ========================================================= */
    function initVisitorCounter() {
        var STORAGE_KEY = 'kodoteka_visits_total';
        var SESSION_KEY = 'kodoteka_session_started';
        var API_URL = 'https://api.countapi.xyz/hit/kodoteka-site/visits';

        // Локальный счётчик (инкремент только за сессию)
        var localCount = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

        if (!sessionStorage.getItem(SESSION_KEY)) {
            localCount += 1;
            localStorage.setItem(STORAGE_KEY, localCount);
            sessionStorage.setItem(SESSION_KEY, '1');
        }

        // Создаём блок счётчика
        var counter = document.createElement('div');
        counter.className = 'visitor-counter';
        counter.title = 'Счётчик посетителей сайта';
        counter.innerHTML =
            '<span class="dot"></span>' +
            '<span>Посетителей: </span>' +
            '<span class="count" id="visitorCount">' + localCount + '</span>';

        document.body.appendChild(counter);

        // Пытаемся получить данные с внешнего API
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_URL, true);
        xhr.timeout = 4000;

        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var el = $('#visitorCount');
                    if (el && data && typeof data.value === 'number') {
                        el.textContent = data.value;
                        counter.title = 'Счётчик посетителей (внешний сервис)';
                    }
                } catch (e) {
                    // тихо игнорируем — остаёмся на локальном значении
                }
            }
        };

        xhr.onerror = xhr.ontimeout = function () {
            // Внешний API недоступен — используем локальные данные
        };

        try {
            xhr.send();
        } catch (e) {
            // Игнорируем — счётчик работает на localStorage
        }
    }

    /* =========================================================
       СКРИПТ 2. ЧАСЫ РЕАЛЬНОГО ВРЕМЕНИ
       ========================================================= */
    function initClock() {
        var clockEl = $('#liveClock');
        var dateEl  = $('#liveDate');
        if (!clockEl) return;

        var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда',
                    'четверг', 'пятница', 'суббота'];

        function pad(n) { return n < 10 ? '0' + n : '' + n; }

        function tick() {
            var now = new Date();
            clockEl.textContent =
                pad(now.getHours()) + ':' +
                pad(now.getMinutes()) + ':' +
                pad(now.getSeconds());

            if (dateEl) {
                dateEl.textContent =
                    DAYS[now.getDay()] + ', ' +
                    now.getDate() + ' ' +
                    MONTHS[now.getMonth()] + ' ' +
                    now.getFullYear() + ' г.';
            }
        }

        tick();
        setInterval(tick, 1000);
    }

    /* =========================================================
       СКРИПТ 3. ИНТЕРФЕЙС
       (бургер-меню, модальные окна, валидация форм, toast)
       ========================================================= */

    // ----- Toast-уведомления -----
    function showToast(message, type) {
        var toast = document.createElement('div');
        toast.className = 'toast' + (type === 'error' ? ' error' : '');
        toast.textContent = message;
        document.body.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3200);
    }

    // ----- Активная ссылка в навигации -----
    function highlightActiveNav() {
        var path = window.location.pathname.split('/').pop() || 'index.html';
        $$('.nav a').forEach(function (link) {
            var href = link.getAttribute('href') || '';
            var file = href.split('/').pop().split('#')[0];
            if (file === path) link.classList.add('active');
        });
    }

    // ----- Бургер-меню -----
    function initBurger() {
        var nav = $('.nav');
        if (!nav) return;

        var btn = document.createElement('button');
        btn.className = 'nav-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Открыть меню');
        btn.innerHTML = '&#9776; Меню';
        nav.insertBefore(btn, nav.firstChild);

        btn.addEventListener('click', function () {
            nav.classList.toggle('open');
        });

        // Закрываем меню при клике по ссылке (на мобильных)
        $$('.nav a').forEach(function (a) {
            a.addEventListener('click', function () {
                nav.classList.remove('open');
            });
        });
    }

    // ----- Модальные окна -----
    function openModal(modal) {
        if (!modal) return;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function initModals() {
        $$('[data-modal]').forEach(function (trigger) {
            trigger.addEventListener('click', function (e) {
                var sel = trigger.getAttribute('data-modal');
                var modal = $(sel);
                if (modal) {
                    e.preventDefault();
                    openModal(modal);
                }
            });
        });

        $$('.modal-close').forEach(function (btn) {
            btn.addEventListener('click', function () {
                closeModal(btn.closest('.modal'));
            });
        });

        $$('.modal').forEach(function (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal(modal);
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                $$('.modal.show').forEach(closeModal);
            }
        });
    }

    // ----- Валидация и отправка форм -----
    function validateField(field) {
        var value = (field.value || '').trim();
        var valid = value.length > 0;

        if (field.type === 'email') {
            valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        field.classList.toggle('error', !valid);
        return valid;
    }

    function initForms() {
        $$('form[data-form]').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                var fields = $$('input, textarea', form);
                var allValid = fields.every(validateField);

                if (!allValid) {
                    showToast('Пожалуйста, заполните все поля корректно.', 'error');
                    return;
                }

                var submitBtn = form.querySelector('button[type="submit"]');
                var originalText = submitBtn ? submitBtn.textContent : '';

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Отправка...';
                }

                setTimeout(function () {
                    showToast('Сообщение успешно отправлено!', 'success');
                    form.reset();
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                    var modal = form.closest('.modal');
                    if (modal) closeModal(modal);
                }, 700);
            });

            $$('input, textarea', form).forEach(function (field) {
                field.addEventListener('input', function () {
                    if (field.classList.contains('error')) validateField(field);
                });
            });
        });
    }

    /* =========================================================
       ИНИЦИАЛИЗАЦИЯ
       ========================================================= */
    document.addEventListener('DOMContentLoaded', function () {
        initVisitorCounter();
        initClock();
        highlightActiveNav();
        initBurger();
        initModals();
        initForms();
    });
})();