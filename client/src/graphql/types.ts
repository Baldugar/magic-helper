export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Map: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

/** Mark a card as ignored for the specified deck. */
export type AddIgnoredCardInput = {
  cardID: Scalars['ID']['input'];
  deckID: Scalars['ID']['input'];
};

/** Supported deck archetypes. */
export enum DeckType {
  BRAWL = 'BRAWL',
  HISTORIC = 'HISTORIC',
  STANDARD = 'STANDARD',
  STANDARD_BRAWL = 'STANDARD_BRAWL',
  UNKNOWN = 'UNKNOWN'
}

/** Represents a zone in the deck builder. */
export type FlowZone = {
  __typename?: 'FlowZone';
  ID: Scalars['ID']['output'];
  cardChildren: Array<Scalars['ID']['output']>;
  height: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  position: Position;
  width: Scalars['Float']['output'];
  zoneChildren: Array<Scalars['ID']['output']>;
};

/** Used to save the deck builder zones and their children. */
export type FlowZoneInput = {
  ID: Scalars['ID']['input'];
  cardChildren: Array<Scalars['ID']['input']>;
  height: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  position: PositionInput;
  width: Scalars['Float']['input'];
  zoneChildren: Array<Scalars['ID']['input']>;
};

/** Aggregated MTG card entity with curated versions and user context. */
export type MTG_Card = {
  __typename?: 'MTG_Card';
  CMC: Scalars['Float']['output'];
  EDHRecRank?: Maybe<Scalars['Int']['output']>;
  ID: Scalars['ID']['output'];
  colorIdentity: Array<MTG_Color>;
  colorIndicator?: Maybe<Array<Scalars['String']['output']>>;
  colors?: Maybe<Array<MTG_Color>>;
  keywords: Array<Scalars['String']['output']>;
  layout: MTG_Layout;
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  oracleText?: Maybe<Scalars['String']['output']>;
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTG_Color>>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
  versions: Array<MTG_CardVersion>;
};

/** One face of a multi-faced card version. */
export type MTG_CardFace = {
  __typename?: 'MTG_CardFace';
  CMC?: Maybe<Scalars['Float']['output']>;
  artist?: Maybe<Scalars['String']['output']>;
  colorIndicator?: Maybe<Array<Scalars['String']['output']>>;
  colors?: Maybe<Array<MTG_Color>>;
  flavorText?: Maybe<Scalars['String']['output']>;
  imageUris?: Maybe<MTG_Image>;
  layout?: Maybe<MTG_Layout>;
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost: Scalars['String']['output'];
  name: Scalars['String']['output'];
  oracleText?: Maybe<Scalars['String']['output']>;
  power?: Maybe<Scalars['String']['output']>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine?: Maybe<Scalars['String']['output']>;
};

/** Minimal face data for dashboard UI. */
export type MTG_CardFace_Dashboard = {
  __typename?: 'MTG_CardFace_Dashboard';
  imageUris?: Maybe<MTG_Image>;
};

/** A specific printing/version of a card used by the app. */
export type MTG_CardVersion = {
  __typename?: 'MTG_CardVersion';
  ID: Scalars['ID']['output'];
  artist?: Maybe<Scalars['String']['output']>;
  cardFaces?: Maybe<Array<MTG_CardFace>>;
  flavorName?: Maybe<Scalars['String']['output']>;
  flavorText?: Maybe<Scalars['String']['output']>;
  games: Array<MTG_Game>;
  imageUris?: Maybe<MTG_Image>;
  isAlchemy: Scalars['Boolean']['output'];
  isDefault: Scalars['Boolean']['output'];
  lang: Scalars['String']['output'];
  legalities: Scalars['Map']['output'];
  printedName: Scalars['String']['output'];
  rarity: MTG_Rarity;
  releasedAt: Scalars['String']['output'];
  reprint: Scalars['Boolean']['output'];
  set: Scalars['String']['output'];
  setID: Scalars['String']['output'];
  setName: Scalars['String']['output'];
  setType: Scalars['String']['output'];
  variation: Scalars['Boolean']['output'];
  variationOf?: Maybe<Scalars['String']['output']>;
};

