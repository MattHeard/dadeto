# Dockerfile
FROM sonarqube:lts

# Switch to root so we can write into /opt/sonarqube/bin (the base image sets USER sonarqube)
USER root

# 1️⃣ drop in your pre-baked sonar.properties  
COPY conf/sonar.properties /opt/sonarqube/conf/

# 2️⃣ add a bootstrap script
COPY bootstrap.sh /opt/sonarqube/bin/bootstrap.sh
RUN chmod +x /opt/sonarqube/bin/bootstrap.sh

# Install curl for bootstrap.sh (base image doesn't include it)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Re‑enable non‑root execution for SonarQube runtime
USER sonarqube
