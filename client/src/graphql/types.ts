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

export type MTG_Card = MTG_CommonFields & {
  __typename?: 'MTG_Card';
  ID: Scalars['ID']['output'];
  cardFaces?: Maybe<Array<MTG_CardFace>>;
  cmc: Scalars['Int']['output'];
  colorIdentity: Array<MTG_Color>;
  colors?: Maybe<Array<MTG_Color>>;
  description?: Maybe<Scalars['String']['output']>;
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTG_Image>;
  layout: Scalars['String']['output'];
  legalities: Scalars['Map']['output'];
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTG_Color>>;
  rarity: MTG_Rarity;
  releasedAt: Scalars['String']['output'];
  scryfallURL: Scalars['String']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export type MTG_CardFace = MTG_CommonFields & {
  __typename?: 'MTG_CardFace';
  colors?: Maybe<Array<MTG_Color>>;
  description: Scalars['String']['output'];
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTG_Image>;
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost: Scalars['String']['output'];
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTG_Color>>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export enum MTG_CardListType {
  MTG = 'MTG',
  MTGA = 'MTGA'
}

export enum MTG_Color {
  B = 'B',
  C = 'C',
  G = 'G',
  R = 'R',
  U = 'U',
  W = 'W'
}

export type MTG_CommonFields = {
  colors?: Maybe<Array<MTG_Color>>;
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTG_Image>;
  loyalty?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTG_Color>>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export type MTG_CreateDeckInput = {
  list: MTG_CardListType;
  name: Scalars['String']['input'];
  type: DeckType;
};

export type MTG_Deck = {
  __typename?: 'MTG_Deck';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<Scalars['String']['output']>;
  cards: Array<MTG_DeckCard>;
  ignoredCards: Array<Scalars['String']['output']>;
  list: MTG_CardListType;
  name: Scalars['String']['output'];
  type: DeckType;
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
};

export type MTG_DeckCardInput = {
  ID: Scalars['ID']['input'];
  card: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  deckCardType: MTG_DeckCardType;
  mainOrSide: MainOrSide;
  phantoms: Array<PhantomInput>;
  position: PositionInput;
};

export enum MTG_DeckCardType {
  COMMANDER = 'COMMANDER',
  COMPANION = 'COMPANION',
  NORMAL = 'NORMAL'
}

export type MTG_DeleteDeckInput = {
  deckID: Scalars['ID']['input'];
  list: MTG_CardListType;
};

export type MTG_Filter_CardTypes = {
  __typename?: 'MTG_Filter_CardTypes';
  cardType: Scalars['String']['output'];
  subtypes: Array<Scalars['String']['output']>;
};

export type MTG_Filter_Entries = {
  __typename?: 'MTG_Filter_Entries';
  expansions: Array<MTG_Filter_Expansion>;
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

export type MTG_Image = {
  __typename?: 'MTG_Image';
  artCrop: Scalars['String']['output'];
  borderCrop: Scalars['String']['output'];
  large: Scalars['String']['output'];
  normal: Scalars['String']['output'];
  png: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

export enum MTG_Layout {
  ADVENTURE = 'ADVENTURE',
  CASE = 'CASE',
  CLASS = 'CLASS',
  MELD = 'MELD',
  MODAL_DFC = 'MODAL_DFC',
  MUTATE = 'MUTATE',
  NORMAL = 'NORMAL',
  PROTOTYPE = 'PROTOTYPE',
  SAGA = 'SAGA',
  SPLIT = 'SPLIT',
  TRANSFORM = 'TRANSFORM'
}

export enum MTG_Rarity {
  COMMON = 'COMMON',
  MYTHIC = 'MYTHIC',
  RARE = 'RARE',
  UNCOMMON = 'UNCOMMON'
}

export type MTG_UpdateDeckInput = {
  cardFrontImage?: InputMaybe<Scalars['String']['input']>;
  cards: Array<MTG_DeckCardInput>;
  deckID: Scalars['ID']['input'];
  ignoredCards: Array<Scalars['String']['input']>;
  list: MTG_CardListType;
  name: Scalars['String']['input'];
  type: DeckType;
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


export type QuerygetMTGCardsArgs = {
  list: MTG_CardListType;
};


export type QuerygetMTGDecksArgs = {
  deckID?: InputMaybe<Scalars['ID']['input']>;
  list: MTG_CardListType;
};


export type QuerygetMTGFiltersArgs = {
  list: MTG_CardListType;
};

export type Response = {
  __typename?: 'Response';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['Boolean']['output'];
};
