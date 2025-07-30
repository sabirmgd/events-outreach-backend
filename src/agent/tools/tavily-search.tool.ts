import { Tool } from "@langchain/core/tools";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  raw_content?: string | null;
}

interface TavilyAPIResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  images?: string[];
  response_time?: number;
}

export class TavilySearchTool extends Tool {
  name = "tavily_search_results_json";
  description = "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.";
  
  private apiKey: string;
  private maxResults: number;
  private apiUrl: string;
  private includeRawContent: boolean;
  private searchDepth: "basic" | "advanced";

  constructor(fields?: {
    apiKey?: string;
    maxResults?: number;
    apiUrl?: string;
    includeRawContent?: boolean;
    searchDepth?: "basic" | "advanced";
  }) {
    super();
    this.apiKey = fields?.apiKey || process.env.TAVILY_API_KEY || "";
    this.maxResults = fields?.maxResults || 5;
    this.apiUrl = fields?.apiUrl || "https://api.tavily.com/search";
    this.includeRawContent = fields?.includeRawContent ?? false;
    this.searchDepth = fields?.searchDepth || "advanced";

    if (!this.apiKey) {
      throw new Error("Tavily API key is required. Please set TAVILY_API_KEY environment variable or pass it in the constructor.");
    }
  }

  protected async _call(
    input: string,
    _runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    try {
      const requestBody = {
        api_key: this.apiKey,
        query: input,
        max_results: this.maxResults,
        include_answer: true,
        include_raw_content: this.includeRawContent,
        search_depth: this.searchDepth,
        include_images: true
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as TavilyAPIResponse;
      return JSON.stringify(data);
    } catch (error) {
      console.error("[TavilySearchTool] Error calling Tavily API:", error);
      throw error;
    }
  }
}