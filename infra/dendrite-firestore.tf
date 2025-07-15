# Firestore security rules and indexes for Dendrite

data "local_file" "firestore_rules" {
  filename = "${path.module}/rules/firestore.rules"
}

resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = data.local_file.firestore_rules.content
    }
  }
  depends_on = [
    google_project_service.firebaserules,
    google_project_iam_member.ci_firebaserules_admin,
  ]
}

resource "google_firebaserules_release" "firestore" {
  project      = var.project_id
  name         = "firestore.rules"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  lifecycle {
    ignore_changes = [ ruleset_name ]
  }

  depends_on = [
    google_project_iam_member.ci_firebaserules_admin   # ensure role is live
  ]
}

resource "google_firestore_index" "variants_author_created" {
  project     = var.project_id
  collection  = "variants"
  query_scope = "COLLECTION"

  fields {
    field_path = "authorId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}


resource "google_firestore_index" "ratings_by_variant" {
  project     = var.project_id
  collection  = "moderationRatings"
  query_scope = "COLLECTION"

  fields {
    field_path = "variantId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "ratedAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "pages_number_global" {
  project     = var.project_id
  collection  = "pages"
  query_scope = "COLLECTION_GROUP"

  fields {
    field_path = "number"
    order      = "ASCENDING"
  }
}