/** Minimal card version data for dashboard UI. */
export type MTG_CardVersion_Dashboard = {
  __typename?: 'MTG_CardVersion_Dashboard';
  ID: Scalars['ID']['output'];
  cardFaces: Array<MTG_CardFace_Dashboard>;
  imageUris?: Maybe<MTG_Image>;
  isAlchemy: Scalars['Boolean']['output'];
  isDefault: Scalars['Boolean']['output'];
};

/** Minimal card representation for dashboard listings. */
export type MTG_Card_Dashboard = {
  __typename?: 'MTG_Card_Dashboard';
  ID: Scalars['ID']['output'];
  versions: Array<MTG_CardVersion_Dashboard>;
};

/** Magic color identity abbreviations. */
export enum MTG_Color {
  B = 'B',
  C = 'C',
  G = 'G',
  R = 'R',
  U = 'U',
  W = 'W'
}

/** Input to create a new deck. */
export type MTG_CreateDeckInput = {
  name: Scalars['String']['input'];
  type: DeckType;
};

/** Input payload to create a new filter preset. */
export type MTG_CreateFilterPresetInput = {
  deckID: Scalars['ID']['input'];
  filter: Scalars['Map']['input'];
  name: Scalars['String']['input'];
  page: Scalars['Int']['input'];
  sort: Array<MTG_Filter_SortInput>;
};

/** A user deck with cards, positions, zones and optional front image. */
export type MTG_Deck = {
  __typename?: 'MTG_Deck';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<MTG_Deck_CardFrontImage>;
  cards: Array<MTG_DeckCard>;
  ignoredCards: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  type: DeckType;
  zones: Array<FlowZone>;
};

/** A card entry in a deck with selection and positioning metadata. */
export type MTG_DeckCard = {
  __typename?: 'MTG_DeckCard';
  card: MTG_Card;
  count: Scalars['Int']['output'];
  deckCardType: MTG_DeckCardType;
  phantoms: Array<Phantom>;
  position: Position;
  selectedVersionID?: Maybe<Scalars['String']['output']>;
};

/** Front image selection referencing a card version. */
export type MTG_DeckCardFrontImageInput = {
  cardID: Scalars['ID']['input'];
  versionID: Scalars['ID']['input'];
};

/** Deck card entry with position and selection metadata. */
export type MTG_DeckCardInput = {
  card: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  deckCardType: MTG_DeckCardType;
  phantoms: Array<PhantomInput>;
  position: PositionInput;
  selectedVersionID?: InputMaybe<Scalars['String']['input']>;
};

/** Card role in deck (normal or commander). */
export enum MTG_DeckCardType {
  COMMANDER = 'COMMANDER',
  NORMAL = 'NORMAL'
}

/** Minimal deck card data for dashboard UI. */
export type MTG_DeckCard_Dashboard = {
  __typename?: 'MTG_DeckCard_Dashboard';
  card: MTG_Card_Dashboard;
  selectedVersionID?: Maybe<Scalars['String']['output']>;
};

/** Deck summary for dashboard listings. */
export type MTG_DeckDashboard = {
  __typename?: 'MTG_DeckDashboard';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<MTG_Deck_CardFrontImage>;
  cards: Array<MTG_DeckCard_Dashboard>;
  name: Scalars['String']['output'];
  type: DeckType;
};

/** Selected front image for a deck, referencing a card version. */
export type MTG_Deck_CardFrontImage = {
  __typename?: 'MTG_Deck_CardFrontImage';
  cardID: Scalars['ID']['output'];
  image: MTG_Image;
  versionID: Scalars['ID']['output'];
};

/** Input to delete a deck by ID. */
export type MTG_DeleteDeckInput = {
  deckID: Scalars['ID']['input'];
};

/** Identifier wrapper for deleting a filter preset. */
export type MTG_DeleteFilterPresetInput = {
  presetID: Scalars['ID']['input'];
};

