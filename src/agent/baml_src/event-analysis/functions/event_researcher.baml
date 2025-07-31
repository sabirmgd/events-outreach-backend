function ResearchEvents(location: string, year: int, topic: string) -> EventWithDetails[] {
  client Claude3
  
  prompt #"
    You are an expert event researcher. Search for {{topic}} events in {{location}} for the year {{year}}.
    
    Find major conferences, summits, and expos related to {{topic}}.
    
    For each event found, extract:
    - Event details (name, dates, venue, website)
    - List of sponsors with their company information
    - List of speakers with their professional details
    
    Return structured data following the schema.
    Only include verified information. Use null for unknown fields.
  "#
}

function ExtractEvents(searchResults: string) -> EventWithDetails[] {
  client Claude3
  
  prompt #"
    You are an event data extraction specialist. Extract structured event information from the following search results:
    
    {{searchResults}}
    
    Return a JSON array where each element has this EXACT structure:
    
    [
      {
        "event": {
          "name": "Event Name",
          "year": 2025,
          "dates": "Date range or specific date",
          "venue": "Venue name",
          "city": "City name",
          "country": "Country",
          "industry": "Industry/topic",
          "attendeeCount": 10000,
          "description": "Event description",
          "website": "https://website.com",
          "organizer": "Organizer name",
          "type": "conference"
        },
        "sponsors": [
          {
            "company": {
              "name": "Company Name",
              "website": "https://company.com",
              "industry": "Industry"
            },
            "sponsorshipTier": "Gold"
          }
        ],
        "speakers": [
          {
            "name": "Speaker Name",
            "title": "Job Title",
            "company": "Company Name"
          }
        ]
      }
    ]
    
    IMPORTANT: 
    - Return ONLY the JSON array, no wrapper objects or extra keys
    - Do NOT wrap the array in {"events": [...]}
    - Use null for unknown fields, not empty strings
    - Only extract events that are actually mentioned in the search results
    - Ensure each event has at least a name and basic details
  "#
}