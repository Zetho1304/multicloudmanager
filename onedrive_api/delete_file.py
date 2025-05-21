import sys
import requests
import json

if len(sys.argv) < 2:
    print("Usage: delete_file.py <file_id>")
    sys.exit(1)

file_id = sys.argv[1]

with open("onedrive_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens["access_token"]

headers = {
    "Authorization": f"Bearer {access_token}"
}

res = requests.delete(
    f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}",
    headers=headers
)

if res.status_code == 204:
    print("Delete successful")
else:
    print("Delete failed:", res.text)