/** Saved filter preset tied to a deck. */
export type MTG_FilterPreset = {
  __typename?: 'MTG_FilterPreset';
  ID: Scalars['ID']['output'];
  deckID: Scalars['ID']['output'];
  filter: Scalars['Map']['output'];
  name: Scalars['String']['output'];
  page: Scalars['Int']['output'];
  savedAt: Scalars['String']['output'];
  sort: Array<MTG_Filter_SortState>;
};

/** Card type filter entry with ternary state. */
export type MTG_Filter_CardTypeInput = {
  cardType: Scalars['String']['input'];
  value: TernaryBoolean;
};

/** A card type and its associated subtypes. */
export type MTG_Filter_CardTypes = {
  __typename?: 'MTG_Filter_CardTypes';
  cardType: Scalars['String']['output'];
  subtypes: Array<Scalars['String']['output']>;
};

/** Color filter entry with ternary state. */
export type MTG_Filter_ColorInput = {
  color: MTG_Color;
  value: TernaryBoolean;
};

/** Aggregated entries used to render filter UI. */
export type MTG_Filter_Entries = {
  __typename?: 'MTG_Filter_Entries';
  expansions: Array<MTG_Filter_Expansion>;
  layouts: Array<MTG_Layout>;
  legality: MTG_Filter_Legality;
  types: Array<MTG_Filter_CardTypes>;
};

/** Expansion metadata used by filters and sorting. */
export type MTG_Filter_Expansion = {
  __typename?: 'MTG_Filter_Expansion';
  games: Array<MTG_Game>;
  imageURL: Scalars['String']['output'];
  releasedAt: Scalars['Int']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
  setType: Scalars['String']['output'];
};

/** Game platform filter entry with ternary state. */
export type MTG_Filter_GameInput = {
  game: MTG_Game;
  value: TernaryBoolean;
};

/** Layout filter entry with ternary state. */
export type MTG_Filter_LayoutInput = {
  layout: MTG_Layout;
  value: TernaryBoolean;
};

/** Distinct legality formats and statuses collected from cards. */
export type MTG_Filter_Legality = {
  __typename?: 'MTG_Filter_Legality';
  formats: Array<Scalars['String']['output']>;
  legalityValues: Array<Scalars['String']['output']>;
};

/** Single legality value with ternary state. */
export type MTG_Filter_LegalityEntryInput = {
  legalityValue: Scalars['String']['input'];
  value: TernaryBoolean;
};

/** Legality format and associated statuses. */
export type MTG_Filter_LegalityInput = {
  format: Scalars['String']['input'];
  legalityEntries: Array<MTG_Filter_LegalityEntryInput>;
};

/** Mana cost filter entry with ternary state or special values. */
export type MTG_Filter_ManaCostInput = {
  manaCost: Scalars['String']['input'];
  value: TernaryBoolean;
};

/** Page and page size for cursorless pagination. */
export type MTG_Filter_PaginationInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};

/** Rarity filter entry with ternary state. */
export type MTG_Filter_RarityInput = {
  rarity: MTG_Rarity;
  value: TernaryBoolean;
};

/** Search results and total count for pagination. */
export type MTG_Filter_Search = {
  __typename?: 'MTG_Filter_Search';
  pagedCards: Array<MTG_Card>;
  totalCount: Scalars['Int']['output'];
};

/** Combined filter input used to filter cards. */
export type MTG_Filter_SearchInput = {
  cardTypes: Array<MTG_Filter_CardTypeInput>;
  color: Array<MTG_Filter_ColorInput>;
  commander?: InputMaybe<Scalars['ID']['input']>;
  deckID?: InputMaybe<Scalars['ID']['input']>;
  games: Array<MTG_Filter_GameInput>;
  hideIgnored: Scalars['Boolean']['input'];
  isSelectingCommander: Scalars['Boolean']['input'];
  layouts: Array<MTG_Filter_LayoutInput>;
  legalities: Array<MTG_Filter_LegalityInput>;
  manaCosts: Array<MTG_Filter_ManaCostInput>;
  multiColor: TernaryBoolean;
  rarity: Array<MTG_Filter_RarityInput>;
  searchString?: InputMaybe<Scalars['String']['input']>;
  sets: Array<MTG_Filter_SetInput>;
  subtypes: Array<MTG_Filter_SubtypeInput>;
};

