import requests
import os
import io
from pypdf import PdfReader
import time
import json
from bs4 import BeautifulSoup
import google.generativeai as genai

# The default URL to scrape. This can be overridden by the SCRAPE_URL environment variable.
DEFAULT_URL = "https://www.bartlein.com/wp-content/uploads/2021/07/SBList.pdf"

# The file containing URLs for the daily scheduled scrape.
DAILY_URLS_FILE = "daily_scrape_urls.txt"

# Scoring rules for the AI to follow, based on the v9.0 Scorecard
SCORING_RULES = {
    "neighborhood": "Downtown (25), Oak Park (20), San Roque (15), Other (10). Infer from address.",
    "bathroom": "Hallway/living area access (25), Inside the bedroom (0). If layout is unknown, use -1.",
    "sqft": "700+ (25), 650-699 (20), 600-649 (15), 550-599 (10), <550 (0). If unknown, use 0.",
    "parking": "Assume 20 (Garage/Carport/Assigned) as this is a minimum requirement for Bartlein listings.",
    "hospital": "Default to 10. User will verify exact e-bike time.",
    "flooring": "Hardwood/Laminate/Tile (10), Carpet (5). If unknown, default to 10.",
    "storage": "Exterior lockers or garage (10), None (0). If unknown, use 0.",
    "amtrak": "Default to 10. User will verify exact e-bike time.",
    "laundry": "In-Unit (10), On-Site Shared (0). If unknown, use 0.",
    "dishwasher": "Yes (5), No (0). If unknown, use 0."
}

def send_discord_alert(message):
    webhook_url = os.environ.get("WEBHOOK_URL")
    if not webhook_url:
        print("No Webhook URL found. Skipping Discord alert.")
        return

    # Discord has a 2000 character limit per message. Truncate if necessary.
    if len(message) > 1999:
        message = message[:1900] + "\n\n... [Message truncated due to Discord length limits]"

    payload = {"content": message}
    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        print("Discord alert fired successfully!")
    except Exception as e:
        print(f"Failed to send Discord alert: {e}")

def get_commute_times(address, api_key):
    """Fetches commute times from Google Maps Directions API."""
    base_url = "https://maps.googleapis.com/maps/api/directions/json"
    origin = f"{address}, Santa Barbara, CA"
    commute_times = {
        "driveHospital": "", "bikeEastBeach": "", "bikeArroyoBurro": "", "bikeAmtrak": ""
    }
    destinations = {
        "driveHospital": ("Santa Barbara Cottage Hospital", "driving"),
        "bikeEastBeach": ("East Beach, Santa Barbara, CA", "bicycling"),
        "bikeArroyoBurro": ("Arroyo Burro Beach County Park", "bicycling"),
        "bikeAmtrak": ("Santa Barbara Amtrak Station", "bicycling"),
    }

    for key, (destination, mode) in destinations.items():
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "key": api_key
        }
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            data = response.json()
            if data["status"] == "OK":
                duration = data["routes"][0]["legs"][0]["duration"]["text"]
                commute_times[key] = duration.replace("mins", "min")
            else:
                print(f"Maps API Warning for '{address}' to '{destination}': {data['status']}")
            time.sleep(0.2) # Be a good citizen and avoid hitting API rate limits
        except Exception as e:
            print(f"Error fetching directions for '{address}': {e}")
    return commute_times

def _extract_text_from_pdf(pdf_content):
    """Extracts raw text from PDF binary data."""
    pdf_file = io.BytesIO(pdf_content)
    reader = PdfReader(pdf_file)
    
    extracted_text = ""
    for page in reader.pages:
        extracted_text += page.extract_text() + "\n"
        
    return extracted_text

def _extract_text_from_html(html_content):
    """Extracts clean, readable text from HTML content."""
    soup = BeautifulSoup(html_content, 'lxml')
    # Attempt to find the main content area, falling back to the body
    main_content = soup.find('main') or soup.find('body')
    if main_content:
        return main_content.get_text(separator='\n', strip=True)
    return ""

def get_text_from_url(url):
    """Fetches content from a URL and extracts text based on its type (PDF or HTML)."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    print(f"Fetching content from: {url}")
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    content_type = response.headers.get('Content-Type', '').lower()
    if 'application/pdf' in content_type:
        print("PDF content type detected.")
        return _extract_text_from_pdf(response.content)
    elif 'text/html' in content_type:
        print("HTML content type detected.")
        return _extract_text_from_html(response.content)
    else:
        print(f"Warning: Unhandled content type '{content_type}'. Attempting to parse as plain text.")
        return response.text

def get_baseline_filename(url):
    """Creates a unique, safe filename for a URL's baseline text using a hash."""
    return f"baseline_{hash(url)}.txt"

