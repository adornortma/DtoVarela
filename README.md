# KPI Varela - Dashboard Operativo

Este es el dashboard moderno para visualización de KPIs operativos de técnicos de campo en el distrito Varela.

## Estructura del Proyecto

*   `src/app/page.tsx`: Dashboard de nivel Distrito (Home).
*   `src/lib/logic.ts`: Lógica de semaforización, alertas y clasificación de técnicos.
*   `src/components/Sidebar.tsx`: Navegación principal.
*   `supabase_schema.sql`: Esquema de base de datos para Supabase.

## Próximos Pasos

1.  **Configuración de Supabase**:
    *   Crea un proyecto en Supabase.
    *   Ejecuta el script SQL en `supabase_schema.sql`.
    *   Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a un archivo `.env.local`.

2.  **Ingesta de Datos**:
    *   Crea una función (Edge Function o script local) para importar los Excel semanales a la tabla `weekly_stats`.

3.  **Despliegue**:
    *   Conecta el repositorio a Vercel para despliegue automático.

## Lógica de Negocio (Semaforización)

*   **Crítico**: Técnicos con Reiteros > 15% o 2+ KPIs en Rojo.
*   **En Riesgo**: Técnicos con 1 KPI en Rojo o 2+ en Amarillo.
*   **OK**: Técnicos cumpliendo objetivos.

### Clasificaciones Automatizadas
*   "Rápido pero con fallas": Productividad alta (>8) pero con Reiteros altos (>15%).
*   "Lento pero prolijo": Productividad baja (<6) pero con Reiteros muy bajos (<10%).
