resource "google_cloudfunctions_function" "get_api_key_credit" {
  name        = "get-api-key-credit"
  description = "Returns credit associated with API key"
  runtime     = "nodejs18"
  region      = "europe-west1"
  entry_point = "getApiKeyCredit"
  source_directory = path.module

  trigger_http = true

  available_memory_mb   = 128
  timeout               = 60

  environment_variables = {
    NODE_ENV = "production"
  }
}
