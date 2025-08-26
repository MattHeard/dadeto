locals {
  content_types = {
    "404.html"      = "text/html"
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
}

resource "google_storage_bucket_object" "objects" {
  for_each = {
    for file in fileset("${path.module}/../../static", "**") :
    file => local.content_types[file]
  }

  name          = each.key
  bucket        = var.bucket_name
  source        = "${path.module}/../../static/${each.key}"
  content_type  = each.value
  cache_control = each.key == "404.html" ? "no-store" : null
}
