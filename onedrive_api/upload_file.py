import sys
import os
import json
import requests

if len(sys.argv) < 3:
    print("Usage: upload_file.py <filepath> <filename>")
    sys.exit(1)

file_path = sys.argv[1]
filename = sys.argv[2]

with open("onedrive_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens["access_token"]

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/octet-stream"
}

with open(file_path, 'rb') as f:
    data = f.read()

upload_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{filename}:/content"

res = requests.put(upload_url, headers=headers, data=data)

if res.status_code in (200, 201):
    print("Upload successful")
else:
    print("Upload failed:", res.text)
