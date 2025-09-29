# State move blocks to migrate project service resources
# from legacy for_each-based resource to individually named resources

moved {
  from = google_project_service.apis["firebase.googleapis.com"]
  to   = google_project_service.firebase_api[0]
}

moved {
  from = google_project_service.apis["identitytoolkit.googleapis.com"]
  to   = google_project_service.identitytoolkit[0]
}

moved {
  from = google_project_service.apis["cloudscheduler.googleapis.com"]
  to   = google_project_service.cloudscheduler[0]
}

moved {
  from = google_project_service.apis["compute.googleapis.com"]
  to   = google_project_service.compute[0]
}

moved {
  from = google_project_service.apis["eventarc.googleapis.com"]
  to   = google_project_service.eventarc[0]
}

moved {
  from = google_project_service.firebaserules
  to   = google_project_service.firebaserules[0]
}

moved {
  from = google_project_service.apis["cloudfunctions.googleapis.com"]
  to   = google_project_service.cloudfunctions[0]
}

moved {
  from = google_project_service.apis["artifactregistry.googleapis.com"]
  to   = google_project_service.artifactregistry[0]
}

moved {
  from = google_project_service.firestore
  to   = google_project_service.firestore[0]
}

moved {
  from = google_project_service.apis["run.googleapis.com"]
  to   = google_project_service.run[0]
}

moved {
  from = google_project_service.apis["apikeys.googleapis.com"]
  to   = google_project_service.apikeys_api[0]
}

moved {
  from = google_project_service.apis["cloudbuild.googleapis.com"]
  to   = google_project_service.cloudbuild[0]
}

