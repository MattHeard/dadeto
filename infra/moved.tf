# State move blocks to migrate project service resources
# from legacy for_each-based resource to individually named resources

moved {
  from = google_project_service.apis["firebase.googleapis.com"]
  to   = google_project_service.firebase_api
}

moved {
  from = google_project_service.apis["identitytoolkit.googleapis.com"]
  to   = google_project_service.identitytoolkit
}

moved {
  from = google_project_service.apis["cloudscheduler.googleapis.com"]
  to   = google_project_service.cloudscheduler
}

moved {
  from = google_project_service.apis["compute.googleapis.com"]
  to   = google_project_service.compute
}

moved {
  from = google_project_service.apis["eventarc.googleapis.com"]
  to   = google_project_service.eventarc
}

moved {
  from = google_project_service.apis["firebaserules.googleapis.com"]
  to   = google_project_service.firebaserules
}

moved {
  from = google_project_service.apis["cloudfunctions.googleapis.com"]
  to   = google_project_service.cloudfunctions
}

moved {
  from = google_project_service.apis["artifactregistry.googleapis.com"]
  to   = google_project_service.artifactregistry
}

moved {
  from = google_project_service.apis["firestore.googleapis.com"]
  to   = google_project_service.firestore
}

moved {
  from = google_project_service.apis["run.googleapis.com"]
  to   = google_project_service.run
}

moved {
  from = google_project_service.apis["apikeys.googleapis.com"]
  to   = google_project_service.apikeys_api
}

moved {
  from = google_project_service.apis["cloudbuild.googleapis.com"]
  to   = google_project_service.cloudbuild
}

