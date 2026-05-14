import requests
from bs4 import BeautifulSoup
import hashlib
import os

# Target URL for the Bartlein rentals page
URL = "https://bartlein.com/rentals.html"
# Local file to store the hash of the previous state
HASH_FILE = "bartlein_hash.txt"

def get_page_content():
    """Fetches the HTML content from the target URL."""
    # Using a standard user agent to avoid basic blocking
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    response = requests.get(URL, headers=headers)
    response.raise_for_status()
    return response.text

def extract_listings_text(html_content):
    """
    Extracts only the relevant text containing listings.
    This prevents false positives from changing timestamps, ads, or headers.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Ideally, you'd target the specific table or div holding the rentals.
    # For Bartlein, we'll grab the body text as a baseline.
    body = soup.body
    if body:
        # Strip out excess whitespace to create a clean string to hash
        clean_text = " ".join(body.stripped_strings)
        return clean_text
    return html_content

def check_for_updates(current_text):
    """Hashes the content and compares it to the previous run."""
    current_hash = hashlib.md5(current_text.encode('utf-8')).hexdigest()
    
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, 'r') as f:
            old_hash = f.read().strip()
    else:
        old_hash = None

    if current_hash != old_hash:
        print("🚨 Update detected! Saving new hash.")
        # Save the new hash so we don't trigger again until the next change
        with open(HASH_FILE, 'w') as f:
            f.write(current_hash)
        return True
    
    print("✅ No changes detected today.")
    return False

def trigger_ai_analysis(html_content):
    """Placeholder for the Gemini API call and Webhook alerts."""
    print("Initiating Gemini API call with the Master Prompt...")
    # TODO: 1. Send the `html_content` and "Master Prompt" to the Gemini API
    # TODO: 2. Parse the JSON response from Gemini
    # TODO: 3. Send a POST request to a Slack/Discord Webhook with the results

if __name__ == "__main__":
    print(f"Scanning {URL}...")
    
    try:
        raw_html = get_page_content()
        listings_text = extract_listings_text(raw_html)
        
        if check_for_updates(listings_text):
            trigger_ai_analysis(listings_text)
            
    except Exception as e:
        print(f"Error during scrape: {e}")