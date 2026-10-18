locals {
  function_endpoint_registry_bucket_name = coalesce(
    var.function_endpoint_registry_bucket_name,
    "${var.project_id}-function-endpoints",
  )
  function_endpoint_registry_url = "https://storage.googleapis.com/${local.function_endpoint_registry_bucket_name}/function-endpoints.json"
}

resource "google_storage_bucket" "function_endpoint_registry" {
  count = var.environment == "prod" ? 1 : 0

  name                        = local.function_endpoint_registry_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_iam_member" "function_endpoint_registry_public_reader" {
  count = var.environment == "prod" ? 1 : 0

  bucket = google_storage_bucket.function_endpoint_registry[0].name
  role   = local.storage_object_viewer_role
  member = local.all_users_member
}

data "google_cloudfunctions2_function" "object_minute_rental_search_registry" {
  count = var.environment == "prod" ? 1 : 0

  name     = "${var.environment}-object-minute-rental-search"
  location = var.region
  project  = var.project_id
}

data "google_cloudfunctions2_function" "get_author_uuid_v2_registry" {
  count = var.environment == "prod" ? 1 : 0

  name     = "${var.environment}-get-author-uuid-v2"
  location = var.region
  project  = var.project_id
}

locals {
  function_endpoint_registry_functions = var.environment == "prod" ? {
    objectMinuteRentalSearch = data.google_cloudfunctions2_function.object_minute_rental_search_registry[0].service_config[0].uri
    getAuthorUuidV2          = data.google_cloudfunctions2_function.get_author_uuid_v2_registry[0].service_config[0].uri
  } : {}
}

resource "google_storage_bucket_object" "function_endpoint_registry" {
  count = var.environment == "prod" ? 1 : 0

  name   = "function-endpoints.json"
  bucket = google_storage_bucket.function_endpoint_registry[0].name
  content = jsonencode({
    schemaVersion = 1
    environment   = "prod"
    functions     = local.function_endpoint_registry_functions
  })
  content_type  = "application/json"
  cache_control = "no-store"
}