def check_for_updates_and_diff(current_text, url):
    """Compares current text to previous text and finds added/removed lines."""
    baseline_file = get_baseline_filename(url)

    if os.path.exists(baseline_file):
        with open(baseline_file, 'r', encoding='utf-8') as f:
            old_text = f.read()
    else:
        print(f"No baseline file found at '{baseline_file}'. Creating a new one.")
        old_text = ""

    if current_text != old_text:
        print("🚨 PDF Update detected! Calculating differences...")
        
        diff_message = ""
        # Only calculate a diff if we have an older version to compare against
        if old_text:
            old_lines = set([line.strip() for line in old_text.splitlines() if line.strip()])
            current_lines = set([line.strip() for line in current_text.splitlines() if line.strip()])

            added = current_lines - old_lines
            removed = old_lines - current_lines

            if added:
                diff_message += "\n**➕ NEW TEXT DETECTED:**\n"
                for line in list(added)[:10]: # Limit to first 10 changes to avoid spam
                    diff_message += f"> {line}\n"
            
            if removed:
                diff_message += "\n**➖ TEXT REMOVED:**\n"
                for line in list(removed)[:10]:
                    diff_message += f"> {line}\n"
        else:
            diff_message = "\n*First run complete. Baseline established for tomorrow.*"

        # Save the new text to become the baseline for tomorrow
        with open(baseline_file, 'w', encoding='utf-8') as f:
            f.write(current_text)
            
        return True, diff_message
    
    print("✅ No changes detected for this URL.")
    return False, ""

