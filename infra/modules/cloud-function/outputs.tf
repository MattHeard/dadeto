output "name" {
  value = google_cloudfunctions_function.function.name
}

output "https_trigger_url" {
  # null when not HTTP; your scheduler reference will still work for HTTP funcs
  value = local.trigger_http ? google_cloudfunctions_function.function.https_trigger_url : null
}
