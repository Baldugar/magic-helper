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

export enum DeckType {
  BRAWL_60 = 'BRAWL_60',
  BRAWL_100 = 'BRAWL_100'
}

export type FlowZone = {
  __typename?: 'FlowZone';
  ID: Scalars['ID']['output'];
  childrenIDs: Array<Scalars['ID']['output']>;
  height: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  position: Position;
  width: Scalars['Float']['output'];
};

export type FlowZoneInput = {
  ID: Scalars['ID']['input'];
  childrenIDs: Array<Scalars['ID']['input']>;
  height: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  position: PositionInput;
  width: Scalars['Float']['input'];
};

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

export enum MTG_Color {
  B = 'B',
  C = 'C',
  G = 'G',
  R = 'R',
  U = 'U',
  W = 'W'
}

export type MTG_CreateDeckInput = {
  name: Scalars['String']['input'];
};

export type MTG_Deck = {
  __typename?: 'MTG_Deck';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<Scalars['String']['output']>;
  cards: Array<MTG_DeckCard>;
  ignoredCards: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  zones: Array<FlowZone>;
};

export type MTG_DeckCard = {
  __typename?: 'MTG_DeckCard';
  card: MTG_Card;
  count: Scalars['Int']['output'];
  deckCardType: MTG_DeckCardType;
  mainOrSide: MainOrSide;
  phantoms: Array<Phantom>;
  position: Position;
  selectedVersionID?: Maybe<Scalars['String']['output']>;
};

export type MTG_DeckCardInput = {
  ID: Scalars['ID']['input'];
  card: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  deckCardType: MTG_DeckCardType;
  mainOrSide: MainOrSide;
  phantoms: Array<PhantomInput>;
  position: PositionInput;
  selectedVersionID?: InputMaybe<Scalars['String']['input']>;
};

export enum MTG_DeckCardType {
  COMMANDER = 'COMMANDER',
  NORMAL = 'NORMAL'
}

export type MTG_DeleteDeckInput = {
  deckID: Scalars['ID']['input'];
};

export type MTG_Filter_CardTypes = {
  __typename?: 'MTG_Filter_CardTypes';
  cardType: Scalars['String']['output'];
  subtypes: Array<Scalars['String']['output']>;
};

export type MTG_Filter_Entries = {
  __typename?: 'MTG_Filter_Entries';
  expansions: Array<MTG_Filter_Expansion>;
  layouts: Array<MTG_Layout>;
  legality: MTG_Filter_Legality;
  types: Array<MTG_Filter_CardTypes>;
};

export type MTG_Filter_Expansion = {
  __typename?: 'MTG_Filter_Expansion';
  imageURL: Scalars['String']['output'];
  releasedAt: Scalars['Int']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
};

export type MTG_Filter_Legality = {
  __typename?: 'MTG_Filter_Legality';
  formats: Array<Scalars['String']['output']>;
  legalityValues: Array<Scalars['String']['output']>;
};

export enum MTG_Game {
  arena = 'arena',
  mtgo = 'mtgo',
  paper = 'paper'
}

export type MTG_Image = {
  __typename?: 'MTG_Image';
  PNG: Scalars['String']['output'];
  artCrop: Scalars['String']['output'];
  borderCrop: Scalars['String']['output'];
  large: Scalars['String']['output'];
  normal: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

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

export enum MTG_Rarity {
  common = 'common',
  mythic = 'mythic',
  rare = 'rare',
  uncommon = 'uncommon'
}

export type MTG_UpdateDeckInput = {
  cardFrontImage?: InputMaybe<Scalars['String']['input']>;
  cards: Array<MTG_DeckCardInput>;
  deckID: Scalars['ID']['input'];
  ignoredCards: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  zones: Array<FlowZoneInput>;
};

export enum MainOrSide {
  MAIN = 'MAIN',
  SIDEBOARD = 'SIDEBOARD'
}

export type Mutation = {
  __typename?: 'Mutation';
  createMTGDeck: MTG_Deck;
  deleteMTGDeck: Scalars['Boolean']['output'];
  saveMTGDeckAsCopy: MTG_Deck;
  updateMTGDeck: MTG_Deck;
};


export type MutationcreateMTGDeckArgs = {
  input: MTG_CreateDeckInput;
};


export type MutationdeleteMTGDeckArgs = {
  input: MTG_DeleteDeckInput;
};


export type MutationsaveMTGDeckAsCopyArgs = {
  input: MTG_UpdateDeckInput;
};


export type MutationupdateMTGDeckArgs = {
  input: MTG_UpdateDeckInput;
};

export type Phantom = {
  __typename?: 'Phantom';
  ID: Scalars['ID']['output'];
  position: Position;
};

export type PhantomInput = {
  ID: Scalars['ID']['input'];
  position: PositionInput;
};

export type Position = {
  __typename?: 'Position';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type PositionInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type Query = {
  __typename?: 'Query';
  getMTGCards: Array<MTG_Card>;
  getMTGDecks: Array<MTG_Deck>;
  getMTGFilters: MTG_Filter_Entries;
};


export type QuerygetMTGDecksArgs = {
  deckID?: InputMaybe<Scalars['ID']['input']>;
};

export type Response = {
  __typename?: 'Response';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['Boolean']['output'];
};
