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
}

resource "google_firebaserules_release" "firestore" {
  name    = "firestore.rules"
  project = var.project_id
  ruleset = google_firebaserules_ruleset.firestore.id
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

resource "google_firestore_index" "options_by_source" {
  project     = var.project_id
  collection  = "options"
  query_scope = "COLLECTION"

  fields {
    field_path = "sourceVariantId"
    order      = "ASCENDING"
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

resource "google_firestore_index" "story_stats_variantcount" {
  project     = var.project_id
  collection  = "storyStats"
  query_scope = "COLLECTION"

  fields {
    field_path = "variantCount"
    order      = "DESCENDING"
  }
}
