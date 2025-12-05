for db in $(gcloud firestore databases list --project=irien-465710 \
  --format='value(name)' | awk -F/ '/\/t-/{print $NF}'); do
  gcloud firestore databases delete --project=irien-465710 --database="$db" --quiet
done
