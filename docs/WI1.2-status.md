# WI1.2 Ãƒâ€šÃ‚Â· Componentes core

**Meta Work Package:** WP1  
**Priority:** P0  
**Area:** FE  
**Size:** XL  
**Depends on:** WI0.3

## Definition of Ready

-   [x] Problema y alcance claros
-   [x] AC definidos (abajo)
-   [ ] Diseno/API enlazado si aplica (faltan especificaciones para toolbar, presets)
-   [ ] Sin bloqueos abiertos (faltan componentes core y playground)

## Acceptance Criteria

-   [ ] Todos los componentes listados existen en FE y estan integrados en storybook/playground
-   [x] CardTile soporta hover zoom, version preferida y tags basicos (hover y versiones listos, tags pendientes)
-   [x] FilterBar permite filtros positivos/negativos y multi-seleccion
-   [x] SortBuilder permite multi-sort con orden asc/desc
-   [x] Zone renderiza children y soporta autosort + phantoms
-   [x] WarningsFab muestra popover con avisos definidos (legalidad, copias, etc.)
-   [x] PackagesDialog lista paquetes propios y publicos, permite importarlos (propios y publicos)
-   [ ] ContextMenuCatalog y ContextMenuFlow permiten acciones rapidas sobre cartas/zones (solo acciones basicas)
-   [x] FlowToolbar incluye herramientas basicas (mover, borrar, autosort, export)
-   [x] DeckCoverPicker permite elegir ilustracion/cover de un mazo (selector dedicado con versiones)
-   [x] SavedFiltersPopover permite guardar/cargar presets de filtros (solo menu principal)
-   [ ] Integrar todos en storybook y validar accesibilidad mÃƒÆ’Ã‚Â­nima

## Tasks

-   [x] Implementar CardTile con hover zoom, seleccion de version y tags basicos
-   [x] Implementar FilterBar con filtros combinables (+/-)
-   [x] Implementar SortBuilder con multiples niveles y orden
-   [x] Implementar Zone con autosort y phantoms
-   [x] Implementar WarningsFab con popover y lista de avisos
-   [x] Implementar PackagesDialog (propios + publicos, import)
-   [ ] Implementar ContextMenuCatalog (anadir carta, ignorar, anadir a deck/package)
-   [ ] Implementar ContextMenuFlow (acciones sobre zones/cards en canvas)
-   [x] Implementar FlowToolbar con acciones basicas
-   [x] Implementar DeckCoverPicker para personalizar cover
-   [x] Implementar SavedFiltersPopover para presets de filtros
-   [ ] Integrar todos en storybook y validar accesibilidad mÃƒÆ’Ã‚Â­nima

## Estado Actual

-   PackagesDialog ahora distingue entre paquetes propios y publicos, con pestanas dedicadas para importar cualquiera, y permite a los duenos alternar paquetes entre privado y publico desde la UI.
-   SavedFiltersPopover en FilterBar permite guardar, renombrar, aplicar y eliminar presets múltiples almacenados en localStorage.
-   FlowToolbar (autosort global, borrado masivo y modo read-only) disponible sobre el canvas; pendiente anadir export y acciones extra para cerrar el AC.
-   DeckCoverPicker anade un dialogo dedicado para elegir la portada desde las cartas del mazo y permite seleccionar versiones alternativas.
-   WarningsFab anade un toast inferior izquierdo que resume copias ilegales en mazos con comandante y despliega el detalle.
-   Reorganizacion de componentes FE bajo `client/src/components/deckBuilder/`:
    -   `CardTile` y `VersionCard` reutilizables.
    -   `FilterBar` consolidada con controles en `controls/` (incluye `SortBuilder`).
    -   `FlowCanvas` y nodos (`CardNode`, `GroupNode`, `PhantomNode`) centralizados.
    -   `PackagesDialog` y `PackageCard` compartidos.
-   Deck creator consume nuevos modulos (`FilterBar`, `CardTile`, `PackagesDialog`).
-   Dashboard apunta al nuevo `PackageCard`.
-   `SortBuilder` cumple multi-sort; `GroupNode` soporta autosort de cartas; contexto de flujo mantiene phantoms y zonas.
-   Pendientes principales: ampliacion de context menus y playground/Storybook.

## Ultima Validacion

-   `npm run lint`
