const AUTH_KEYS = {
  USERS: 'pich_registered_users_v2',
  CURRENT_USER: 'pich_current_active_user_v2'
};

const DEFAULT_ADMIN_USER = {
  id: 'usr-default',
  name: 'admin',
  email: 'Admin@gmail.com',
  password: '123',
  budget: 150000,
  currency: 'COP',
  avatar: '👨‍💻',
  role: 'Cliente Principal',
  createdAt: new Date().toISOString()
};

class AuthManager {
  static getUsers() {
    try {
      const raw = localStorage.getItem(AUTH_KEYS.USERS);
      if (!raw) {
        const initial = [DEFAULT_ADMIN_USER];
        localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      return [DEFAULT_ADMIN_USER];
    }
  }

  static getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
      if (!raw) {
        localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_ADMIN_USER));
        return DEFAULT_ADMIN_USER;
      }
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_ADMIN_USER;
    }
  }

  static register(name, email, password, budget = 150000, avatar = '👤') {
    if (!name || !email || !password) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'El correo ya está registrado en el sistema.' };
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      budget: Number(budget) || 150000,
      currency: 'COP',
      avatar,
      role: 'Cliente',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);

    return { success: true, user: newUser };
  }

  static login(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Ingresa tu correo y contraseña.' };
    }

    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password.trim());

    if (!user) {
      return { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    this.setCurrentUser(user);
    return { success: true, user };
  }

  static setCurrentUser(user) {
    localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
    if (user.budget) {
      StorageManager.saveSettings({ budget: user.budget, currency: user.currency || 'COP' });
    }
  }

  static logout() {
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
  }

  static updateProfile(updatedData) {
    const current = this.getCurrentUser();
    if (!current) return null;

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === current.id);

    const merged = { ...current, ...updatedData };
    if (index >= 0) {
      users[index] = merged;
      localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
    }

    this.setCurrentUser(merged);
    return merged;
  }
}
