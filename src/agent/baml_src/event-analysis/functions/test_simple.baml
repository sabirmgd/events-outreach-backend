function SimpleTest(input: string) -> string {
  client Claude3
  
  prompt #"
    Echo back the following text exactly: {{input}}
  "#
}