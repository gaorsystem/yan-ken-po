# Yan Ken Po Perú 🇵🇪 - Duelo en Tiempo Real

Juego interactivo de **Piedra, Papel o Tijera (Yan Ken Po)** multijugador en tiempo real optimizado para celulares y computadoras con integración a **Supabase Realtime**.

---

## 🚀 Despliegue en Vercel (100% Compatible)

Este proyecto está listo para ser publicado directamente en **Vercel**:

### 1. Subir a GitHub
1. Clona o sube este repositorio a tu cuenta de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Yan Ken Po con Supabase"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

### 2. Importar en Vercel
1. Ve a [Vercel](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"** y selecciona tu repositorio.
3. En la sección **Environment Variables**, añade:
   - `VITE_SUPABASE_URL`: `https://whmksjxsmkeeiswsrxgp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_i3sqCXHirNVMPm9AvfNPJg_EBZIcCwO`
4. Haz clic en **Deploy**. ¡En menos de 1 minuto tu juego estará en vivo!

---

## 🗄️ Esquema SQL Opcional para Supabase (Historial y Estadísticas)

Si deseas guardar el historial de partidas en tu base de datos de PostgreSQL en Supabase, copia y ejecuta este script en el **SQL Editor** de tu panel de Supabase:

```sql
-- Tabla para registrar partidas completadas
CREATE TABLE IF NOT EXISTS yankenpo_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  player_1_name VARCHAR(50) NOT NULL,
  player_1_score INT DEFAULT 0,
  player_2_name VARCHAR(50) NOT NULL,
  player_2_score INT DEFAULT 0,
  winner_name VARCHAR(50),
  rounds_played INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar seguridad por fila (RLS)
ALTER TABLE yankenpo_matches ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y creación anónima
CREATE POLICY "Permitir inserción de partidas" 
ON yankenpo_matches FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir lectura de historial" 
ON yankenpo_matches FOR SELECT 
USING (true);
```

---

## 🎮 Características
- ⚡ **Tiempo Real**: Sincronización instantánea de jugadas y cuenta regresiva.
- 📱 **Modo Pantalla Completa**: Botón dedicado para una experiencia táctil inmersiva.
- 🔊 **Efectos de Audio y Voces**: Efectos sonoros y cántico *"¡Yan! - ¡Ken! - ¡Po!"*.
- 💬 **Reacciones Flotantes**: Emojis y frases rápidas en vivo.
- 🤖 **Modo Práctica**: Entrena en solitario contra *IncaBot*.
