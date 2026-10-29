#!/usr/bin/env python3
"""
AssetIQ - Smart Inventory & Asset Management System
Root Launcher Script
"""
import sys
import subprocess
import uvicorn

def main():
    print("=" * 60)
    print("  AssetIQ: Smart Inventory and Asset Management System")
    print("  College Laboratory & Institutional Asset Portal")
    print("=" * 60)
    print("Starting server on http://127.0.0.1:8000 ...")
    print("Open your browser and navigate to: http://127.0.0.1:8000")
    print("API Documentation available at:   http://127.0.0.1:8000/docs")
    print("=" * 60)
    
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )

if __name__ == "__main__":
    main()
