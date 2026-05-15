import requests
import os
import io
from pypdf import PdfReader
import json
import google.generativeai as genai

# The direct link to the actual PDF
URL = "https://www.bartlein.com/wp-content/uploads/2021/07/SBList.pdf"
# The baseline text file that gets committed to the repo
PREVIOUS_TEXT_FILE = "bartlein_previous_text.txt"

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

def get_pdf_text():
    """Fetches the PDF binary data and extracts raw text."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    response = requests.get(URL, headers=headers)
    response.raise_for_status()
    
    pdf_file = io.BytesIO(response.content)
    reader = PdfReader(pdf_file)
    
    extracted_text = ""
    for page in reader.pages:
        extracted_text += page.extract_text() + "\n"
        
    return extracted_text

def check_for_updates_and_diff(current_text):
    """Compares current text to previous text and finds added/removed lines."""
    if os.path.exists(PREVIOUS_TEXT_FILE):
        with open(PREVIOUS_TEXT_FILE, 'r', encoding='utf-8') as f:
            old_text = f.read()
    else:
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
        with open(PREVIOUS_TEXT_FILE, 'w', encoding='utf-8') as f:
            f.write(current_text)
            
        return True, diff_message
    
    print("✅ No changes detected in the PDF today.")
    return False, ""

def trigger_ai_analysis(pdf_text, diff_message):
    """Sends the full PDF text to the Gemini API for filtering and analysis."""
    print("Update confirmed! Triggering AI analysis...")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_api_key:
        print("GEMINI_API_KEY not found. Sending basic alert without AI analysis.")
        fallback_alert = (
            f"🚨 **BARTLEIN PDF UPDATE DETECTED!** 🚨\n"
            f"(AI analysis skipped: API key not configured)\n"
            f"[Check the PDF Here]({URL})\n\n"
            f"{diff_message}"
        )
        send_discord_alert(fallback_alert)
        return

    try:
        genai.configure(api_key=gemini_api_key)
        
        # Configure the model to expect a JSON response
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config=generation_config)

        prompt = f"""
        You are an expert apartment hunting data-entry assistant for Rob and Selin in Santa Barbara.
        Your task is to analyze text from a rental listings PDF and convert any suitable listings into a JSON object.

        **CRITICAL CRITERIA:**
        1.  **Unit Type:** Must be a 1-bedroom or 2-bedroom unit. Ignore studios, 3+ bedroom units, and commercial properties.
        2.  **Rent:** Must be under $3,000 per month.

        **OUTPUT FORMAT:**
        -   You MUST respond with a JSON array of objects.
        -   Each object represents one apartment that meets the criteria.
        -   If no units match, you MUST return an empty array: `[]`.

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
          "listingUrl": "{URL}",
          "zillowUrl": "",
          "notes": "string (AI-generated summary of key features, e.g., 'Upstairs unit, new carpet, carport.')",
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

        if found_units:
            print(f"AI found {len(found_units)} new unit(s).")
            # Create a directory for the React app's public assets if it doesn't exist
            os.makedirs("public", exist_ok=True)
            # Write the data to a file the React app can fetch
            with open("public/apartments.json", "w", encoding="utf-8") as f:
                json.dump(found_units, f, indent=2)
            # Create a signal file for the GitHub Actions workflow
            with open("update_found.txt", "w") as f:
                f.write("true")
        else:
            print("AI analysis complete. No new 1-bedroom units found.")

    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        error_alert = f"🚨 **BARTLEIN PDF UPDATE DETECTED!** 🚨\n[AI analysis failed: {e}]\n\n{diff_message}"
        send_discord_alert(error_alert)

if __name__ == "__main__":
    print(f"Scanning {URL}...")
    try:
        pdf_text = get_pdf_text()
        has_changed, diff_message = check_for_updates_and_diff(pdf_text)
        
        if has_changed:
            trigger_ai_analysis(pdf_text, diff_message)
            
    except Exception as e:
        print(f"Error during scrape: {e}")