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

export type AggregatedRating = {
  __typename?: 'AggregatedRating';
  average: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
};

export type AssignTagInput = {
  cardID: Scalars['ID']['input'];
  tagID: Scalars['ID']['input'];
};

export type CardTag = Tag & {
  __typename?: 'CardTag';
  ID: Scalars['ID']['output'];
  aggregatedRating: AggregatedRating;
  description?: Maybe<Scalars['String']['output']>;
  myRating?: Maybe<UserRating>;
  name: Scalars['String']['output'];
  ratings: Array<UserRating>;
};

export type CreateTagInput = {
  cardID?: InputMaybe<Scalars['ID']['input']>;
  colors?: InputMaybe<Array<MTG_Color>>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type: TagType;
};

export type DeckTag = Tag & {
  __typename?: 'DeckTag';
  ID: Scalars['ID']['output'];
  aggregatedRating: AggregatedRating;
  colors: Array<MTG_Color>;
  description?: Maybe<Scalars['String']['output']>;
  myRating?: Maybe<UserRating>;
  name: Scalars['String']['output'];
  ratings: Array<UserRating>;
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

export type MTG_AddCardToCardPackageInput = {
  card: Scalars['ID']['input'];
  cardPackageID: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
};

export type MTG_Card = {
  __typename?: 'MTG_Card';
  CMC: Scalars['Float']['output'];
  EDHRecRank?: Maybe<Scalars['Int']['output']>;
  ID: Scalars['ID']['output'];
  aggregatedRating: AggregatedRating;
  cardTags: Array<CardTag>;
  colorIdentity: Array<MTG_Color>;
  colorIndicator?: Maybe<Array<Scalars['String']['output']>>;
  colors?: Maybe<Array<MTG_Color>>;
  deckTags: Array<DeckTag>;
  keywords: Array<Scalars['String']['output']>;
  layout: MTG_Layout;
  loyalty?: Maybe<Scalars['String']['output']>;
  manaCost?: Maybe<Scalars['String']['output']>;
  myRating?: Maybe<UserRating>;
  name: Scalars['String']['output'];
  oracleText?: Maybe<Scalars['String']['output']>;
  power?: Maybe<Scalars['String']['output']>;
  producedMana?: Maybe<Array<MTG_Color>>;
  ratings: Array<UserRating>;
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

export type MTG_CardPackage = {
  __typename?: 'MTG_CardPackage';
  ID: Scalars['ID']['output'];
  cards: Array<MTG_CardPackageCard>;
  name: Scalars['String']['output'];
};

export type MTG_CardPackageCard = {
  __typename?: 'MTG_CardPackageCard';
  card: MTG_Card;
  count: Scalars['Int']['output'];
  mainOrSide: MainOrSide;
  selectedVersionID?: Maybe<Scalars['String']['output']>;
};

export type MTG_CardPackageCardInput = {
  card: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  mainOrSide: MainOrSide;
  selectedVersionID?: InputMaybe<Scalars['String']['input']>;
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

export type MTG_CreateCardPackageInput = {
  name: Scalars['String']['input'];
};

export type MTG_CreateDeckInput = {
  name: Scalars['String']['input'];
};

export type MTG_Deck = {
  __typename?: 'MTG_Deck';
  ID: Scalars['ID']['output'];
  cardFrontImage?: Maybe<MTG_Card>;
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

export type MTG_DeckCardFrontImageInput = {
  cardID: Scalars['ID']['input'];
  versionID: Scalars['ID']['input'];
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

export type MTG_DeleteCardPackageInput = {
  cardPackageID: Scalars['ID']['input'];
};

export type MTG_DeleteDeckInput = {
  deckID: Scalars['ID']['input'];
};

export type MTG_Filter_CardTypeInput = {
  cardType: Scalars['String']['input'];
  value: TernaryBoolean;
};

export type MTG_Filter_CardTypes = {
  __typename?: 'MTG_Filter_CardTypes';
  cardType: Scalars['String']['output'];
  subtypes: Array<Scalars['String']['output']>;
};

export type MTG_Filter_ColorInput = {
  color: MTG_Color;
  value: TernaryBoolean;
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
  games: Array<MTG_Game>;
  imageURL: Scalars['String']['output'];
  releasedAt: Scalars['Int']['output'];
  set: Scalars['String']['output'];
  setName: Scalars['String']['output'];
  setType: Scalars['String']['output'];
};

export type MTG_Filter_GameInput = {
  game: MTG_Game;
  value: TernaryBoolean;
};

export type MTG_Filter_LayoutInput = {
  layout: MTG_Layout;
  value: TernaryBoolean;
};

export type MTG_Filter_Legality = {
  __typename?: 'MTG_Filter_Legality';
  formats: Array<Scalars['String']['output']>;
  legalityValues: Array<Scalars['String']['output']>;
};

export type MTG_Filter_LegalityEntryInput = {
  legalityValue: Scalars['String']['input'];
  value: TernaryBoolean;
};

export type MTG_Filter_LegalityInput = {
  format: Scalars['String']['input'];
  legalityEntries: Array<MTG_Filter_LegalityEntryInput>;
};

export type MTG_Filter_ManaCostInput = {
  manaCost: Scalars['String']['input'];
  value: TernaryBoolean;
};

export type MTG_Filter_PaginationInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};

export type MTG_Filter_RarityInput = {
  rarity: MTG_Rarity;
  value: TernaryBoolean;
};

export type MTG_Filter_RatingInput = {
  max?: InputMaybe<Scalars['Int']['input']>;
  min?: InputMaybe<Scalars['Int']['input']>;
};

export type MTG_Filter_Search = {
  __typename?: 'MTG_Filter_Search';
  pagedCards: Array<MTG_Card>;
  totalCount: Scalars['Int']['output'];
};

export type MTG_Filter_SearchInput = {
  cardTypes: Array<MTG_Filter_CardTypeInput>;
  color: Array<MTG_Filter_ColorInput>;
  games: Array<MTG_Filter_GameInput>;
  hideIgnored: TernaryBoolean;
  layouts: Array<MTG_Filter_LayoutInput>;
  legalities: Array<MTG_Filter_LegalityInput>;
  manaCosts: Array<MTG_Filter_ManaCostInput>;
  multiColor: TernaryBoolean;
  rarity: Array<MTG_Filter_RarityInput>;
  rating: MTG_Filter_RatingInput;
  searchString?: InputMaybe<Scalars['String']['input']>;
  sets: Array<MTG_Filter_SetInput>;
  subtypes: Array<MTG_Filter_SubtypeInput>;
  tags: Array<MTG_Filter_TagInput>;
};

export type MTG_Filter_SetInput = {
  set: Scalars['String']['input'];
  value: TernaryBoolean;
};

export enum MTG_Filter_SortBy {
  CMC = 'CMC',
  COLOR = 'COLOR',
  NAME = 'NAME',
  RARITY = 'RARITY',
  RELEASED_AT = 'RELEASED_AT',
  SET = 'SET',
  TYPE = 'TYPE'
}

export enum MTG_Filter_SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

export type MTG_Filter_SortInput = {
  enabled: Scalars['Boolean']['input'];
  sortBy: MTG_Filter_SortBy;
  sortDirection: MTG_Filter_SortDirection;
};

export type MTG_Filter_SubtypeInput = {
  subtype: Scalars['String']['input'];
  value: TernaryBoolean;
};

export type MTG_Filter_TagInput = {
  tag: Scalars['String']['input'];
  value: TernaryBoolean;
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

export type MTG_RemoveCardFromCardPackageInput = {
  card: Scalars['ID']['input'];
  cardPackageID: Scalars['ID']['input'];
};

export type MTG_UpdateDeckInput = {
  cardFrontImage?: InputMaybe<MTG_DeckCardFrontImageInput>;
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
  addMTGCardToCardPackage: MTG_CardPackage;
  assignTag: Scalars['Boolean']['output'];
  createMTGCardPackage: MTG_CardPackage;
  createMTGDeck: MTG_Deck;
  createTag: Scalars['ID']['output'];
  deleteMTGCardPackage: Scalars['Boolean']['output'];
  deleteMTGDeck: Scalars['Boolean']['output'];
  deleteTag: Scalars['ID']['output'];
  rate: Scalars['ID']['output'];
  removeMTGCardFromCardPackage: MTG_CardPackage;
  saveMTGDeckAsCopy: MTG_Deck;
  unassignTag: Scalars['Boolean']['output'];
  updateMTGDeck: MTG_Deck;
  updateTag: Scalars['ID']['output'];
};


export type MutationaddMTGCardToCardPackageArgs = {
  input: MTG_AddCardToCardPackageInput;
};


export type MutationassignTagArgs = {
  input: AssignTagInput;
};


export type MutationcreateMTGCardPackageArgs = {
  input: MTG_CreateCardPackageInput;
};


export type MutationcreateMTGDeckArgs = {
  input: MTG_CreateDeckInput;
};


export type MutationcreateTagArgs = {
  input: CreateTagInput;
};


export type MutationdeleteMTGCardPackageArgs = {
  input: MTG_DeleteCardPackageInput;
};


export type MutationdeleteMTGDeckArgs = {
  input: MTG_DeleteDeckInput;
};


export type MutationdeleteTagArgs = {
  tagID: Scalars['ID']['input'];
};


export type MutationrateArgs = {
  input: RateInput;
};


export type MutationremoveMTGCardFromCardPackageArgs = {
  input: MTG_RemoveCardFromCardPackageInput;
};


export type MutationsaveMTGDeckAsCopyArgs = {
  input: MTG_UpdateDeckInput;
};


export type MutationunassignTagArgs = {
  input: UnassignTagInput;
};


export type MutationupdateMTGDeckArgs = {
  input: MTG_UpdateDeckInput;
};


export type MutationupdateTagArgs = {
  input: UpdateTagInput;
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
  cardTags: Array<CardTag>;
  deckTags: Array<DeckTag>;
  getMTGCardPackages: Array<MTG_CardPackage>;
  getMTGCards: Array<MTG_Card>;
  getMTGCardsFiltered: MTG_Filter_Search;
  getMTGDecks: Array<MTG_Deck>;
  getMTGFilters: MTG_Filter_Entries;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
};


export type QuerygetMTGCardPackagesArgs = {
  cardPackageID?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerygetMTGCardsFilteredArgs = {
  filter: MTG_Filter_SearchInput;
  pagination: MTG_Filter_PaginationInput;
  sort: Array<MTG_Filter_SortInput>;
};


export type QuerygetMTGDecksArgs = {
  deckID?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerytagArgs = {
  id: Scalars['ID']['input'];
};

export enum RatableEntityType {
  CARD = 'CARD',
  TAG = 'TAG'
}

export type RateInput = {
  entityID: Scalars['ID']['input'];
  entityType: RatableEntityType;
  userID: Scalars['ID']['input'];
  value: Scalars['Int']['input'];
};

export type Response = {
  __typename?: 'Response';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['Boolean']['output'];
};

export type Tag = {
  ID: Scalars['ID']['output'];
  aggregatedRating: AggregatedRating;
  description?: Maybe<Scalars['String']['output']>;
  myRating?: Maybe<UserRating>;
  name: Scalars['String']['output'];
  ratings: Array<UserRating>;
};

export enum TagType {
  CardTag = 'CardTag',
  DeckTag = 'DeckTag'
}

export enum TernaryBoolean {
  FALSE = 'FALSE',
  TRUE = 'TRUE',
  UNSET = 'UNSET'
}

export type UnassignTagInput = {
  cardID: Scalars['ID']['input'];
  tagID: Scalars['ID']['input'];
};

export type UpdateTagInput = {
  ID: Scalars['ID']['input'];
  colors?: InputMaybe<Array<MTG_Color>>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  ID: Scalars['ID']['output'];
};

export type UserRating = {
  __typename?: 'UserRating';
  user: User;
  value: Scalars['Int']['output'];
};
