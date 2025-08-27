variable "name" {
  type = string
}

variable "entry_point" {
  type = string
}

variable "source_dir" {
  type = string
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

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "https_security_level" {
  type    = string
  default = null
}

variable "trigger" {
  type = object({
    http  = optional(bool)
    event = optional(object({
      event_type = string
      resource   = string
      retry      = optional(bool)
    }))
  })
  default = { http = false }
  validation {
    condition     = !(coalesce(var.trigger.http, false) && var.trigger.event != null)
    error_message = "Provide either trigger.http OR trigger.event, not both."
  }
}

variable "iam_members" {
  type    = list(object({ role = string, member = string }))
  default = []
}
