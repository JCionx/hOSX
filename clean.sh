#!/bin/bash

read -p "Remove non-core project files? (Y/n): " choice

if [[ "$choice" =~ ^[Yy]$ || "$choice" == "" ]]; then
  rm -rf data/*
  rm -rf .venv/
  rm -rf __pycache__/
  rm -rf flask_session/
  rm -rf database.db
  find . -name '.DS_Store' -type f -delete
else
  echo "Canceled."
fi