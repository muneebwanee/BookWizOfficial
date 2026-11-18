"""Shared Android version metadata for the APK and Google Play App Bundle."""
import json,os,re

def version_info(root):
    name=os.environ.get('BOOKWIZ_VERSION_NAME') or json.loads((root/'package.json').read_text())['version']
    code=os.environ.get('BOOKWIZ_VERSION_CODE','14')
    if not re.fullmatch(r'[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}',name):
        raise ValueError('BOOKWIZ_VERSION_NAME must be a short version identifier.')
    if not code.isdigit() or not 1<=int(code)<=2100000000:
        raise ValueError('BOOKWIZ_VERSION_CODE must be between 1 and 2100000000.')
    return str(int(code)),name
