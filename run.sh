#!/usr/bin/env bash
# AssetIQ - One-Click Launch Script for macOS / Linux

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "  AssetIQ: Smart Inventory & Asset Management System"
echo "============================================================"

# Check if .venv exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Ensuring required packages are installed..."
pip install -r requirements.txt -q

echo "Launching AssetIQ Full-Stack Application..."
python main.py
