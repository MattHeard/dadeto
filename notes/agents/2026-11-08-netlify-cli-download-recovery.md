# Netlify CLI download recovery

Owner: `dadeto-i3xm`; discovered after the approved report migration landed.

Main `862b936fe5dac6eb228000bc24be013f0c6ab75b` passed Full Check, Terraform and
Sonar. Production workflow 42465383273 failed twice before deployment while
installing netlify-cli17: sharp's libvips8.14.5 Linux x64 download returned HTTP504.
Browser build, endpoint registry resolution and HTTPS verification passed.

Do not change project code or blindly retry because an external installer failed.
The same binary URL initially returned504 from the development host, then200
after the user resumed hours later. Verify that current main still equals the
failed run's source before retrying an old production workflow. With that changed
precondition, retry only failed jobs. No code/config/dependency change was needed.

Attempt3 job128738147612 succeeded, including CLI install, production deployment,
deployment-identity attachment and registry-observation upload. Inspected artifact
13618301701 (`/tmp/dadeto-netlify-recovery-observation.zip`) records source862b936,
run42465383273, a nonempty deployment ID and the production registry observation.
This proves that report merge deployed; it does not prove a later draft deployed.
The underlying server/proxy cause of the earlier504 responses remains unproven.

Next time, distinguish a failed HTTP response from curl's process exit when
`--fail` is absent, retain logs for every attempt, and check actual upstream
availability before another retry. Do not weaken endpoint checks or substitute
an unverified CLI upgrade for a transient download failure.
