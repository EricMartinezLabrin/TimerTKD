# AGENTS.md

Guia operativa explicita para agentes (humanos o IA) que trabajen en este repositorio.

## 1) Estado actual del proyecto (fuente de verdad)

Este repo **NO** esta en estado de template puro: tiene una pantalla principal personalizada para marcador de taekwondo.

- Nombre app (Expo): `Berserkers-Timer`
- Plataforma objetivo: Android, iOS y Web
- Enfoque de navegacion: `expo-router` con rutas por archivos
- Lenguaje: TypeScript (`strict: true`)
- Gestor de paquetes recomendado: `pnpm` (definido en `packageManager`)

## 2) Stack y versiones actuales

Tomado de `package.json`.

- `expo` `~54.0.33`
- `expo-router` `~6.0.23`
- `react` `19.1.0`
- `react-native` `0.81.5`
- `expo-video` `^3.0.16`
- `react-native-reanimated` `~4.1.1`
- `typescript` `~5.9.2`
- `eslint` `^9.25.0` + `eslint-config-expo` `~10.0.0`

## 3) Configuracion clave de app

Tomado de `app.json`.

- `orientation: "landscape"` (requisito actual de UI)
- `newArchEnabled: true`
- `scheme: "berserkerstimer"`
- Web con `output: "static"`
- Plugins activos:
  - `expo-router`
  - `expo-splash-screen` (con assets configurados)
- Experimentos activos:
  - `typedRoutes: true`
  - `reactCompiler: true`

## 4) Inventario exacto de estructura actual

### Raiz relevante

- `app/`
- `components/`
- `hooks/`
- `constants/`
- `assets/images/`
- `scripts/reset-project.js`
- `README.md` (aun con contenido de plantilla)
- `eslint.config.js`
- `tsconfig.json`
- `app.json`
- `package.json`
- `pnpm-lock.yaml` y `package-lock.json` (coexisten)

### Rutas (`app/`)

- `app/_layout.tsx`
  - Define `ThemeProvider` (dark/light)
  - Stack con:
    - `(tabs)` sin header
    - `modal` como presentacion modal
- `app/(tabs)/_layout.tsx`
  - `Tabs` sin barra visible (`tabBarStyle: { display: 'none' }`)
  - Solo existe tab `index` con titulo `Marcador`
- `app/(tabs)/index.tsx`
  - Pantalla principal real del producto (marcador + timer + overlay de video)
- `app/modal.tsx`
  - Pantalla modal de ejemplo del template (aun presente)

### Componentes (`components/`)

Existen varios componentes base del template Expo, no todos se usan en la pantalla principal actual:

- `external-link.tsx`
- `haptic-tab.tsx`
- `hello-wave.tsx`
- `parallax-scroll-view.tsx`
- `themed-text.tsx`
- `themed-view.tsx`
- `ui/collapsible.tsx`
- `ui/icon-symbol.ios.tsx`
- `ui/icon-symbol.tsx`

### Hooks y constantes

- `hooks/use-color-scheme.ts`
- `hooks/use-color-scheme.web.ts`
- `hooks/use-theme-color.ts`
- `constants/theme.ts`

### Assets multimedia relevantes

- `assets/images/berserkers_1.webm`
- `assets/images/berserkers_2.webm`
- `assets/images/icon.png`
- `assets/images/splash-icon.png`
- assets de icono Android y favicon

## 5) Comportamiento funcional actual (pantalla principal)

Tomado de `app/(tabs)/index.tsx`.

1. Marcador para dos competidores:
   - Azul: puntos y faltas
   - Rojo: puntos y faltas
2. Gestos sobre la zona de score:
   - Tap corto: +1 punto
   - Swipe arriba o derecha: +1 punto
   - Swipe abajo o izquierda: -1 punto (sin bajar de 0)
3. Timer configurable en segundos:
   - Valor por defecto: `60`
   - Al llegar a `0`, se pausa automaticamente
4. Al iniciar timer:
   - Se selecciona un video aleatorio (`berserkers_1.webm` o `berserkers_2.webm`)
   - Se reproduce un overlay animado temporal
5. Modal de ayuda (`Instrucciones`) con guia de gestos

## 6) Comandos de desarrollo (actuales)

Preferir `pnpm`:

- `pnpm install`
- `pnpm start`
- `pnpm android`
- `pnpm ios`
- `pnpm web`
- `pnpm lint`
- `pnpm reset-project` (script destructivo de reseteo de template)

Equivalentes con npm: `npm run <script>`.

## 7) Reglas obligatorias para agentes

1. **No asumir que es template vacio**: la pantalla `app/(tabs)/index.tsx` es funcional y productiva.
2. Hacer cambios minimos y enfocados; evitar refactors amplios no pedidos.
3. Mantener compatibilidad Android/iOS/Web.
4. No introducir dependencias nuevas sin justificar impacto.
5. Mantener TypeScript estricto y alias `@/*`.
6. Ejecutar `pnpm lint` tras cambios relevantes.
7. Si se altera comportamiento de usuario, actualizar `README.md` o documentacion relacionada.

## 8) Restricciones y precauciones importantes

- `scripts/reset-project.js` puede mover/eliminar carpetas (`app`, `components`, `hooks`, `constants`, `scripts`).
  - No ejecutarlo salvo solicitud explicita.
- Existen archivos de plantilla coexistiendo con codigo custom.
  - No borrarlos automaticamente sin validar uso real.
- Hay dos lockfiles (`pnpm-lock.yaml` y `package-lock.json`).
  - Para cambios de dependencias, usar el gestor definido por el usuario/equipo; por defecto, `pnpm`.

## 9) Criterios de calidad para cambios

- Claridad > complejidad.
- Nombres de rutas/componentes consistentes con Expo Router.
- No romper orientacion landscape configurada en `app.json` sin requerimiento.
- Evitar codigo muerto nuevo; si agregas algo temporal, documentarlo.

## 10) Prioridad de instrucciones

Si el usuario da instrucciones especificas (estilo, arquitectura, flujo), **la instruccion del usuario manda** por encima de este archivo.
