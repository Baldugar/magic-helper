#!/bin/bash

# Copiar el archivo original a una copia temporal
cp gqlgen.yml gqlgen_temp.yml

# Crear un archivo temporal para almacenar las rutas de los archivos .graphqls
TEMP_FILE=$(mktemp)

# Encontrar todos los archivos .graphqls en el directorio graphql pero excluyendo .history y sus subcarpetas
find ../graphql -name "*.graphqls" ! -path "../graphql/.history*" > $TEMP_FILE

# Generar el texto de inserción para el archivo YAML
INSERT_TEXT="schema:\n"
while read -r line; do
    INSERT_TEXT="${INSERT_TEXT}  - $line\n"
done < $TEMP_FILE

# Usar sed para insertar el texto en gqlgen_temp.yml
sed -i "/# Schema routes go here:/a $INSERT_TEXT" gqlgen_temp.yml

# Limpiar archivo temporal con rutas
rm $TEMP_FILE

# Asegurarse de que se tienen todas las dependencias
go get github.com/99designs/gqlgen@v0.17.39

# Ejecutar gqlgen con la configuración temporal
go run github.com/99designs/gqlgen generate --config gqlgen_temp.yml

# Eliminar la copia temporal de configuración
rm gqlgen_temp.yml
