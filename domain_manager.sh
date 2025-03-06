#!/bin/bash

DB_FILE="domains.db"

# Ensure database file exists
if [[ ! -f "$DB_FILE" ]]; then
    echo "Creating database..."
    sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS domains (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE);"
fi

# Function to format domains into a SQL statement
format_domains_sql() {
    local input=("$@")
    local sql=""
    for domain in "${input[@]}"; do
        sql+="INSERT OR IGNORE INTO domains (name) VALUES ('$domain');"
    done
    echo "$sql"
}

# Function to add domains
add_domains() {
    if [[ -f "$1" ]]; then
        mapfile -t DOMAINS < "$1"
    else
        IFS=',' read -r -a DOMAINS <<< "$*"
    fi

    SQL_QUERY=$(format_domains_sql "${DOMAINS[@]}")
    echo "$SQL_QUERY" | sqlite3 "$DB_FILE"
    echo "Domains added successfully!"
}

# Function to delete domains
delete_domains() {
    if [[ -f "$1" ]]; then
        mapfile -t DOMAINS < "$1"
    else
        IFS=',' read -r -a DOMAINS <<< "$*"
    fi

    for domain in "${DOMAINS[@]}"; do
        echo "DELETE FROM domains WHERE name='$domain';" | sqlite3 "$DB_FILE"
    done
    echo "Domains deleted successfully!"
}

# Function to list all domains
list_domains() {
    echo "Stored Domains:"
    sqlite3 "$DB_FILE" "SELECT name FROM domains;"
}

# Handling commands
case "$1" in
    add)
        shift
        add_domains "$@"
        ;;
    delete)
        shift
        delete_domains "$@"
        ;;
    list)
        list_domains
        ;;
    *)
        echo "Usage: $0 {add|delete|list} [filename or domains]"
        ;;
esac
