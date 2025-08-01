function ExtractEvents(searchResults: string) -> EventWithDetails[] {
  client Claude3
  
  prompt #"
    You are an expert at extracting structured event information from search results.
    
    Analyze the following search results and extract all events found:
    {{searchResults}}
    
    For each event, extract:
    - Event details (name, year, dates, venue, city, country, industry)
    - List of sponsors with their company information
    - List of speakers with their professional details
    
    Follow the EventWithDetails schema exactly.
    Only include verified information. Use null for unknown fields.
    
    IMPORTANT: Return an array of EventWithDetails objects, even if only one event is found.
  "#
}