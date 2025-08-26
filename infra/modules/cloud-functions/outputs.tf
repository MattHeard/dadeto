output "runtime_service_account_email" {
  value = google_service_account.cloud_function_runtime.email
}

output "gcf_source_bucket_name" {
  value = google_storage_bucket.gcf_source_bucket.name
}
