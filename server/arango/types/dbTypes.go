package types

import "magic-helper/graph/model"

type UserDB struct {
	Username       string       `json:"username"`
	HashedPassword string       `json:"hashedPassword"`
	ID             string       `json:"_key"`
	Roles          []model.Role `json:"roles"`
	CreatedAt      int          `json:"createdAt"`
	UpdatedAt      int          `json:"updatedAt"`
	DeletedAt      *int         `json:"deletedAt,omitempty"`
}