def trigger_ai_analysis(pdf_text, diff_message, url):
    """Sends the full PDF text to the Gemini API for filtering and analysis."""
    print("Update confirmed! Triggering AI analysis...")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_api_key:
        print("GEMINI_API_KEY not found. Sending basic alert without AI analysis.")
        fallback_alert = (
            f"🚨 **BARTLEIN PDF UPDATE DETECTED!** 🚨\n"
            f"(AI analysis skipped: API key not configured)\n"
            f"[Check the PDF Here]({url})\n\n"
            f"{diff_message}"
        )
        send_discord_alert(fallback_alert)
        return

    try:
        genai.configure(api_key=gemini_api_key)
        
        # Configure the model to expect a JSON response
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-flash-latest', generation_config=generation_config)

        prompt = f"""
        You are an expert apartment hunting data-entry assistant for Rob and Selin in Santa Barbara.
        Your task is to analyze text from a rental listings source (PDF or webpage) and convert ALL residential listings into a JSON object.

        **SCORING AND CRITERIA:**
        -   **Guillotine Rule:** If a unit is NOT a 1-bedroom or 2-bedroom, OR if the rent is over $3,000, you MUST assign a 'guillotine' score of -1000. Otherwise, 'guillotine' is 0. This is the most important rule.
        -   Process ALL residential listings (studios, 3-bedrooms, etc.), but apply the guillotine rule strictly. Ignore commercial-only listings.

        **OUTPUT FORMAT:**
        -   You MUST respond with a JSON array of objects.
        -   Each object represents one apartment.
        -   If there are no residential listings at all, you MUST return an empty array: `[]`.

        **SCORING RULES (Use these to assign numeric values):**
        -   neighborhood: {SCORING_RULES['neighborhood']}
        -   bathroom: {SCORING_RULES['bathroom']}
        -   sqft: {SCORING_RULES['sqft']}
        -   parking: {SCORING_RULES['parking']}
        -   hospital: {SCORING_RULES['hospital']}
        -   flooring: {SCORING_RULES['flooring']}
        -   storage: {SCORING_RULES['storage']}
        -   amtrak: {SCORING_RULES['amtrak']}
        -   laundry: {SCORING_RULES['laundry']}
        -   dishwasher: {SCORING_RULES['dishwasher']}

        **JSON OBJECT STRUCTURE FOR EACH APARTMENT:**
        ```json
        {{
          "id": integer (generate a unique id, e.g., from the address numbers),
          "address": "string",
          "rent": integer,
          "manager": "Bartlein",
          "listingUrl": "{url}",
          "zillowUrl": "",
          "notes": "string (AI-generated summary of key features, e.g., 'Upstairs unit, new carpet, carport.')",
          "guillotine": integer,
          "neighborhood": integer, "bathroom": integer, "sqft": integer, "parking": 20, "hospital": 10,
          "flooring": integer, "storage": integer, "amtrak": 10, "laundry": integer, "dishwasher": integer,
          "driveHospital": "", "bikeEastBeach": "", "bikeArroyoBurro": "", "bikeAmtrak": ""
        }}
        ```

        **PDF TEXT TO ANALYZE:**
        ---
        {pdf_text}
        ---
        """

        response = model.generate_content(prompt)
        found_units = json.loads(response.text)
        maps_api_key = os.environ.get("MAPS_API_KEY")

        # Create a result summary file for the UI to poll.
        # This is created immediately after the AI response, before other processing.
        os.makedirs("public", exist_ok=True)
        scrape_result = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "added_units": [{"address": unit.get("address", "Unknown Address")} for unit in found_units]
        }
        with open("public/scrape_result.json", "w", encoding="utf-8") as f:
            json.dump(scrape_result, f, indent=2)

        if found_units:
            print(f"AI found {len(found_units)} new unit(s).")

            if not maps_api_key:
                print("MAPS_API_KEY not found. Skipping commute time lookup.")
            else:
                print("Fetching commute times from Google Maps...")
                for unit in found_units:
                    times = get_commute_times(unit["address"], maps_api_key)
                    unit.update(times)
                    print(f"  -> Fetched times for {unit['address']}")

            # Create a directory for the React app's public assets if it doesn't exist
            os.makedirs("public", exist_ok=True)
            # Write the data to a file the React app can fetch
            with open("public/apartments.json", "w", encoding="utf-8") as f:
                json.dump(found_units, f, indent=2)
            # Create a signal file for the GitHub Actions workflow
            with open("update_found.txt", "w") as f:
                f.write("true")
        else:
            print("AI analysis complete. No new units found matching criteria.")
            # Write an empty apartments.json to clear the list from the previous day
            with open("public/apartments.json", "w", encoding="utf-8") as f:
                json.dump([], f)
            # Create a signal file for the GitHub Actions workflow to deploy the empty list
            with open("update_found.txt", "w") as f:
                f.write("true")
            pages_url = os.environ.get("PAGES_URL")
            no_units_alert = (
                f"✅ **Bartlein PDF Updated, But No New Units Found**\n\n"
                f"The AI analyzed the latest PDF but found no new 1 or 2-bedroom units under $3,000.\n"
            )
            if pages_url:
                no_units_alert += f"\n[View the live tracker here]({pages_url})"
            
            no_units_alert += f"\n\n[Check the PDF Here]({url})\n{diff_message}"

            send_discord_alert(no_units_alert)

    except Exception as e:
        print(f"Error during Gemini API call: {e}\nResponse text: {response.text if 'response' in locals() else 'N/A'}")
        error_alert = f"🚨 **BARTLEIN PDF UPDATE DETECTED!** 🚨\n[AI analysis failed: {e}]\n\n{diff_message}"
        send_discord_alert(error_alert)

if __name__ == "__main__":
    on_demand_url = os.environ.get("SCRAPE_URL")
    is_on_demand = bool(on_demand_url and on_demand_url != DEFAULT_URL)

    urls_to_scrape = []
    if is_on_demand:
        urls_to_scrape.append(on_demand_url)
        print(f"🚀 Performing on-demand scrape for: {on_demand_url}")
    else:
        print("⏰ Performing daily scheduled scrape...")
        if os.path.exists(DAILY_URLS_FILE):
            with open(DAILY_URLS_FILE, 'r', encoding='utf-8') as f:
                urls_to_scrape = [line.strip() for line in f if line.strip()]
        if not urls_to_scrape:
            urls_to_scrape.append(DEFAULT_URL) # Fallback to default
        print(f"Found {len(urls_to_scrape)} URL(s) for daily scrape.")

    any_updates_found_today = False
    for url in urls_to_scrape:
        print(f"\n--- Processing URL: {url} ---")
        try:
            content_text = get_text_from_url(url)
            has_changed, diff_message = check_for_updates_and_diff(content_text, url)
            if has_changed:
                any_updates_found_today = True
                trigger_ai_analysis(content_text, diff_message, url)
        except Exception as e:
            print(f"Error during scrape for {url}: {e}")

    if not is_on_demand and not any_updates_found_today:
        pages_url = os.environ.get("PAGES_URL")
        no_change_alert = "✅ **Daily Scrape Complete**\nNo changes were detected across all monitored URLs today."
        if pages_url:
            no_change_alert += f"\nThe live tracker is unchanged: {pages_url}"
        send_discord_alert(no_change_alert)