/** Set filter entry with ternary state. */
export type MTG_Filter_SetInput = {
  set: Scalars['String']['input'];
  value: TernaryBoolean;
};

/** Sortable fields for card lists. */
export enum MTG_Filter_SortBy {
  CMC = 'CMC',
  COLOR = 'COLOR',
  NAME = 'NAME',
  RARITY = 'RARITY',
  RELEASED_AT = 'RELEASED_AT',
  SET = 'SET',
  TYPE = 'TYPE'
}

/** Sort direction. */
export enum MTG_Filter_SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

/** Sort directive with field, direction, and enabled flag. */
export type MTG_Filter_SortInput = {
  enabled: Scalars['Boolean']['input'];
  sortBy: MTG_Filter_SortBy;
  sortDirection: MTG_Filter_SortDirection;
};

/** Sort configuration snapshot stored with a filter preset. */
export type MTG_Filter_SortState = {
  __typename?: 'MTG_Filter_SortState';
  enabled: Scalars['Boolean']['output'];
  sortBy: MTG_Filter_SortBy;
  sortDirection: MTG_Filter_SortDirection;
};

/** Subtype filter entry with ternary state. */
export type MTG_Filter_SubtypeInput = {
  subtype: Scalars['String']['input'];
  value: TernaryBoolean;
};

/** Game platforms where a print is available. */
export enum MTG_Game {
  arena = 'arena',
  mtgo = 'mtgo',
  paper = 'paper'
}

/** Image URLs in multiple sizes from Scryfall. */
export type MTG_Image = {
  __typename?: 'MTG_Image';
  PNG: Scalars['String']['output'];
  artCrop: Scalars['String']['output'];
  borderCrop: Scalars['String']['output'];
  large: Scalars['String']['output'];
  normal: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

/** Card layouts as defined by Scryfall. */
export enum MTG_Layout {
  adventure = 'adventure',
  art_series = 'art_series',
  augment = 'augment',
  battle = 'battle',
  case = 'case',
  class = 'class',
  double_faced_token = 'double_faced_token',
  emblem = 'emblem',
  flip = 'flip',
  host = 'host',
  leveler = 'leveler',
  meld = 'meld',
  modal_dfc = 'modal_dfc',
  mutate = 'mutate',
  normal = 'normal',
  planar = 'planar',
  prototype = 'prototype',
  reversible_card = 'reversible_card',
  saga = 'saga',
  scheme = 'scheme',
  split = 'split',
  token = 'token',
  transform = 'transform',
  vanguard = 'vanguard'
}

/** Rarity tiers for a printing. */
export enum MTG_Rarity {
  common = 'common',
  mythic = 'mythic',
  rare = 'rare',
  uncommon = 'uncommon'
}

/** Input to update deck fields, cards, zones and front image. */
export type MTG_UpdateDeckInput = {
  cardFrontImage?: InputMaybe<MTG_DeckCardFrontImageInput>;
  cards: Array<MTG_DeckCardInput>;
  deckID: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  type: DeckType;
  zones: Array<FlowZoneInput>;
};

/** Fields allowed when updating an existing filter preset. */
export type MTG_UpdateFilterPresetInput = {
  filter?: InputMaybe<Scalars['Map']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  presetID: Scalars['ID']['input'];
  sort?: InputMaybe<Array<MTG_Filter_SortInput>>;
};

/** Root-level write operations. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Mark a card as ignored for a deck. */
  addIgnoredCard: Response;
  /** Create a new deck and return its ID in Response.message. */
  createMTGDeck: Response;
  /** Save a new filter preset for a deck. */
  createMTGFilterPreset: MTG_FilterPreset;
  /** Delete a deck by ID. */
  deleteMTGDeck: Response;
  /** Delete a filter preset. */
  deleteMTGFilterPreset: Response;
  /** Remove ignored mark from a deck/card pair. */
  removeIgnoredCard: Response;
  /** Create a new deck by copying another deck's data. */
  saveMTGDeckAsCopy: Response;
  /** Replace deck fields and card edges. */
  updateMTGDeck: Response;
  /** Update an existing filter preset. */
  updateMTGFilterPreset: MTG_FilterPreset;
};


