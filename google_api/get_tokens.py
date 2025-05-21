import sys
import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()
# Replace with your actual values or load from environment/config
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/auth/google/callback"

if len(sys.argv) < 2:
    print("No auth code provided")
    sys.exit(1)

code = sys.argv[1]

# Exchange auth code for access token
res = requests.post("https://oauth2.googleapis.com/token", data={
    "code": code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code"
})

if res.status_code != 200:
    print("ERROR:", res.text)
    sys.exit(1)

tokens = res.json()

# Save tokens to file
with open("google_api/credentials.json", "w") as f:
    json.dump(tokens, f)

print("Tokens saved")
