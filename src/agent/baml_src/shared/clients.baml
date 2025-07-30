client<llm> GPT4 {
  provider openai
  options {
    model "gpt-4"
    temperature 0
  }
}

client<llm> Claude3 {
  provider anthropic
  options {
    model "claude-3-5-sonnet-20241022"
    max_tokens 4096
    temperature 0
  }
}