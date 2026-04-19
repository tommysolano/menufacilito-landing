document.addEventListener('DOMContentLoaded', () => {

    // --- Reveal on Scroll ---
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        revealElements.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            if (elementTop < windowHeight - 120) {
                el.classList.add('active');
            }
        });
    };
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // --- Mobile menu toggle ---
    const toggle = document.querySelector('.mobile-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (toggle && mobileNav) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
    }

    // --- Marquee: clone track for seamless looping ---
    const track = document.querySelector('.marquee-track');
    if (track) {
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.parentNode.appendChild(clone);
    }

    // --- Autoservicio Slider ---
    const slides = [
        {
            title: 'PASO 1',
            desc: 'El cliente escanea el codigo QR de la mesa y accede al menu completo desde su celular. Sin esperas, sin necesidad de mesero.',
            img: 'img/mockups/cliente1.png',
            alt: 'Paso 1 - Escanear QR'
        },
        {
            title: 'PASO 2',
            desc: 'Explora el menu, selecciona sus platos favoritos y ajusta las cantidades. Todo desde la comodidad de su celular.',
            img: 'img/mockups/cliente2.png',
            alt: 'Paso 2 - Explorar y seleccionar'
        },
        {
            title: 'PASO 3',
            desc: 'Revisa su pedido, agrega notas especiales y lo envia directamente a la cocina. Sin errores y sin intermediarios.',
            img: 'img/mockups/cliente3.png',
            alt: 'Paso 3 - Confirmar pedido'
        },
        {
            title: 'PASO 4',
            desc: 'El pedido es recibido al instante. El cliente recibe una confirmacion con el tiempo estimado de preparacion.',
            img: 'img/mockups/cliente4.png',
            alt: 'Paso 4 - Pedido recibido'
        }
    ];

    let currentSlide = 0;
    const titleEl = document.getElementById('autoservicio-title');
    const descEl = document.getElementById('autoservicio-desc');
    const imgEl = document.getElementById('autoservicio-img');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');

    function goToSlide(index) {
        currentSlide = index;
        if (titleEl) titleEl.textContent = slides[index].title;
        if (descEl) descEl.textContent = slides[index].desc;
        if (imgEl) {
            imgEl.style.opacity = '0';
            setTimeout(() => {
                imgEl.src = slides[index].img;
                imgEl.alt = slides[index].alt;
                imgEl.style.opacity = '1';
            }, 200);
        }
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);
        });
    }
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            goToSlide(parseInt(dot.dataset.index));
        });
    });
});
