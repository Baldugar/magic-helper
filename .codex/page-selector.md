# Task: Add Page Size Selector to Catalog

## Goal

Introduce a UI control above the cards grid that lets the user select how many cards per page to display. This value must be sent to the server (`pageSize` param) and persisted in localStorage together with existing filters, so it is recoverable after reload.

## Requirements

1. **UI Placement**

    - Add a selector above the cards grid, aligned with the existing catalog toolbar.
    - Options should be: 25, 50, 100.
    - Default value: 50 (current behavior).

2. **State & Persistence**

    - Store the `pageSize` in component state.
    - Persist `pageSize` in the same localStorage structure where filters are saved.
    - On load, read `pageSize` from localStorage (if present) and apply it.

3. **Query Integration**

    - Update the fetch logic to send `pageSize` as part of the query parameters.
    - Ensure it updates together with filters, sort, and pagination.

4. **Pagination Behavior**

    - When `pageSize` changes, reset pagination to the first page.
    - Pagination component should automatically reflect the new total pages from the server response.

5. **Validation**
    - Verify that:
        - The selected `pageSize` is reflected in the number of cards shown.
        - The value persists across reloads and sessions (via localStorage).
        - Changing `pageSize` recalculates pagination and resets to page 1.
