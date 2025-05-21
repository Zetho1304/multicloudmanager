import json
import requests

# Load saved token
with open("google_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens.get("access_token")
headers = {
    "Authorization": f"Bearer {access_token}"
}

params = {
    "q": "'root' in parents and trashed=false",
    "fields": "files(id,name,mimeType,webViewLink)"
}

res = requests.get("https://www.googleapis.com/drive/v3/files", headers=headers, params=params)

if res.status_code != 200:
    print(json.dumps({ "error": res.text }))
    exit(1)

files = res.json().get("files", [])

# Filter out folders and return only needed info
simplified = [
    {
        "id": f["id"],
        "name": f["name"],
        "webViewLink": f.get("webViewLink")
    }
    for f in files if f.get("mimeType") != "application/vnd.google-apps.folder"
]

print(json.dumps(simplified))
