variable "project_id" {
  type = string
}

variable "project_number" {
  type = string
}

variable "environment" {
  type = string
}

variable "dendrite_static_bucket_name" {
  type = string
}

variable "lb_cert_domains" {
  description = "Domain names for the TLS certificate"
  type        = list(string)
  default = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
  ]
}

variable "runtime_service_account_email" {
  type = string
}
