import { readFileSync } from 'node:fs';

const CODEX_VM_PATH = 'infra/codex-vm.tf';

describe('Codex VM Terraform policy', () => {
  const codexVm = readFileSync(CODEX_VM_PATH, 'utf8');
  const allInfra = [
    codexVm,
    readFileSync('infra/main.tf', 'utf8'),
    readFileSync('infra/load-balancer.tf', 'utf8'),
    readFileSync('infra/outputs.tf', 'utf8'),
    readFileSync('infra/variables.tf', 'utf8'),
  ].join('\n');

  it('creates resources only when explicitly enabled in production', () => {
    expect(codexVm).toContain(
      'codex_vm_enabled = var.codex_vm_enabled && var.environment == "prod"'
    );
    expect(codexVm).not.toMatch(/count\s*=\s*var\.codex_vm_enabled/);
    expect(codexVm).not.toMatch(/for_each\s*=\s*var\.codex_vm_enabled/);

    const workflow = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');
    expect(workflow).toContain("TF_VAR_codex_vm_enabled: 'true'");
    expect(workflow).toContain(
      'TF_VAR_codex_admin_member: ${{ secrets.CODEX_ADMIN_MEMBER }}'
    );
    expect(readFileSync('infra/prod.auto.tfvars', 'utf8')).not.toContain(
      'codex_vm_enabled'
    );
  });

  it('limits inbound SSH to IAP and the VM network tag', () => {
    expect(codexVm).toContain('source_ranges = ["35.235.240.0/20"]');
    expect(codexVm).toContain('ports    = ["22"]');
    expect(codexVm).toContain('target_tags   = [local.codex_vm_tag]');
  });

  it('requires OS Login and blocks project SSH keys', () => {
    expect(codexVm).toContain('enable-oslogin         = "TRUE"');
    expect(codexVm).toContain('block-project-ssh-keys = "TRUE"');
  });

  it('does not grant project roles to the VM service account', () => {
    expect(allInfra).not.toMatch(
      /google_project_iam_member[\s\S]{0,500}member\s*=\s*"serviceAccount:\$\{google_service_account\.codex_vm/
    );
  });

  it('does not expose the ephemeral external address as an output', () => {
    expect(readFileSync('infra/outputs.tf', 'utf8')).not.toMatch(
      /output\s+"codex_vm_external_ip"/
    );
  });
});
