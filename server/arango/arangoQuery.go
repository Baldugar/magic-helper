package arango

import (
	"strings"
)

// Query represents an AQL query string along with its bind variables.
// Methods return a modified copy to keep usage ergonomic.
type Query struct {
	Query    string
	BindVars map[string]any
}

// NewQuery creates a Query for the provided AQL string with an empty set of bind variables.
func NewQuery(query string) Query {
	aq := Query{
		Query:    query,
		BindVars: map[string]any{},
	}
	return aq
}

// Uncomment removes the line-comment marker for the given identifier in the AQL,
// enabling optional clauses written as "// <identifier>: <clause>".
func (aq Query) Uncomment(identifier string) Query {
	aq.Query = strings.ReplaceAll(aq.Query, "// "+identifier+": ", "")
	return aq
}

// AddBindVar sets a bind variable value on the query and returns the updated copy.
func (aq Query) AddBindVar(identifier string, value any) Query {
	aq.BindVars[identifier] = value
	return aq
}
