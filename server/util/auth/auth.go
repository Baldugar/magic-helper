package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// Role represents an application RBAC role.
type Role string

const (
	// RoleAdmin grants access to admin-only operations.
	RoleAdmin Role = "ADMIN"
	// RoleUser is the baseline authenticated role.
	RoleUser Role = "USER"
)

// User models the identity associated with an incoming request.
type User struct {
	ID    string
	Roles []Role
}

type contextKey string

const userContextKey contextKey = "magic_helper_user"

// ContextWithUser stores the provided user information in the context.
func ContextWithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// UserFromContext extracts user information from the context.
func UserFromContext(ctx context.Context) (*User, bool) {
	user, ok := ctx.Value(userContextKey).(*User)
	return user, ok
}

// HasRole checks if the user has the desired role.
func HasRole(user *User, role Role) bool {
	if user == nil {
		return false
	}
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// RequireRole ensures the user present on ctx carries the requested role.
func RequireRole(ctx context.Context, role Role) error {
	if user, ok := UserFromContext(ctx); !ok || !HasRole(user, role) {
		return gqlerror.Errorf("unauthorized: missing %s role", role)
	}
	return nil
}

const (
	headerUserID    = "X-MH-User-ID"
	headerUserRoles = "X-MH-Roles"
)

// ExtractUserFromRequest derives a User from incoming HTTP headers.
func ExtractUserFromRequest(r *http.Request) *User {
	if r == nil {
		return nil
	}
	userID := strings.TrimSpace(r.Header.Get(headerUserID))
	rawRoles := strings.TrimSpace(r.Header.Get(headerUserRoles))
	if userID == "" && rawRoles == "" {
		return nil
	}

	roles := make([]Role, 0)
	if rawRoles != "" {
		for _, part := range strings.Split(rawRoles, ",") {
			candidate := strings.TrimSpace(strings.ToUpper(part))
			switch candidate {
			case string(RoleAdmin):
				roles = append(roles, RoleAdmin)
			case string(RoleUser):
				roles = append(roles, RoleUser)
			case "":
				continue
			default:
				continue
			}
		}
	}

	if userID == "" {
		userID = "anonymous"
	}

	if len(roles) == 0 {
		roles = append(roles, RoleUser)
	}

	return &User{ID: userID, Roles: roles}
}

// WithUserFromRequest injects user information from headers into the request context.
func WithUserFromRequest(r *http.Request) *http.Request {
	user := ExtractUserFromRequest(r)
	if user == nil {
		return r
	}
	ctx := ContextWithUser(r.Context(), user)
	return r.WithContext(ctx)
}
