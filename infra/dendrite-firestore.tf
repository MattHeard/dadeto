# Firestore security rules and indexes for Dendrite

data "local_file" "firestore_rules" {
  filename = "${path.module}/rules/firestore.rules"
}

locals {
  manage_firestore_indexes = var.database_id != "(default)"
}

resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = data.local_file.firestore_rules.content
    }
  }
  depends_on = [
    google_project_service.firebaserules,
    google_project_iam_member.terraform_service_account_roles["ci_firebaserules_admin"],
  ]
}

resource "google_firestore_index" "variants_author_created" {
  count       = local.manage_firestore_indexes ? 1 : 0
  project     = var.project_id
  database    = var.database_id
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

  depends_on = [google_firestore_database.database]
}

# Supports: variants where moderatorReputationSum == 0 and rand >= n
resource "google_firestore_index" "variants_moderation_rand" {
  count       = local.manage_firestore_indexes ? 1 : 0
  project     = var.project_id
  database    = var.database_id
  collection  = "variants"
  query_scope = "COLLECTION_GROUP"

  fields {
    field_path = "moderatorReputationSum"
    order      = "ASCENDING"
  }
  fields {
    field_path = "rand"
    order      = "ASCENDING"
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firestore_index" "ratings_by_variant" {
  count       = local.manage_firestore_indexes ? 1 : 0
  project     = var.project_id
  database    = var.database_id
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

  depends_on = [google_firestore_database.database]
}
