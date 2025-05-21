import sys
import requests
import json
import os

if len(sys.argv) < 3:
    print("Usage: upload_file.py <path> <original_name>")
    sys.exit(1)

file_path = sys.argv[1]
original_name = sys.argv[2]

# Load access token
with open("google_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens.get("access_token")

# Upload using multipart (metadata + file)
metadata = {
    "name": original_name,
    "parents": ["root"]
}

files = {
    "data": ('metadata', json.dumps(metadata), 'application/json; charset=UTF-8'),
    "file": (original_name, open(file_path, "rb"))
}

headers = {
    "Authorization": f"Bearer {access_token}"
}

res = requests.post(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    headers=headers,
    files=files
)

if res.status_code in (200, 201):
    print("Upload successful")
else:
    print("Upload failed:", res.text)
