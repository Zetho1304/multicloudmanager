import sys
import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()
CLIENT_ID = os.getenv("ONEDRIVE_CLIENT_ID")
CLIENT_SECRET = os.getenv("ONEDRIVE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/auth/onedrive/callback"

if len(sys.argv) < 2:
    print("No auth code provided")
    sys.exit(1)

code = sys.argv[1]

res = requests.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data={
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "code": code,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code"
})

if res.status_code != 200:
    print("ERROR:", res.text)
    sys.exit(1)

tokens = res.json()

with open("onedrive_api/credentials.json", "w") as f:
    json.dump(tokens, f)

print("Tokens saved")
