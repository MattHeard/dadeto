locals {
  default_env_vars = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  functions_v2 = {
    get_api_key_credit_v2 = {
      entry_point = "getApiKeyCreditV2"
      source_dir  = "${path.module}/cloud-functions/get-api-key-credit-v2"
      trigger     = { http = true }
      iam_members = [{ role = "roles/run.invoker", member = "allUsers" }]
    }
  }
}

module "cloud_functions_v2" {
  for_each = local.functions_v2

  source = "./modules/cloud-function-v2"

  name                  = "${var.environment}-${each.key}"
  entry_point           = each.value.entry_point
  source_dir            = each.value.source_dir
  trigger               = each.value.trigger
  env_vars              = merge(local.default_env_vars, lookup(each.value, "env_vars", {}))
  project_id            = var.project_id
  region                = var.region
  runtime               = "nodejs22"
  source_bucket         = module.cloud_functions.gcf_source_bucket_name
  service_account_email = module.cloud_functions.runtime_service_account_email
  iam_members           = lookup(each.value, "iam_members", [])
  depends_on = [
    module.cloud_functions,
  ]
}
