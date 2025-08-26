resource "google_storage_bucket" "irien_bucket" {
  name     = "irien-hello-world-${var.project_id}"
  location = var.irien_bucket_location
}

resource "google_storage_bucket_object" "hello_world" {
  name   = "hello-world.txt"
  bucket = google_storage_bucket.irien_bucket.name
  source = "${path.root}/static/hello-world.txt"
}

resource "google_storage_bucket_iam_member" "public_read_access" {
  bucket = google_storage_bucket.irien_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket" "dendrite_static" {
  name     = var.static_site_bucket_name
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_object" "dendrite_404" {
  name          = "404.html"
  bucket        = google_storage_bucket.dendrite_static.name
  source        = "${path.root}/static/404.html"
  content_type  = "text/html"
  cache_control = "no-store"
}

resource "google_storage_bucket_object" "dendrite_new_story" {
  name         = "new-story.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/new-story.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_new_page" {
  name         = "new-page.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/new-page.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_about" {
  name         = "about.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/about.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_manual" {
  name         = "manual.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/manual.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_mod" {
  name   = "mod.html"
  bucket = google_storage_bucket.dendrite_static.name
  content = templatefile("${path.root}/static/mod.html", {
    firebase_web_app_config = jsonencode(var.firebase_web_app_config)
  })
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_google_auth_js" {
  name         = "googleAuth.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/googleAuth.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_moderate_js" {
  name         = "moderate.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/moderate.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_admin_html" {
  name         = "admin.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/admin.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_admin_js" {
  name         = "admin.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/admin.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_css" {
  name         = "dendrite.css"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.root}/static/dendrite.css"
  content_type = "text/css"
}

resource "google_storage_bucket_iam_member" "dendrite_public_read_access" {
  bucket = google_storage_bucket.dendrite_static.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "dendrite_runtime_writer" {
  bucket = google_storage_bucket.dendrite_static.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.service_account_email}"
}
