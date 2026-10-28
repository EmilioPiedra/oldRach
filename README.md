# Tienda de ropa — Paso 1: «Hola mundo» + login

## Requisitos
- Node.js 20 o superior (https://nodejs.org)

## Ejecutar
```bash
npm install
cp .env.example .env.local   # y completa los valores de Supabase
npm run dev
```

- Parte pública: http://localhost:5173/
- Login: http://localhost:5173/admin/login
- Panel (protegido): http://localhost:5173/admin

## Supabase
1. Crea un proyecto en https://supabase.com
2. Project Settings > API: copia la URL y la clave pública (anon / publishable) en `.env.local`
3. Authentication > Users > Add user: crea el administrador con correo y contraseña
   (marca «Auto Confirm User»)
4. Authentication > Sign In / Providers: desactiva «Allow new users to sign up»

## Cloudflare Pages (cuando quieras publicar)
- Build command: `npm run build`
- Build output directory: `dist`
- Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
