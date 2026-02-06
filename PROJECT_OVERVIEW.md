# Magic Helper - Project Overview

## What is Magic Helper?

Magic Helper is a visual deck building application designed for Magic: The Gathering (MTG) players. It recreates the authentic experience of building decks on a physical table, allowing you to create zones (card piles), move them around, and visually organize your deck just like you would with physical cards. It's a web application that transforms digital deck building into an intuitive, spatial experience.

## Who is it for?

-   **Deck Builders** - Players who love the physical process of sorting cards and want that experience digitally
-   **Visual Learners** - Players who think better when they can see and spatially organize their cards
-   **Tournament Players** - Competitive players who need to test different deck configurations and zone layouts
-   **Casual Players** - Anyone who enjoys the tactile feel of deck building and wants intuitive digital tools
-   **Content Creators** - Streamers, YouTubers, or writers who want to visually demonstrate deck building concepts

## Key Features

### 🃏 **Comprehensive Card Database**

-   Access to the complete Magic: The Gathering card database
-   Multiple versions of each card (different sets, artwork, languages)
-   Advanced search capabilities to find exactly the cards you need
-   Filter by mana cost, colors, card types, sets, rarity, and more

### 🏗️ **Visual Table-Like Deck Builder**

-   **Create Zones (Piles)** - Make different areas for lands, creatures, spells, sideboard, etc.
-   **Move Zones Around** - Drag and position your card piles exactly where you want them
-   **Stack Zones** - Layer zones on top of each other for complex organization
-   **Visual Card Copies** - Create multiple visual representations of the same card across different zones
-   **Physical Deck Building Feel** - Experience that mimics building decks on an actual table

### 📦 **Thematic Card Packages**

-   **Pre-Built Themes** - Create packages like "Flying Creatures," "Human Tribal," or "Green Good Stuff"
-   **Strategic Collections** - Build packages for specific strategies like "Library Interaction Planeswalkers"
-   **Easy Import** - Quickly add entire card packages to your deck-building workspace
-   **Endless Possibilities** - Create any thematic collection you can imagine for reuse across decks

### 🏷️ **Smart Tagging System**

-   Create custom tags for cards and decks
-   Tag cards by strategy, power level, or deck archetype
-   Organize your deck building process with personal categories
-   Quick filtering using your tag system while building

### ⭐ **Rating & Review System**

-   Rate cards based on your personal experience
-   Track which cards perform well in your meta
-   Personal notes and ratings to remember card interactions
-   Build a personal database of card performance

### 🎯 **Advanced Filtering**

-   Complex search queries across multiple card attributes
-   Format legality checking (Standard, Modern, Commander, etc.)
-   Mana cost and color identity filtering
-   Card type and keyword filtering

### 📱 **Modern Web Experience**

-   Responsive design that works on desktop, tablet, and mobile
-   Fast, real-time search and filtering
-   Clean, intuitive user interface
-   No downloads required - works in any modern web browser

## How Does It Work?

### For New Users:

1. **Browse the Card Database** - Explore thousands of MTG cards with detailed information
2. **Create Your First Zones** - Make areas for different card types (lands, creatures, etc.)
3. **Add Cards to Zones** - Drag cards from the database into your zones
4. **Arrange Your Table** - Move zones around to create your ideal deck building layout

### For Experienced Players:

1. **Import Card Packages** - Bring in pre-built thematic collections to jumpstart your build
2. **Advanced Zone Management** - Create complex zone hierarchies and stacking arrangements
3. **Multiple Deck Configurations** - Save different zone layouts for different deck types
4. **Visual Deck Testing** - Use multiple card copies across zones to test different configurations

## Use Cases

### **Visual Deck Building**

-   Create and arrange zones that match your mental model
-   Test different card arrangements spatially before finalizing
-   Use visual card copies to see cards in multiple contexts
-   Experience the satisfaction of "table-top" deck building digitally

### **Tournament Preparation**

