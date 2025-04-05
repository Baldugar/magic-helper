#!/bin/bash

# Copy the original file to a temporary copy
cp gqlgen.yml gqlgen_temp.yml

# Create a temporary file to store the paths of .graphqls files
TEMP_FILE=$(mktemp)

# Find all .graphqls files in the graphql directory but exclude .history and its subdirectories
find ../graphql -name "*.graphqls" ! -path "../graphql/.history*" ! -name "fragment.graphqls" > $TEMP_FILE

printf "Found the following .graphqls files:\n"
cat $TEMP_FILE

# Generate insertion text for the YAML file
INSERT_TEXT="schema:\n"
while read -r line; do
    INSERT_TEXT="${INSERT_TEXT}  - $line\n"
done < $TEMP_FILE

printf "# Schema routes go here:\n" >> gqlgen_temp.yml
printf "$INSERT_TEXT" >> gqlgen_temp.yml
cat gqlgen_temp.yml

# Ensure all dependencies are available
go get github.com/99designs/gqlgen@v0.17.66

# Execute gqlgen with the temporary configuration
go run github.com/99designs/gqlgen@v0.17.66 generate --config gqlgen_temp.yml

printf "Regeneration complete.\n"

# Remove the temporary configuration copy
rm $TEMP_FILE
rm gqlgen_temp.yml
