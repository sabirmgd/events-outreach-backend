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