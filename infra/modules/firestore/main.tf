variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "runtime_service_account_email" {
  type = string
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"
}

resource "google_project_service" "firebaserules" {
  project = var.project_id
  service = "firebaserules.googleapis.com"
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.firestore]
}

resource "google_project_iam_member" "firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}
resource "google_project_iam_member" "ci_firebaserules_admin" {
  project = var.project_id
  role    = "roles/firebaserules.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}


resource "google_project_iam_member" "runtime_firestore_access" {
  project    = var.project_id
  role       = "roles/datastore.user"
  member     = "serviceAccount:${var.runtime_service_account_email}"
  depends_on = [google_project_service.firestore]
}

data "local_file" "firestore_rules" {
  filename = "${path.root}/rules/firestore.rules"
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
    google_project_iam_member.ci_firebaserules_admin,
  ]
}



resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = var.project_id
  name         = "firestore.rules"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  lifecycle {
    ignore_changes = [ruleset_name]
  }

  depends_on = [
    google_project_iam_member.ci_firebaserules_admin,
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

# Supports: variants where moderatorReputationSum == 0 and rand >= n
resource "google_firestore_index" "variants_moderation_rand" {
  project     = var.project_id
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
}

resource "google_firestore_field" "pages_all" {
  provider   = google-beta
  project    = var.project_id
  database   = "(default)"
  collection = "pages"
  field      = "__name__"

  index_config {
    indexes {
      order       = "ASCENDING"
      query_scope = "COLLECTION_GROUP"
    }
  }
}

# Supports: querying variants by moderatorReputationSum alone
resource "google_firestore_field" "variants_moderation" {
  provider   = google-beta
  project    = var.project_id
  database   = "(default)"
  collection = "variants"
  field      = "moderatorReputationSum"

  index_config {
    indexes {
      order       = "ASCENDING"
      query_scope = "COLLECTION_GROUP"
    }
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

resource "google_firestore_field" "pages_number_global" {
  provider   = google-beta
  project    = var.project_id
  database   = "(default)"
  collection = "pages"
  field      = "number"

  index_config {
    indexes {
      order       = "ASCENDING"
      query_scope = "COLLECTION_GROUP"
    }
  }
}
