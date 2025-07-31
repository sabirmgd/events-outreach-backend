function ExtractSponsors(searchResults: string) -> Company[] {
  client Claude3
  
  prompt #"
    You are a sponsor data extraction specialist. Extract sponsor information from the following search results:
    
    {{searchResults}}
    
    Find companies that are:
    - Event sponsors
    - Exhibitors
    - Partners
    - Supporting organizations
    
    Return a JSON array of Company objects. Each Company object must have this EXACT structure:
    {
      "name": "Company Name",
      "website": "company.com" or null,
      "industry": "Industry/Sector" or null,
      "description": "Brief description" or null,
      "headquarters": "Location" or null,
      "founded": 2000 or null,
      "employeesRange": "100-500" or null
    }
    
    IMPORTANT:
    - Return ONLY the JSON array, no other text
    - Use "name" not "companyName" 
    - Use "founded" not "yearFounded"
    - Use "employeesRange" not "employeeCount"
    - Use null for unknown fields, not empty strings
    - Only include companies explicitly mentioned as sponsors/exhibitors/partners
    
    Example output:
    [
      {
        "name": "Example Corp",
        "website": "example.com",
        "industry": "Technology",
        "description": "A technology company",
        "headquarters": "San Francisco, CA",
        "founded": 2010,
        "employeesRange": "50-100"
      }
    ]
  "#
}

function EnrichCompany(companyResearchResults: string) -> Company {
  client Claude3
  
  prompt #"
    You are a company data enrichment specialist. Extract company information from the following research results:
    
    {{companyResearchResults}}
    
    Extract the following information:
    - Official company name
    - Company website
    - Industry/sector classification
    - Brief company description (1-2 sentences)
    - Headquarters location
    - Year founded
    - Employee count range (e.g., "100-500", "1000-5000")
    
    Return structured data following the Company schema.
    Use null for fields where information is not available.
    Only extract information that is explicitly stated in the research results.
  "#
}