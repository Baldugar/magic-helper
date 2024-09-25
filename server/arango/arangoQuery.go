package arango

import (
	"strings"
)

type Query struct {
	Query    string
	BindVars map[string]interface{}
}

// NewQuery creates a query for the passed AQL query and an empty set of bind vars
func NewQuery(query string) Query {
	aq := Query{
		Query:    query,
		BindVars: map[string]interface{}{},
	}
	return aq
}

func (aq Query) Uncomment(identifier string) Query {
	aq.Query = strings.ReplaceAll(aq.Query, "// "+identifier+": ", "")
	return aq
}

func (aq Query) AddBindVar(identifier string, value interface{}) Query {
	aq.BindVars[identifier] = value
	return aq
}
