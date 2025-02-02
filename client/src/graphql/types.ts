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

export type MTGA_Card = MTGA_CommonFields & {
  __typename?: 'MTGA_Card';
  ID: Scalars['ID']['output'];
  cardFaces?: Maybe<Array<MTGA_CardFace>>;
  cmc: Scalars['Int']['output'];
  colorIdentity: Array<MTGA_Color>;
  colors?: Maybe<Array<MTGA_Color>>;
  description?: Maybe<Scalars['String']['output']>;
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTGA_Image>;
  layout: Scalars['String']['output'];
  legalities: Scalars['Map']['output'];
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTGA_Color>>;
  rarity: MTGA_Rarity;
  releasedAt: Scalars['String']['output'];
  scryfallURL: Scalars['String']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export type MTGA_CardFace = MTGA_CommonFields & {
  __typename?: 'MTGA_CardFace';
  colors?: Maybe<Array<MTGA_Color>>;
  description: Scalars['String']['output'];
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTGA_Image>;
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost: Scalars['String']['output'];
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTGA_Color>>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export enum MTGA_Color {
  B = 'B',
  C = 'C',
  G = 'G',
  R = 'R',
  U = 'U',
  W = 'W'
}

export type MTGA_CommonFields = {
  colors?: Maybe<Array<MTGA_Color>>;
  flavorText?: Maybe<Scalars['String']['output']>;
  image?: Maybe<MTGA_Image>;
  loyalty?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTGA_Color>>;
  toughness?: Maybe<Scalars['String']['output']>;
  typeLine: Scalars['String']['output'];
};

export type MTGA_CreateDeckInput = {
  name: Scalars['String']['input'];
  type: DeckType;
};

export type MTGA_Deck = {
  __typename?: 'MTGA_Deck';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<Scalars['String']['output']>;
  cards: Array<MTGA_DeckCard>;
  name: Scalars['String']['output'];
  type: DeckType;
  zones: Array<FlowZone>;
};

export type MTGA_DeckCard = {
  __typename?: 'MTGA_DeckCard';
  card: MTGA_Card;
  count: Scalars['Int']['output'];
  deckCardType: MTGA_DeckCardType;
  mainOrSide: MainOrSide;
  phantoms: Array<Position>;
  position: Position;
};

export type MTGA_DeckCardInput = {
  ID: Scalars['ID']['input'];
  card: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  deckCardType: MTGA_DeckCardType;
  mainOrSide: MainOrSide;
  phantoms: Array<PositionInput>;
  position: PositionInput;
};

export enum MTGA_DeckCardType {
  COMMANDER = 'COMMANDER',
  COMPANION = 'COMPANION',
  NORMAL = 'NORMAL'
}

export type MTGA_DeleteDeckInput = {
  deckID: Scalars['ID']['input'];
};

export type MTGA_Filter_CardTypes = {
  __typename?: 'MTGA_Filter_CardTypes';
  cardType: Scalars['String']['output'];
  subtypes: Array<Scalars['String']['output']>;
};

export type MTGA_Filter_Entries = {
  __typename?: 'MTGA_Filter_Entries';
  expansions: Array<MTGA_Filter_Expansion>;
  legality: MTGA_Filter_Legality;
  types: Array<MTGA_Filter_CardTypes>;
};

export type MTGA_Filter_Expansion = {
  __typename?: 'MTGA_Filter_Expansion';
  imageURL: Scalars['String']['output'];
  releasedAt: Scalars['Int']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
};

export type MTGA_Filter_Legality = {
  __typename?: 'MTGA_Filter_Legality';
  formats: Array<Scalars['String']['output']>;
  legalityValues: Array<Scalars['String']['output']>;
};

export type MTGA_Image = {
  __typename?: 'MTGA_Image';
  artCrop: Scalars['String']['output'];
  borderCrop: Scalars['String']['output'];
  large: Scalars['String']['output'];
  normal: Scalars['String']['output'];
  png: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

export enum MTGA_Layout {
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

export enum MTGA_Rarity {
  COMMON = 'COMMON',
  MYTHIC = 'MYTHIC',
  RARE = 'RARE',
  UNCOMMON = 'UNCOMMON'
}

export type MTGA_UpdateDeckInput = {
  cardFrontImage?: InputMaybe<Scalars['String']['input']>;
  cards: Array<MTGA_DeckCardInput>;
  deckID: Scalars['ID']['input'];
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
  createMTGADeck: MTGA_Deck;
  deleteMTGADeck: Scalars['Boolean']['output'];
  updateMTGADeck: MTGA_Deck;
};


export type MutationcreateMTGADeckArgs = {
  input: MTGA_CreateDeckInput;
};


export type MutationdeleteMTGADeckArgs = {
  input: MTGA_DeleteDeckInput;
};


export type MutationupdateMTGADeckArgs = {
  input: MTGA_UpdateDeckInput;
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
  getMTGACards: Array<MTGA_Card>;
  getMTGADecks: Array<MTGA_Deck>;
  getMTGAFilters: MTGA_Filter_Entries;
};


export type QuerygetMTGADecksArgs = {
  deckID?: InputMaybe<Scalars['ID']['input']>;
};

export type Response = {
  __typename?: 'Response';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['Boolean']['output'];
};
