variable "bucket_name" {
  type = string
}

locals {
  content_types = {
    "404.html"       = "text/html"
    "new-story.html" = "text/html"
    "new-page.html"  = "text/html"
    "about.html"     = "text/html"
    "admin.html"     = "text/html"
    "mod.html"       = "text/html"
    "googleAuth.js"  = "application/javascript"
    "moderate.js"    = "application/javascript"
    "admin.js"       = "application/javascript"
    "dendrite.css"   = "text/css"
  }

  objects = {
    for file in fileset("${path.module}/../../static", "**") :
    file => lookup(local.content_types, file, "application/octet-stream")
  }
}

resource "google_storage_bucket_object" "static" {
  for_each     = local.objects
  name         = each.key
  bucket       = var.bucket_name
  source       = "${path.module}/../../static/${each.key}"
  content_type = each.value
}
