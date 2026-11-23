import { SnRest } from './rest';

export interface KbArticle {
  sysId: string;
  number: string;
  title: string;
  url: string;
}

/** Searches the *same* ServiceNow instance's knowledge base (no external traffic). */
export async function searchKnowledge(gck: string | null, terms: string, limit = 6): Promise<KbArticle[]> {
  if (!terms.trim()) return [];
  const rest = new SnRest(location.origin, gck);
  const rows = await rest.query<Record<string, string>>(
    'kb_knowledge',
    `workflow_state=published^123TEXTQUERY321=${terms}`,
    ['sys_id', 'number', 'short_description'],
    limit,
  );
  return rows.map((r) => ({
    sysId: r.sys_id,
    number: r.number,
    title: r.short_description,
    url: `${location.origin}/kb_view.do?sysparm_article=${encodeURIComponent(r.number)}`,
  }));
}

export interface AssetRow {
  sysId: string;
  table: string;
  name: string;
  assetTag: string;
  serial: string;
  model: string;
  status: string;
  className: string;
}

/** Hardware assets and computers assigned to the user (respects the user's ACLs). */
export async function loadUserAssets(gck: string | null, userSysId: string): Promise<AssetRow[]> {
  const rest = new SnRest(location.origin, gck);
  const [hw, ci] = await Promise.allSettled([
    rest.query<Record<string, string>>('alm_hardware', `assigned_to=${userSysId}^install_status!=7`, ['sys_id', 'display_name', 'asset_tag', 'serial_number', 'model', 'install_status', 'model_category'], 25),
    rest.query<Record<string, string>>('cmdb_ci_hardware', `assigned_to=${userSysId}^operational_status=1`, ['sys_id', 'name', 'asset_tag', 'serial_number', 'model_id', 'install_status', 'sys_class_name'], 25),
  ]);
  const out: AssetRow[] = [];
  if (hw.status === 'fulfilled')
    for (const r of hw.value)
      out.push({ sysId: r.sys_id, table: 'alm_hardware', name: r.display_name, assetTag: r.asset_tag, serial: r.serial_number, model: r.model, status: r.install_status, className: r.model_category || 'Asset' });
  if (ci.status === 'fulfilled')
    for (const r of ci.value) {
      if (out.some((o) => o.serial && o.serial === r.serial_number)) continue;
      out.push({ sysId: r.sys_id, table: 'cmdb_ci_hardware', name: r.name, assetTag: r.asset_tag, serial: r.serial_number, model: r.model_id, status: r.install_status, className: r.sys_class_name || 'CI' });
    }
  if (hw.status === 'rejected' && ci.status === 'rejected') throw hw.reason;
  return out;
}

export interface CiDetails {
  sysId: string;
  name: string;
  className: string;
  serial: string;
  assetTag: string;
  model: string;
  manufacturer: string;
  os: string;
  ip: string;
  location: string;
  status: string;
}

export async function loadCi(gck: string | null, sysId: string): Promise<CiDetails> {
  const rest = new SnRest(location.origin, gck);
  const r = await rest.get<Record<string, string>>(`/api/now/table/cmdb_ci/${sysId}`, {
    sysparm_display_value: 'true',
    sysparm_exclude_reference_link: 'true',
    sysparm_fields: 'sys_id,name,sys_class_name,serial_number,asset_tag,model_id,manufacturer,os,ip_address,location,install_status',
  });
  return {
    sysId, name: r.name, className: r.sys_class_name, serial: r.serial_number, assetTag: r.asset_tag, model: r.model_id,
    manufacturer: r.manufacturer, os: r.os || '', ip: r.ip_address || '', location: r.location, status: r.install_status,
  };
}
