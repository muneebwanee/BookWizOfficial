#!/usr/bin/env python3
"""Install BookWiz for an Agent Skills host. BWNCL 1.0."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / 'skills/bookwiz/scripts/install_skill.py'), run_name='__main__')
