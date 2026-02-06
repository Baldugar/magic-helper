---
layout: home

hero:
  name: Magic Helper
  text: Visual Deck Builder for MTG
  tagline: Build decks like you would on a physical table
  actions:
    - theme: brand
      text: Get Started
      link: /user-guide/getting-started
    - theme: alt
      text: Technical Docs
      link: /technical/

features:
  - icon: "\U0001F3AF"
    title: Visual Deck Building
    details: Drag cards, create zones, and organize your deck spatially with a ReactFlow-powered canvas
  - icon: "\U0001F50D"
    title: Advanced Filtering
    details: Powerful ternary filters for colors, types, sets, legality, and custom tags with include/exclude logic
  - icon: "\U0001F3F7\uFE0F"
    title: Smart Tagging
    details: Create hierarchical tag chains to organize cards exactly how you think about them
  - icon: "\U0001F4E6"
    title: Card Packages
    details: Build and import thematic card collections for rapid deck building and strategy exploration
---

## Welcome to Magic Helper

Magic Helper recreates the authentic experience of building Magic: The Gathering decks on a physical table. Create zones (card piles), move them around, and visually organize your deck just like you would with physical cards.

### Quick Links

| Documentation | Description |
|--------------|-------------|
| [User Guide](/user-guide/) | Learn how to use Magic Helper effectively |
| [Technical Docs](/technical/) | Architecture and implementation details |
| [Development](/development/) | Setup your development environment |
| [GraphQL API](/technical/backend-architecture#graphql-api) | API reference and examples |

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + ReactFlow (XYFlow)
- **Backend**: Go 1.23 + GraphQL (gqlgen)
- **Database**: ArangoDB (multi-model graph database)
- **Data Source**: Scryfall API for card data

### Project Status

Magic Helper is under active development. Check the [Roadmap](/technical/#roadmap-and-missing-features) for planned features and improvements.
