import re
import json
from datetime import datetime

# Define the target names (and their common aliases in the chat)
TARGET_NAMES = {
    "John King": "John",
    "Donald Forrester": "Donald",
    "Ian Wakeman": "Ian",
    "Steve Macaulay": "Steve",
    "Fake Steve": "Steve",
    "Peter Hamilton": "Pete"
}

def extract_wordle_data(filepath):
    dataset = []
    
    # Regex patterns
    # Matches: "21/06/2022, 10:10 - John King:"
    header_pattern = re.compile(r"^(\d{2}/\d{2}/\d{4}), \d{2}:\d{2} - (.*?):")
    # Matches: "Wordle 367 5/6" or "Wordle 1,234 X/6"
    wordle_pattern = re.compile(r"Wordle [\d,]+ ([1-6X])/6")
    
    current_date = None
    current_name = None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            # Check if the line is a new message header
            header_match = header_pattern.match(line)
            if header_match:
                raw_date = header_match.group(1)
                raw_name = header_match.group(2)
                
                # Format date to YYYY-MM-DD
                current_date = datetime.strptime(raw_date, "%d/%m/%Y").strftime("%Y-%m-%d")
                
                # Map to target name if valid, otherwise set to None
                current_name = TARGET_NAMES.get(raw_name)
                
                # Check if the header line itself contains the Wordle score
                if current_name:
                    wordle_match = wordle_pattern.search(line)
                    if wordle_match:
                        score_str = wordle_match.group(1)
                        score = score_str if score_str == 'X' else int(score_str)
                        
                        dataset.append({
                            "date": current_date,
                            "name": current_name,
                            "score": score
                        })
                        current_name = None
            
            # If we have a valid tracked user, look for a Wordle score in their message
            elif current_name:
                wordle_match = wordle_pattern.search(line)
                if wordle_match:
                    score_str = wordle_match.group(1)
                    score = score_str if score_str == 'X' else int(score_str)
                    
                    dataset.append({
                        "date": current_date,
                        "name": current_name,
                        "score": score
                    })
                    # Reset name so we don't double-count if they paste the score twice
                    current_name = None 
                    
    return dataset

# Run the extraction
data = extract_wordle_data("WhatsApp Chat with Fawcett Wordlers.txt")

# Save to a JSON file
with open("wordle_scores.json", "w", encoding="utf-8") as out_file:
    json.dump(data, out_file, indent=2)

print(f"Successfully extracted {len(data)} Wordle scores!")