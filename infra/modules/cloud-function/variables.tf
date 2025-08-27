variable "name" {
  type = string
}

variable "entry_point" {
  type = string
}

variable "source_dir" {
  type = string
}

variable "trigger" {
  type = object({
    http  = optional(bool)
    event = optional(object({
      event_type = string
      resource   = string
    }))
  })
  default = { http = false }
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "runtime" {
  type = string
}

variable "source_bucket" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "https_security_level" {
  type = string
}

variable "iam_members" {
  type    = list(object({ role = string, member = string }))
  default = []
}
