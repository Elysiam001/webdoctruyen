document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const welcomeMsg = document.querySelector('.welcome-msg');
    const linkForgotPwd = document.getElementById('link-forgot-pwd');
    const backToLogin = document.getElementById('back-to-login');

    // Tab switching
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        forgotForm.style.display = 'none';
        welcomeMsg.textContent = '// CHÀO MỪNG TRỞ LẠI, QUẢN TRỊ VIÊN';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        forgotForm.style.display = 'none';
        welcomeMsg.textContent = '// KHỞI TẠO DANH TÍNH MỚI';
    });

    // Forgot Password Flow
    linkForgotPwd.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        forgotForm.style.display = 'block';
        welcomeMsg.textContent = '// KHÔI PHỤC QUYỀN TRUY CẬP';
    });

    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        forgotForm.style.display = 'none';
        loginForm.style.display = 'block';
        welcomeMsg.textContent = '// CHÀO MỪNG TRỞ LẠI, QUẢN TRỊ VIÊN';
    });

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            btn.classList.toggle('fa-eye');
            btn.classList.toggle('fa-eye-slash');
        });
    });

    // Custom Alert Logic
    const customAlert = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    const closeAlert = document.getElementById('close-alert');
    let alertCallback = null;

    const showAlert = (message, callback = null) => {
        alertMessage.textContent = message;
        customAlert.style.display = 'flex';
        alertCallback = callback;
    };

    closeAlert.addEventListener('click', () => {
        customAlert.style.display = 'none';
        if (alertCallback) alertCallback();
    });

    // Form submission (Real API)
    const handleFormSubmit = (form, apiPath, successMsg) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.btn-login');
            const originalHTML = btn.innerHTML;
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            btn.innerHTML = 'ĐANG XỬ LÝ...';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            try {
                const response = await fetch(apiPath, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    if (apiPath === '/api/login') {
                        // Save user info to localStorage
                        localStorage.setItem('user', JSON.stringify(result.user));
                        localStorage.setItem('token', result.token);
                    }
                    
                    showAlert(successMsg || result.message, () => {
                        if (apiPath === '/api/login') {
                            window.location.href = 'dashboard.html';
                        } else {
                            // After register or forgot, switch to login
                            loginForm.style.display = 'block';
                            registerForm.style.display = 'none';
                            forgotForm.style.display = 'none';
                            btn.innerHTML = originalHTML;
                            btn.style.opacity = '1';
                            btn.style.pointerEvents = 'all';
                        }
                    });
                } else {
                    showAlert(result.message || 'Có lỗi xảy ra!');
                    btn.innerHTML = originalHTML;
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'all';
                }
            } catch (err) {
                showAlert('Không thể kết nối tới máy chủ!');
                btn.innerHTML = originalHTML;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'all';
            }
        });
    };

    handleFormSubmit(loginForm, '/api/login', 'Kết nối thành công! Đang chuyển hướng tới Talos Hub...');
    handleFormSubmit(registerForm, '/api/register', 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
    handleFormSubmit(forgotForm, '/api/reset-password', 'Yêu cầu đã được gửi. Vui lòng kiểm tra email.');

    // Email code sending (Still simulated for now, or you can add API)
    const setupEmailCode = (btnId, emailId) => {
        const btn = document.getElementById(btnId);
        const email = document.getElementById(emailId);
        if (btn && email) {
            btn.addEventListener('click', () => {
                if (!email.value.includes('@')) {
                    showAlert('Vui lòng nhập địa chỉ Gmail hợp lệ.');
                    return;
                }
                btn.disabled = true;
                btn.style.opacity = '0.5';
                let countdown = 60;
                btn.textContent = `${countdown}S`;
                showAlert(`Mã xác nhận đã được gửi tới: ${email.value}`);
                const timer = setInterval(() => {
                    countdown--;
                    btn.textContent = `${countdown}S`;
                    if (countdown <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.style.opacity = '1';
                        btn.textContent = 'GỬI LẠI';
                    }
                }, 1000);
            });
        }
    };

    setupEmailCode('send-code-btn', 'register-email');
    setupEmailCode('send-forgot-btn', 'forgot-email');

    // Captcha generation
    const captchaDisplay = document.getElementById('captcha-display');
    const generateCaptcha = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let captcha = '';
        for (let i = 0; i < 4; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (captchaDisplay) captchaDisplay.textContent = captcha;
    };

    if (captchaDisplay) {
        captchaDisplay.addEventListener('click', generateCaptcha);
        generateCaptcha(); // Initial generation
    }

    // Dynamic Particles Generation
    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer) {
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 4 + 1;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            p.style.animationDelay = `${Math.random() * 10}s`;
            p.style.animationDuration = `${Math.random() * 10 + 10}s`;
            particlesContainer.appendChild(p);
        }
    }

    // Subtle parallax effect on mouse move (only for desktop)
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth > 992) {
            const x = (window.innerWidth / 2 - e.pageX) / 60;
            const y = (window.innerHeight / 2 - e.pageY) / 60;
            
            const app = document.getElementById('app');
            if (app) app.style.backgroundPosition = `calc(50% + ${x}px) calc(50% + ${y}px)`;
        }
    });
});
