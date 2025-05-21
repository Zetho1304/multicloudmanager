import sys
import json
import requests

if len(sys.argv) < 3:
    print("Usage: rename_file.py <file_id> <new_name>")
    sys.exit(1)

file_id = sys.argv[1]
new_name = sys.argv[2]

with open("google_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens["access_token"]

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

res = requests.patch(
    f"https://www.googleapis.com/drive/v3/files/{file_id}",
    headers=headers,
    data=json.dumps({"name": new_name})
)

if res.status_code == 200:
    print("Rename successful")
else:
    print("Rename failed:", res.text)
