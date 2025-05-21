import requests
import json

# Load token
with open("onedrive_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens["access_token"]
headers = {
    "Authorization": f"Bearer {access_token}"
}

# List files in root directory
url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
res = requests.get(url, headers=headers)

if res.status_code != 200:
    print(json.dumps({"error": res.text}))
    exit(1)

files = res.json().get("value", [])

# Filter only real files (not folders)
simplified = [
    {
        "id": f["id"],
        "name": f["name"],
        "webUrl": f.get("webUrl")
    }
    for f in files if f.get("file")
]

print(json.dumps(simplified))
