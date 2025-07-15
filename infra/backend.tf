terraform {
  backend "gcs" {
    bucket = "tfstate-irien-465710"
    prefix = "terraform/state"
  }
}
