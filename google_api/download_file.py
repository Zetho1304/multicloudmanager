import sys
import requests
import json

if len(sys.argv) < 3:
    print("Usage: download_file.py <file_id> <filename>")
    sys.exit(1)

file_id = sys.argv[1]
filename = sys.argv[2]

# Load access token
with open("google_api/credentials.json") as f:
    tokens = json.load(f)

access_token = tokens.get("access_token")

headers = {
    "Authorization": f"Bearer {access_token}"
}

res = requests.get(
    f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
    headers=headers,
    stream=True
)

if res.status_code != 200:
    print("Download failed:", res.text)
    sys.exit(1)

with open(f"downloads/{filename}", "wb") as f:
    for chunk in res.iter_content(1024):
        f.write(chunk)

print("Download complete")
