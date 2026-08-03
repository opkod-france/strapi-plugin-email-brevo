import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, Settings, DEFAULT_SETTINGS } from '../../../common';

function isConfigUsable(config: Partial<Settings> | undefined): boolean {
  if (!config) return false;
  return !!(config.apiKey?.trim() && config.defaultFrom?.trim());
}

function fillWithDefaults(candidate: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
  };
}

const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  function getPluginStore() {
    return strapi.store
      ? strapi.store({ type: 'plugin', name: PLUGIN_ID })
      : { get: async () => DEFAULT_SETTINGS, set: async () => {}, delete: async () => {} };
  }

  function getConfigFromFile(): Partial<Settings> {
    const plugin = strapi.plugin(PLUGIN_ID);
    if (!plugin) return {};

    return {
      enabled: plugin.config<boolean>('enabled'),
      apiKey: plugin.config<string>('apiKey'),
      defaultFrom: plugin.config<string>('defaultFrom'),
      defaultFromName: plugin.config<string>('defaultFromName'),
      defaultReplyTo: plugin.config<string>('defaultReplyTo'),
    };
  }

  /**
   * Write-path read: resolves to `{}` when nothing is stored and **throws** when
   * the store itself fails. Never conflate the two — treating a failed read as
   * "nothing stored" would let a partial patch overwrite a healthy record.
   */
  async function readStoredConfig(): Promise<Partial<Settings>> {
    const stored = (await getPluginStore().get({ key: 'config' })) as Partial<Settings> | undefined;
    return stored ?? {};
  }

  /**
   * Read-path read: a store failure degrades to `undefined` so `getSettings()`
   * can fall through to file config / defaults per docs/settings-precedence.md.
   */
  async function getConfigFromDb(): Promise<Partial<Settings> | undefined> {
    try {
      return await readStoredConfig();
    } catch (error) {
      strapi.log.warn(`[${PLUGIN_ID}] Failed to read settings from database: ${(error as Error).message}`);
      return undefined;
    }
  }

  async function getSettings(): Promise<Settings> {
    const dbCfg = await getConfigFromDb();
    if (isConfigUsable(dbCfg)) {
      return fillWithDefaults(dbCfg);
    }

    const fileCfg = getConfigFromFile();
    if (isConfigUsable(fileCfg)) {
      return fillWithDefaults(fileCfg);
    }

    return DEFAULT_SETTINGS;
  }

  /**
   * Merges an incoming patch over the stored DB record only — file config and
   * DEFAULT_SETTINGS stay read-fallbacks and must never leak into what is
   * written. Nothing is persisted here; the caller validates the result first.
   *
   * Keys absent from the patch (or explicitly `undefined`) keep their stored
   * value; an explicit `''` clears the field.
   */
  async function resolveUpdate(patch: Partial<Settings>): Promise<Settings> {
    const stored = await readStoredConfig();
    const defined = Object.fromEntries(
      Object.entries(patch ?? {}).filter(([, value]) => value !== undefined)
    ) as Partial<Settings>;

    return fillWithDefaults({ ...stored, ...defined });
  }

  /**
   * Persists a complete, already-merged record. Callers must go through
   * `resolveUpdate` first — this function never merges.
   */
  async function updateSettings(settings: Settings): Promise<Settings> {
    const store = getPluginStore();
    await store.set({ key: 'config', value: settings });
    return getSettings();
  }

  return { getSettings, resolveUpdate, updateSettings };
};

export default settingsService;
