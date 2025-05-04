/**
 * Authentication logic for NEURONEXIS
 * Handles user registration, login, logout, and profile management using localStorage
 * Passwords are stored in plain text (not secure for production)
 */

let users = JSON.parse(localStorage.getItem('users')) || {};
let userData = JSON.parse(localStorage.getItem('userData')) || {};
let currentUser = localStorage.getItem('currentUser') || null;

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveUserData() {
    localStorage.setItem('userData', JSON.stringify(userData));
}

function register(username, email, password, name) {
    if (users[username]) {
        return { success: false, message: 'Username already exists.' };
    }

    users[username] = { email, password, name };
    userData[username] = { tasks: [], reminders: [], chats: [], profileImage: null };
    saveUsers();
    saveUserData();
    return { success: true, message: 'Registration successful! Please log in.' };
}

function login(username, password) {
    const user = users[username];
    if (!user) {
        return { success: false, message: 'Username does not exist.' };
    }

    if (user.password !== password) {
        return { success: false, message: 'Incorrect password.' };
    }

    currentUser = username;
    localStorage.setItem('currentUser', currentUser);
    return { success: true, message: 'Login successful!' };
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'pages-login.html';
}

function updateProfile(username, { name, email, profileImage }) {
    if (!users[username]) {
        return false;
    }

    if (name) users[username].name = name;
    if (email) users[username].email = email;
    if (profileImage) userData[username].profileImage = profileImage;

    saveUsers();
    saveUserData();
    return true;
}

function changePassword(username, currentPassword, newPassword) {
    const user = users[username];
    if (!user) {
        return false;
    }

    if (user.password !== currentPassword) {
        return false;
    }

    user.password = newPassword;
    saveUsers();
    return true;
}