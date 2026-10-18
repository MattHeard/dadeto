import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('production function endpoint registry Terraform', () => {
  it('publishes the actual deployed public service URIs in a versioned manifest', async () => {
    const terraform = await readFile('infra/function-endpoints.tf', 'utf8');
    const object = terraform.match(
      /resource "google_storage_bucket_object" "function_endpoint_registry" \{[\s\S]*?\n\}/
    );

    expect(object).not.toBeNull();
    expect(object[0]).toContain('count = var.environment == "prod" ? 1 : 0');
    expect(object[0]).toContain('name   = "function-endpoints.json"');
    expect(object[0]).toContain('schemaVersion = 1');
    expect(object[0]).toContain('environment   = "prod"');
    expect(object[0]).toMatch(
      /functions\s+=\s+local\.function_endpoint_registry_functions/
    );
    expect(object[0]).toContain('content_type  = "application/json"');
    expect(object[0]).toContain('cache_control = "no-store"');
    expect(object[0]).not.toMatch(/https:\/\//);
  });

  it('reads live deployed function URIs without depending on managed function updates', async () => {
    const terraform = await readFile('infra/function-endpoints.tf', 'utf8');

    expect(terraform).toContain(
      'data "google_cloudfunctions2_function" "object_minute_rental_search_registry"'
    );
    expect(terraform).toContain(
      'data "google_cloudfunctions2_function" "get_author_uuid_v2_registry"'
    );
    expect(terraform).toContain(
      'name     = "${var.environment}-object-minute-rental-search"'
    );
    expect(terraform).toContain(
      'name     = "${var.environment}-get-author-uuid-v2"'
    );
    expect(terraform).toContain(
      'objectMinuteRentalSearch = data.google_cloudfunctions2_function.object_minute_rental_search_registry[0].service_config[0].uri'
    );
    expect(terraform).toContain(
      'getAuthorUuidV2          = data.google_cloudfunctions2_function.get_author_uuid_v2_registry[0].service_config[0].uri'
    );
    expect(terraform).not.toContain(
      'objectMinuteRentalSearch = google_cloudfunctions2_function.object_minute_rental_search.service_config[0].uri'
    );
    expect(terraform).not.toContain(
      'getAuthorUuidV2          = google_cloudfunctions2_function.get_author_uuid_v2.service_config[0].uri'
    );
  });

  it('isolates the registry bucket and grants anonymous read without runtime writers', async () => {
    const [terraform, main] = await Promise.all([
      readFile('infra/function-endpoints.tf', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);
    const bucket = terraform.match(
      /resource "google_storage_bucket" "function_endpoint_registry" \{[\s\S]*?\n\}/
    );
    const reader = terraform.match(
      /resource "google_storage_bucket_iam_member" "function_endpoint_registry_public_reader" \{[\s\S]*?\n\}/
    );

    expect(bucket).not.toBeNull();
    expect(bucket[0]).toContain('count = var.environment == "prod" ? 1 : 0');
    expect(bucket[0]).toContain('uniform_bucket_level_access = true');
    expect(bucket[0]).toContain('public_access_prevention    = "inherited"');
    expect(bucket[0]).toContain('prevent_destroy = true');
    expect(reader).not.toBeNull();
    expect(reader[0]).toContain('role   = local.storage_object_viewer_role');
    expect(reader[0]).toContain('member = local.all_users_member');
    expect(main).toContain(
      'storage_object_viewer_role                    = "roles/storage.objectViewer"'
    );
    expect(terraform).not.toContain('roles/storage.objectAdmin');
    expect(terraform).not.toContain(
      'cloud_function_runtime_service_account_member'
    );
  });

  it('keeps the stable registry URL configured in Terraform and hides it outside production', async () => {
    const [terraform, variable, outputs] = await Promise.all([
      readFile('infra/function-endpoints.tf', 'utf8'),
      readFile('infra/variables.tf', 'utf8'),
      readFile('infra/outputs.tf', 'utf8'),
    ]);

    expect(variable).toMatch(
      /variable "function_endpoint_registry_bucket_name" \{[\s\S]*?default\s+=\s+null/
    );
    expect(terraform).toContain('"${var.project_id}-function-endpoints"');
    expect(terraform).toContain(
      'https://storage.googleapis.com/${local.function_endpoint_registry_bucket_name}/function-endpoints.json'
    );
    expect(outputs).toMatch(
      /output "function_endpoint_registry_url" \{[\s\S]*?var\.environment == "prod" \? local\.function_endpoint_registry_url : null/
    );
  });
});
