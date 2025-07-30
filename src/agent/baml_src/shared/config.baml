retry_policy ExpBackoff {
  max_retries 3
  strategy {
    type exponential_backoff
    initial_delay_ms 1000
    max_delay_ms 10000
    multiplier 2
  }
}