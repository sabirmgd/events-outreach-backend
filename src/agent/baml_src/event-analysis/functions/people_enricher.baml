function FindCompanyPOCs(searchResults: string) -> Person[] {
  client Claude3
  
  prompt #"
    You are a people data enrichment specialist. Extract information about key decision makers from the following search results:
    
    {{searchResults}}
    
    Focus on finding these priority roles:
    1. C-Suite executives (CEO, CTO, CMO, CFO)
    2. VP/Head of Sales
    3. VP/Head of Marketing
    4. VP/Head of Business Development
    5. Director of Partnerships
    
    Return a JSON array of Person objects. Each Person object must have this EXACT structure:
    {
      "name": "Full Name",
      "title": "Job Title" or null,
      "company": "Company Name" or null,
      "email": "email@company.com" or null,
      "phone": "phone number" or null,
      "linkedinUrl": "https://linkedin.com/in/profile" or null,
      "bio": "Brief professional bio" or null,
      "location": "City, Country" or null,
      "expertise": ["skill1", "skill2"] or null,
      "sessionType": null,
      "topic": null,
      "role": "Executive role" or null
    }
    
    IMPORTANT:
    - Return ONLY the JSON array, no other text
    - Only include people who are explicitly named and have clear roles
    - Use null for unknown fields, not empty strings
    - Focus on leadership positions and decision makers
    
    Example output:
    [
      {
        "name": "John Smith",
        "title": "CEO",
        "company": "Example Corp",
        "email": "john.smith@example.com",
        "phone": null,
        "linkedinUrl": "https://linkedin.com/in/johnsmith",
        "bio": "CEO with 15 years of experience",
        "location": "San Francisco, CA",
        "expertise": ["Leadership", "Strategy"],
        "sessionType": null,
        "topic": null,
        "role": "CEO"
      }
    ]
  "#
}

function FindCompanyPOCsByRoles(searchResults: string, targetRoles: string[]) -> Person[] {
  client Claude3
  
  prompt #"
    You are a people data enrichment specialist. Extract information about specific decision makers from the following search results:
    
    {{searchResults}}
    
    CRITICAL: Only extract people who have ONE of these specific roles/titles:
    {% for role in targetRoles %}
    - {{role}}
    {% endfor %}
    
    DO NOT include people with other roles, even if they are executives. ONLY include people whose title matches one of the above roles.
    
    Return a JSON array of Person objects. Each Person object must have this EXACT structure:
    {
      "name": "Full Name",
      "title": "Job Title" or null,
      "company": "Company Name" or null,
      "email": "email@company.com" or null,
      "phone": "phone number" or null,
      "linkedinUrl": "https://linkedin.com/in/profile" or null,
      "bio": "Brief professional bio" or null,
      "location": "City, Country" or null,
      "expertise": ["skill1", "skill2"] or null,
      "sessionType": null,
      "topic": null,
      "role": "Executive role" or null
    }
    
    IMPORTANT:
    - Return ONLY the JSON array, no other text
    - Only include people who are explicitly named and have one of the target roles
    - Use null for unknown fields, not empty strings
    - Be strict about role matching - the person's title must clearly match one of the target roles
    - If no one matches the target roles, return an empty array []
    
    Example: If targetRoles = ["CEO", "VP Sales"], only return people with CEO or VP Sales titles, ignore all others.
  "#
}

function EnrichPerson(personResearchResults: string) -> Person {
  client Claude3
  
  prompt #"
    You are a contact enrichment specialist. Extract person information from the following research results:
    
    {{personResearchResults}}
    
    Return a single Person object with this EXACT structure:
    {
      "name": "Full Name",
      "title": "Job Title" or null,
      "company": "Company Name" or null,
      "email": "email@company.com" or null,
      "phone": "phone number" or null,
      "linkedinUrl": "https://linkedin.com/in/profile" or null,
      "bio": "Professional biography" or null,
      "location": "City, Country" or null,
      "expertise": ["skill1", "skill2"] or null,
      "sessionType": null,
      "topic": null,
      "role": "Professional role" or null
    }
    
    IMPORTANT:
    - Return ONLY the JSON object, no other text
    - Use null for unknown fields, not empty strings
    - Only extract information explicitly stated in the research results
    - Focus on professional and contact information
    
    Example output:
    {
      "name": "Jane Doe",
      "title": "VP of Engineering",
      "company": "Tech Corp",
      "email": "jane.doe@techcorp.com",
      "phone": null,
      "linkedinUrl": "https://linkedin.com/in/janedoe",
      "bio": "Experienced engineering leader with 10+ years in tech",
      "location": "New York, NY",
      "expertise": ["Engineering", "Leadership", "Technology"],
      "sessionType": null,
      "topic": null,
      "role": "VP of Engineering"
    }
  "#
}