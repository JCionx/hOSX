#!/bin/bash

DATABASE="database.db"
SQL_QUERY="CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, username TEXT NOT NULL, hash TEXT NOT NULL);"
VENV_DIR=".venv"
PYTHON_BINARY="python3.12" # As of writing this, msgspec was not yet updated to the latest Python 3.13, so I'm using Python 3.12 (https://github.com/jcrist/msgspec/issues/764)

# Create the database
sqlite3 "$DATABASE" "$SQL_QUERY"

# Create a virtual environment
$PYTHON_BINARY -m venv "$VENV_DIR"

# Activate the virtual environment
source "$VENV_DIR/bin/activate"

# Install Python dependencies
$PYTHON_BINARY -m pip install -r requirements.txt

echo "Setup finished!"

echo "To start the server you need to execute these commands:"
echo " - source .venv/bin/activate"
echo " - python3.12 app.py"