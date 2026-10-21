# X-Hub Hackathon 2026 — PHP Backend API

This directory contains the migrated **PHP Backend REST API** for the X-Hub Hackathon 2026 platform. It completely replaces the previous Node.js backend route handlers.

---

## 🚀 Architecture Highlights

- **Zero Heavy Dependencies**: Pure PHP 8.1+ with native extensions (`pdo_mysql`, `openssl`, `mbstring`, `curl`).
- **Database Support**: Built-in PDO connection configured for **TiDB Serverless Cloud (MySQL protocol)** with automatic SSL encryption, and easily switchable to **PostgreSQL** via `DB_DRIVER=pgsql`.
- **Stateless Authentication**: Pure PHP HS256 HMAC-SHA256 JWT tokens, 100% interoperable with the Next.js frontend session and cookies (`xhub_token`).
- **Secure Password Hashing**: Uses PHP's native `password_hash()` and `password_verify()` with bcrypt (compatible with `bcryptjs`).
- **Email Automation**: Socket-level SMTP mailer supporting Gmail SMTP and Vel Tech Google Workspace credentials without external libraries.
- **Unified Proxy**: Next.js proxies all `/api/*` requests directly to this PHP backend (`PHP_BACKEND_URL`).

---

## 📁 Directory Structure

```text
backend-php/
├── config/
│   ├── env.php           # Reads .env.local / .env / system environment
│   ├── db.php            # PDO database connection & query helpers
│   ├── jwt.php           # HS256 JWT token generation & verification
│   ├── auth.php          # Role guards (Student, Faculty, Admin)
│   ├── mail.php          # SMTP mail engine & email templates
│   └── response.php      # CORS headers & JSON response utilities
├── routes/
│   ├── auth.php          # Login, Register, Me, Logout
│   ├── departments.php   # List active academic departments
│   ├── problems.php      # Problem catalog, search/filter, detail, candidate directory
│   ├── registrations.php # Student problem registration & withdrawal
│   ├── teams.php         # Student squads & member rosters
│   ├── invitations.php   # Peer invitations (pings), accept, reject, cancel
│   ├── notifications.php # In-app notifications & read status
│   ├── faculty.php       # Faculty dashboard & candidate tracking
│   └── admin.php         # Admin metrics, problem config, team status, mentor assignments
├── public/
│   └── index.php         # Master front-controller & route dispatcher
├── router.php            # Development router for PHP built-in server
├── start.bat             # Windows 1-click launcher
├── start.ps1             # PowerShell launcher
├── .env.example          # Environment variables template
└── README.md             # Documentation
```

---

## 🏃 Running Locally

### Option 1: Using the Startup Scripts
Double-click `start.bat` or run:
```powershell
.\backend-php\start.ps1
```

### Option 2: Using the Command Line
```bash
php -S 127.0.0.1:8000 -t backend-php/public backend-php/router.php
```

The API will be available at `http://127.0.0.1:8000`.

### Health Check
```bash
curl http://127.0.0.1:8000/api/health
```

---

## ⚙️ Connecting to the Next.js Frontend

In your root `.env.local` or environment configuration:
```env
PHP_BACKEND_URL=http://127.0.0.1:8000
```

`next.config.ts` automatically proxies all frontend calls from `/api/*` to the PHP backend.

---

## 🌐 Production Deployment

### 1. Apache / cPanel
- Point your DocumentRoot to `backend-php/public/`.
- Ensure `mod_rewrite` is enabled.
- Add this `.htaccess` file in `backend-php/public/`:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [QSA,L]
</IfModule>
```

### 2. Nginx
Add to your Nginx server block:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /path/to/backend-php/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

### 3. Docker (PHP + Nginx or Apache)
```dockerfile
FROM php:8.3-cli-alpine
RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /app
COPY backend-php/ /app
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "router.php"]
```

---

## 📋 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & timestamp |
| `POST` | `/api/auth/login` | Student, Faculty, or Admin login |
| `POST` | `/api/auth/register` | Register new student or faculty account |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/logout` | Clears authentication session cookie |
| `GET` | `/api/departments` | List all academic departments |
| `GET` | `/api/problems` | List problem statements with pagination & filters |
| `GET` | `/api/problems/:id` | Get single problem statement details |
| `GET` | `/api/problems/:id/students` | Get registered students & peer candidate directory |
| `GET` | `/api/registrations` | Get current student's problem registrations |
| `POST` | `/api/registrations` | Register interest for a problem statement |
| `DELETE`| `/api/registrations/:id` | Withdraw registration |
| `GET` | `/api/teams` | Get current student's teams & member rosters |
| `GET` | `/api/invitations` | Get sent & received team invitations |
| `POST` | `/api/invitations` | Send team invitation (ping) to prospective peer |
| `PATCH`| `/api/invitations/:id` | Accept or reject team invitation |
| `DELETE`| `/api/invitations/:id` | Cancel sent team invitation |
| `GET` | `/api/notifications` | Get in-app notification alerts |
| `PATCH`| `/api/notifications` | Mark notifications as read |
| `GET` | `/api/faculty/overview` | Faculty mentor dashboard overview |
| `GET` | `/api/admin/overview` | Admin dashboard statistics & detailed registrations |
| `GET` | `/api/admin/problems` | Admin problem statement listing |
| `PATCH`| `/api/admin/problems` | Admin update problem statement limits & status |
| `GET` | `/api/admin/teams` | Admin view all formed teams |
| `PATCH`| `/api/admin/teams` | Admin update team status (lock/unlock) |
| `GET` | `/api/admin/faculty` | Admin list faculty mentors |
| `POST` | `/api/admin/faculty` | Admin create new faculty member |
| `POST` | `/api/admin/faculty/assign` | Bulk assign faculty mentors to problem statements |
| `DELETE`| `/api/admin/faculty/assign`| Unassign faculty mentor |
| `GET` | `/api/admin/import` | Check import subsystem status |
