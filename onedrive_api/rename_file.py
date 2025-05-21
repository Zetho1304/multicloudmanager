import sys
import requests
import json

if len(sys.argv) < 3:
    print("Usage: rename_file.py <file_id> <new_name>")
    sys.exit(1)

file_id = sys.argv[1]
new_name = sys.argv[2]

with open("onedrive_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens["access_token"]

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

res = requests.patch(
    f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}",
    headers=headers,
    json={"name": new_name}
)

if res.status_code in (200, 201):
    print("Rename successful")
else:
    print("Rename failed:", res.text)
