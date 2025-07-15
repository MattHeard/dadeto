terraform {
  backend "gcs" {
    bucket = "terraform-state-irien-465710"
    prefix = "terraform/state"
  }
}
