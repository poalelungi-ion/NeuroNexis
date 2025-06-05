document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleSignInBtn = document.getElementById('google-signin-btn');
    const facebookSignInBtn = document.getElementById('facebook-signin-btn');
    const instagramSignInBtn = document.getElementById('instagram-signin-btn');
    // Translation data
    const translations = {
        'en-US': {
            'login.title': 'Login to NEURONEXIS',
            'login.email': 'Email',
            'login.password': 'Password',
            'login.submit': 'Login',
            'login.google_signin': 'Sign in with Google',
            'login.facebook_signin': 'Sign in with Facebook',
            'login.instagram_signin': 'Sign in with Instagram',
            'login.back': 'Back to Dashboard'
        },
        'ro-RO': {
            'login.title': 'Conectare la NEURONEXIS',
            'login.email': 'Email',
            'login.password': 'Parolă',
            'login.submit': 'Conectare',
            'login.google_signin': 'Conectează-te cu Google',
            'login.facebook_login_success': 'Conectare cu Facebook reușită!',
            'login.instagram_login_success': 'Conectare cu Instagram reușită!',
            'login.back': 'Înapoi la Panoul de Control'
        },
        'ru-RU': {
            'login.title': 'Вход в NEURONEXIS',
            'login.email': 'Электронная почта',
            'login.password': 'Пароль',
            'login.submit': 'Войти',
            'login.google_signin': 'Войти через Google',
            'login.facebook_login_success': 'Вход через Facebook успешен!',
            'login.instagram_login_success': 'Вход через Instagram успешен!',
            'login.back': 'Назад к панели управления'
        },
        'es-ES': {
            'login.title': 'Iniciar sesión en NEURONEXIS',
            'login.email': 'Correo electrónico',
            'login.password': 'Contraseña',
            'login.submit': 'Iniciar sesión',
            'login.google_signin': 'Iniciar sesión con Google',
            'login.facebook_login_success': '¡Inicio de sesión con Facebook exitoso!',
            'login.instagram_login_success': '¡Inicio de sesión con Instagram exitoso!',
            'login.back': 'Volver al Panel de Control'
        },
        'fr-FR': {
            'login.title': 'Connexion à NEURONEXIS',
            'login.email': 'Email',
            'login.password': 'Mot de passe',
            'login.submit': 'Se connecter',
            'login.google_signin': 'Se connecter avec Google',
            'login.facebook_login_success': 'Connexion avec Facebook réussie !',
            'login.instagram_login_success': 'Connexion avec Instagram réussie !',
            'login.back': 'Retour au tableau de bord'
        }
    };

    // Language selection
    const langSelect = document.getElementById('lang-select');
    let currentLang = localStorage.getItem('language') || 'en-US';
    langSelect.value = currentLang;

    function updateTranslations() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = translations[currentLang][key] || element.textContent;
        });
    }

    langSelect.addEventListener('change', () => {
        currentLang = langSelect.value;
        localStorage.setItem('language', currentLang);
        updateTranslations();
    });

    updateTranslations();

    // Initialize Google API
    window.initGoogleAPI = function() {
        gapi.load('auth2', () => {
            gapi.auth2.init({
                client_id: '906465572275-hanrq89dvi0a8bpf2benqdq7quu3njtc.apps.googleusercontent.com',
                scope: 'profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send'
            }).then(() => {
                const googleAuthInstance = gapi.auth2.getAuthInstance();
                googleSignInBtn.addEventListener('click', () => {
                    googleAuthInstance.signIn().then(googleUser => {
                        const profile = googleUser.getBasicProfile();
                        localStorage.setItem('currentUser', profile.getEmail());
                        localStorage.setItem('userData', JSON.stringify({
                            [profile.getEmail()]: {
                                name: profile.getName(),
                                email: profile.getEmail(),
                                profileImage: profile.getImageUrl(),
                                googleToken: googleUser.getAuthResponse().id_token
                            }
                        }));
                        window.location.href = 'index.html';
                    }).catch(error => {
                        console.error('Google Sign-In error:', error);
                        alert('Failed to sign in with Google. Please try again.');
                    });
                });
            }).catch(error => {
                console.error('Google API initialization error:', error);
                alert('Failed to initialize Google API. Please try again later.');
            });
        });
    };

    // Mock Facebook and Instagram login (since actual APIs require server-side implementation)
    facebookSignInBtn.addEventListener('click', () => {
        const mockUser = {
            name: 'Facebook User',
            email: 'facebook@example.com',
            profileImage: 'assets/img/profile-img.jpg'
        };
        localStorage.setItem('currentUser', mockUser.email);
        localStorage.setItem('userData', JSON.stringify({
            [mockUser.email]: mockUser
        }));
        alert(translations[currentLang]['login.facebook_login_success']);
        window.location.href = 'index.html';
    });

    instagramSignInBtn.addEventListener('click', () => {
        const mockUser = {
            name: 'Instagram User',
            email: 'instagram@example.com',
            profileImage: 'assets/img/profile-img.jpg'
        };
        localStorage.setItem('currentUser', mockUser.email);
        localStorage.setItem('userData', JSON.stringify({
            [mockUser.email]: mockUser
        }));
        alert(translations[currentLang]['login.instagram_login_success']);
        window.location.href = 'index.html';
    });

    // Local login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const hashedPassword = md5(password);
        const users = JSON.parse(localStorage.getItem('users')) || {};

        if (users[email] && users[email].password === hashedPassword) {
            localStorage.setItem('currentUser', email);
            window.location.href = 'index.html';
        } else {
            alert('Invalid email or password.');
        }
    });
});