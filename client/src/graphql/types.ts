export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never }
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string }
    String: { input: string; output: string }
    Boolean: { input: boolean; output: boolean }
    Int: { input: number; output: number }
    Float: { input: number; output: number }
}

export type MTGA_Card = MTGA_CommonFields & {
    __typename?: 'MTGA_Card'
    ID: Scalars['ID']['output']
    cardFaces?: Maybe<Array<MTGA_CardFace>>
    cmc: Scalars['Int']['output']
    colorIdentity: Array<MTGA_Color>
    colors?: Maybe<Array<MTGA_Color>>
    description?: Maybe<Scalars['String']['output']>
    flavorText?: Maybe<Scalars['String']['output']>
    image?: Maybe<MTGA_Image>
    loyalty?: Maybe<Scalars['String']['output']>
    manaCost?: Maybe<Scalars['String']['output']>
    name: Scalars['String']['output']
    power?: Maybe<Scalars['String']['output']>
    producedMana?: Maybe<Array<MTGA_Color>>
    rarity: MTGA_Rarity
    set: Scalars['String']['output']
    setName: Scalars['String']['output']
    toughness?: Maybe<Scalars['String']['output']>
    typeLine: Scalars['String']['output']
}

export type MTGA_CardFace = MTGA_CommonFields & {
    __typename?: 'MTGA_CardFace'
    colors?: Maybe<Array<MTGA_Color>>
    description: Scalars['String']['output']
    flavorText?: Maybe<Scalars['String']['output']>
    image?: Maybe<MTGA_Image>
    loyalty?: Maybe<Scalars['String']['output']>
    manaCost: Scalars['String']['output']
    name: Scalars['String']['output']
    power?: Maybe<Scalars['String']['output']>
    producedMana?: Maybe<Array<MTGA_Color>>
    toughness?: Maybe<Scalars['String']['output']>
    typeLine: Scalars['String']['output']
}

export enum MTGA_Color {
    B = 'B',
    C = 'C',
    G = 'G',
    R = 'R',
    U = 'U',
    W = 'W',
}

export type MTGA_CommonFields = {
    colors?: Maybe<Array<MTGA_Color>>
    flavorText?: Maybe<Scalars['String']['output']>
    image?: Maybe<MTGA_Image>
    loyalty?: Maybe<Scalars['String']['output']>
    name: Scalars['String']['output']
    power?: Maybe<Scalars['String']['output']>
    producedMana?: Maybe<Array<MTGA_Color>>
    toughness?: Maybe<Scalars['String']['output']>
    typeLine: Scalars['String']['output']
}

export type MTGA_Image = {
    __typename?: 'MTGA_Image'
    artCrop: Scalars['String']['output']
    borderCrop: Scalars['String']['output']
    large: Scalars['String']['output']
    normal: Scalars['String']['output']
    png: Scalars['String']['output']
    small: Scalars['String']['output']
}

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
    TRANSFORM = 'TRANSFORM',
}

export enum MTGA_Rarity {
    COMMON = 'COMMON',
    MYTHIC = 'MYTHIC',
    RARE = 'RARE',
    UNCOMMON = 'UNCOMMON',
}

export type Query = {
    __typename?: 'Query'
    getMTGACards: Array<MTGA_Card>
}

export type Response = {
    __typename?: 'Response'
    message?: Maybe<Scalars['String']['output']>
    status: Scalars['Boolean']['output']
}
