/**
 * Create a read-only GCS runner schedule capability.
 * @param {{storage: {bucket: (name: string) => {file: (name: string) => {download: () => Promise<Array<Buffer>>}}}, bucketName: string, objectName: string}} options Provider configuration.
 * @returns {{getSchedule: (allowEffects: AllowEffects, input: {runnerId?: string}) => Promise<object[]>}} Schedule capability.
 */
export function createGcsRunnerScheduleProvider({
  storage,
  bucketName,
  objectName,
}) {
  return {
    async getSchedule(allowEffects) {
      void allowEffects;
      if (!bucketName || !objectName)
        throw new Error('Runner schedule storage configuration is required.');
      const [contents] = await storage
        .bucket(bucketName)
        .file(objectName)
        .download();
      const schedule = JSON.parse(contents.toString('utf8'));
      if (!Array.isArray(schedule) || schedule.some(window => {
        const start = Date.parse(window?.startTimestamp);
        const end = Date.parse(window?.endTimestamp);
        return !Number.isFinite(start) || !Number.isFinite(end) || end < start;
      }))
        throw new Error('Invalid runner schedule configuration.');
      return schedule;
    },
  };
}
/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
