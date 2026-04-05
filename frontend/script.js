/**
 * Script Principal para la Landing Page de IA
 * Autores: Antigravity AI
 * 
 * Funcionalidades:
 * - Scroll Reveal usando IntersectionObserver
 * - Lógica de Modales (Apertura, Cierre, Cierre al hacer click en el overlay)
 * - Navegación suave
 */

document.addEventListener("DOMContentLoaded", () => {

    // ----------------------------------------------------
    // 1. SCROLL REVEAL (Animaciones al hacer Scroll)
    // ----------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');

    // Configuramos el observador
    const revealOptions = {
        threshold: 0.15, // Porcentaje de visibilidad para disparar la animación
        rootMargin: "0px 0px -50px 0px" // Dispara un poco antes de que sea totalmente visible
    };

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                // Opcional: Dejar de observar una vez que ya apareció para mejor rendimiento
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // ----------------------------------------------------
    // 2. SMOOTH SCROLL (Desplazamiento Suave en Links Ancla)
    // ----------------------------------------------------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // ----------------------------------------------------
    // 3. LISTENERS PARA CERRAR MODALES CON TECLA ESCAPE
    // ----------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('[id$="-modal"]:not(.hidden)');
            openModals.forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
});

// ----------------------------------------------------
// 4. FUNCIONES GLOBALES PARA MODALES
// ----------------------------------------------------

/**
 * Abre un modal por su ID aplicando la animación de entrada
 * @param {string} modalId - El atributo id del elemento modal (ej 'checkout-modal')
 */
window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Obtenemos el contenedor interno para animar su escala
    const modalContentId = modalId.replace('-modal', '-content');
    const content = document.getElementById(modalContentId);

    // Bloquear el scroll del body
    document.body.style.overflow = 'hidden';

    // Quitar la clase hidden para que aparezca en el DOM (display: block/flex)
    modal.classList.remove('hidden');

    // Pequeño timeout para permitir que el navegador compute el removal de 'hidden' antes de cambiar la opacidad
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }, 10);
};

/**
 * Cierra un modal por su ID aplicando la animación de salida
 * @param {string} modalId - El atributo id del elemento modal
 */
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const modalContentId = modalId.replace('-modal', '-content');
    const content = document.getElementById(modalContentId);

    // Restaurar scroll
    document.body.style.overflow = '';

    // Volver transparente
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }

// Esperar a que la transición termine (300ms según la clase Tailwind) para ocultarlo del DOM
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// ----------------------------------------------------
// 5. FETCH PAGOS (MERCADOPAGO Y PAYPAL)
// ----------------------------------------------------
window.procesarPago = async function(metodo) {
    try {
        // En desarrollo local será http://localhost:3000, cambia en deploy de Render
        const backendURL = '/api/pagos/crear-pago'; // Usando ruta relativa, asume que sirven del mismo dominio

        const response = await fetch(backendURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metodo })
        });

        if (!response.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url; // Redirigir al usuario al Checkout
        } else {
            alert("Hubo un problema procesando el pago. Intenta nuevamente.");
        }
    } catch (error) {
        console.error("Error al procesar pago:", error);
        alert("Servicio no disponible temporalmente. Intenta nuevamente más tarde.");
    }
};

// ----------------------------------------------------
// 6. CONTADOR DE TIEMPO LIMITADO POR IP (12 HORAS)
// ----------------------------------------------------
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (err) {
        return 'ip-desconocida'; // fallback si falla
    }
}

async function iniciarContadorIP() {
    const ip = await getIP();
    const timerKey = `timer_ia_${ip}`;
    
    let deadline = localStorage.getItem(timerKey);
    const doceHorasEnMs = 12 * 60 * 60 * 1000;

    if (!deadline) {
        // Si no existe, es la primera vez que entra: Guardar deadline
        deadline = new Date().getTime() + doceHorasEnMs;
        localStorage.setItem(timerKey, deadline);
    } else {
        deadline = parseInt(deadline, 10);
    }

    const timerElement = document.getElementById('contador-oferta');
    if (!timerElement) return;

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = deadline - now;

        if (distance < 0) {
            clearInterval(interval);
            timerElement.innerHTML = "¡LA OFERTA HA EXPIRADO!";
            return;
        }

        // Cálculos de tiempo
        const horas = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distance % (1000 * 60)) / 1000);

        // Formatear
        timerElement.innerHTML = `
            <div class="flex gap-2 items-center justify-center font-bold text-white font-heading">
                <span class="bg-gray-800 p-2 rounded-lg min-w-[3rem]">${horas.toString().padStart(2, '0')}</span> :
                <span class="bg-gray-800 p-2 rounded-lg min-w-[3rem]">${minutos.toString().padStart(2, '0')}</span> :
                <span class="bg-gray-800 p-2 rounded-lg min-w-[3rem]">${segundos.toString().padStart(2, '0')}</span>
            </div>
        `;
    }, 1000);
}

// Iniciar al cargar (después de DOMContentLoaded para prevenir fallos asíncronos rápidos si se desea)
document.addEventListener("DOMContentLoaded", () => {
    iniciarContadorIP();
});