-   Build sideboards in separate zones and practice transitions
-   Create different zone layouts for different matchups
-   Visually organize your deck to understand card relationships
-   Save multiple deck configurations with different zone arrangements

### **Deck Brewing & Innovation**

-   Import thematic card packages to explore new strategies
-   Create zones for different card categories and move them around
-   Visually experiment with different deck structures
-   Build "maybe boards" and testing zones alongside your main deck

### **Learning & Improvement**

-   Visually understand card relationships by organizing them spatially
-   Create teaching zones to demonstrate deck concepts to others
-   Use card packages to learn about different strategies and themes
-   Build and rate different deck configurations to find what works

## Technical Foundation

While designed for ease of use, Magic Helper is built on robust technology:

-   **ReactFlow Engine** - Smooth, responsive visual interface for zone management and card placement
-   **Real-time Performance** - Instant search and filtering across large datasets
-   **Spatial Organization** - Advanced positioning system that remembers your exact zone layouts
-   **Data Accuracy** - Up-to-date card information from official sources
-   **Cross-Platform** - Works seamlessly across all devices and browsers

## Getting Started

Magic Helper is designed to be intuitive from day one:

1. **No Setup Required** - Start building zones immediately through your web browser
2. **Intuitive Interface** - Drag, drop, and arrange just like you would on a physical table
3. **Card Package Library** - Start with pre-built thematic collections or create your own
4. **Your Way** - Build however feels natural - there's no "wrong" way to organize your zones

## Project Status

Magic Helper is an active project designed to grow with the MTG community's needs. The platform focuses on providing an intuitive, visual deck building experience that captures the feel of building decks on a physical table while maintaining simplicity and performance.

## Community Focus

The application is built with the MTG community in mind:

-   **Player-Centric Design** - Recreates the physical deck building experience that players love
-   **Format Support** - Zone layouts work with all major MTG formats (Standard, Modern, Commander, etc.)
-   **Accessibility** - Intuitive visual interface usable by players of all technical skill levels
-   **Performance** - Smooth zone management and instant card searching for seamless deck building

---

## Roadmap and Missing Features

Magic Helper is under active development. The following features are planned or in progress:

### High Priority

| Feature | Status | Notes |
|---------|--------|-------|
| **Unit Tests** | Not Started | No automated tests currently exist. Backend needs Go tests, frontend needs Vitest/RTL |
| **Subtype Filtering** | Stubbed | Type filtering works, but subtype (Goblin, Elf, etc.) is not yet implemented |
| **Deck Update Optimization** | TODO | Current implementation deletes and re-adds all cards on save. Needs incremental updates |

### Medium Priority

| Feature | Status | Notes |
|---------|--------|-------|
| **Multi-language Support** | Hardcoded | Currently shows English cards only. Language selector needed |
| **Accessibility Audit** | Not Started | Keyboard navigation, ARIA labels, screen reader support needed |
| **Context Menu Integration** | Partial | Basic actions work, but many context menu options are incomplete |
| **ChainBuilder Enhancements** | In Progress | Tag chain creation UI needs polish and better visualization |

### Lower Priority

| Feature | Status | Notes |
|---------|--------|-------|
| **Storybook Integration** | Not Started | Component documentation and isolated development |
| **Card Ignore Polish** | TODO | UI/UX for ignored cards needs refinement |
| **Profile Features** | Planned | User profiles, pictures, descriptions, friend lists |

### Technical Debt

- Some Spanish comments remain in code (per coding guidelines, accents removed)
- Filter logic duplicated between client and server
- Database password in docker-compose needs changing for production

### Recently Completed

- Tag system with hierarchical chains
- Filter presets (save/load configurations)
- Deck cover picker
- Warnings FAB for format legality
- Manual Scryfall re-import trigger
- SavedFiltersPopover with update functionality

### Documentation

Full technical and user documentation is available at `/docs/` (run `npm run docs:dev` to view).

---

_Magic Helper aims to bring the joy and intuition of physical deck building into the digital world, giving you the spatial freedom to build decks exactly the way your mind works._