/** Root-level write operations. */
export type MutationaddIgnoredCardArgs = {
  input: AddIgnoredCardInput;
};


/** Root-level write operations. */
export type MutationcreateMTGDeckArgs = {
  input: MTG_CreateDeckInput;
};


/** Root-level write operations. */
export type MutationcreateMTGFilterPresetArgs = {
  input: MTG_CreateFilterPresetInput;
};


/** Root-level write operations. */
export type MutationdeleteMTGDeckArgs = {
  input: MTG_DeleteDeckInput;
};


/** Root-level write operations. */
export type MutationdeleteMTGFilterPresetArgs = {
  input: MTG_DeleteFilterPresetInput;
};


/** Root-level write operations. */
export type MutationremoveIgnoredCardArgs = {
  input: RemoveIgnoredCardInput;
};


/** Root-level write operations. */
export type MutationsaveMTGDeckAsCopyArgs = {
  input: MTG_UpdateDeckInput;
};


/** Root-level write operations. */
export type MutationupdateMTGDeckArgs = {
  input: MTG_UpdateDeckInput;
};


/** Root-level write operations. */
export type MutationupdateMTGFilterPresetArgs = {
  input: MTG_UpdateFilterPresetInput;
};

/** A phantom placeholder used for visual grouping on the board. */
export type Phantom = {
  __typename?: 'Phantom';
  ID: Scalars['ID']['output'];
  position: Position;
};

/** Phantom placeholder to aid UI grouping. */
export type PhantomInput = {
  ID: Scalars['ID']['input'];
  position: PositionInput;
};

/** Represents the position of an entity in the deck builder. */
export type Position = {
  __typename?: 'Position';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

/** Used to save the position of an entity in the deck builder. */
export type PositionInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** Root-level read operations. */
export type Query = {
  __typename?: 'Query';
  /** Return all curated MTG cards with ratings and tags. */
  getMTGCards: Array<MTG_Card>;
  getMTGCardsFiltered: MTG_Filter_Search;
  /** Return a single deck by ID with cards and metadata. */
  getMTGDeck: MTG_Deck;
  /** List all decks for dashboard view. */
  getMTGDecks: Array<MTG_DeckDashboard>;
  /** List saved filter presets for a deck. */
  getMTGFilterPresets: Array<MTG_FilterPreset>;
  /** Return available filter options (types, layouts, expansions, legalities). */
  getMTGFilters: MTG_Filter_Entries;
};


/** Root-level read operations. */
export type QuerygetMTGCardsFilteredArgs = {
  filter: MTG_Filter_SearchInput;
  pagination: MTG_Filter_PaginationInput;
  sort: Array<MTG_Filter_SortInput>;
};


/** Root-level read operations. */
export type QuerygetMTGDeckArgs = {
  deckID: Scalars['ID']['input'];
};


/** Root-level read operations. */
export type QuerygetMTGFilterPresetsArgs = {
  deckID: Scalars['ID']['input'];
};

/** Remove an ignored mark for a deck/card pair. */
export type RemoveIgnoredCardInput = {
  cardID: Scalars['ID']['input'];
  deckID: Scalars['ID']['input'];
};

/** Generic response wrapper with status and optional message. */
export type Response = {
  __typename?: 'Response';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['Boolean']['output'];
};

/** Three-state boolean used for filter entries. */
export enum TernaryBoolean {
  FALSE = 'FALSE',
  TRUE = 'TRUE',
  UNSET = 'UNSET'
}
