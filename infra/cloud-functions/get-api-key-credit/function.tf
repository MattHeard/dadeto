resource "google_cloudfunctions2_function" "get_api_key_credit" {
  name     = "get-api-key-credit"
  location = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.irien_bucket.name
        object = google_storage_bucket_object.get_api_key_credit.name
      }
    }
  }

  service_config {
    available_memory   = "128Mi"
    timeout_seconds    = 60
    min_instance_count = 0
  }

  event_trigger {
    event_type     = "google.cloud.functions.v2.eventTypes.http.request"
    trigger_region = var.region
  }
}

resource "google_storage_bucket_object" "get_api_key_credit" {
  name   = "get-api-key-credit.zip"
  bucket = google_storage_bucket.irien_bucket.name
  source = "${path.module}/get-api-key-credit.zip"
}
