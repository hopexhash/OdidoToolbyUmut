/**
 * Local, offline troubleshooting knowledge. Nothing leaves the browser.
 * Matching is keyword based on short description + description + CI.
 */
export interface AdviceRule {
  id: string;
  title: string;
  keywords: RegExp;
  causes: string[];
  steps: string[];
  actions: string[];
  kbTerms: string;
}

export const ADVICE_RULES: AdviceRule[] = [
  {
    id: 'vpn', title: 'VPN / remote access', keywords: /\b(vpn|globalprotect|anyconnect|forticlient|remote access|thuiswerk)/i,
    causes: ['Expired or missing machine/user certificate', 'Outdated VPN client', 'Home network/router blocking (MTU, double NAT)', 'Account locked or MFA not completed'],
    steps: ['Check VPN client version and error code', 'Verify certificate validity (certlm.msc / certmgr.msc)', 'Test on another network (mobile hotspot)', 'Check account status and MFA registration'],
    actions: ['Reinstall/upgrade VPN client', 'Renew certificate', 'Escalate to Network team with client logs if issue persists'],
    kbTerms: 'VPN',
  },
  {
    id: 'outlook', title: 'Outlook / mail', keywords: /\b(outlook|mailbox|e-?mail|exchange|calendar|agenda|mail)\b/i,
    causes: ['Corrupt OST / Outlook profile', 'Faulty add-in', 'Mailbox full', 'Credential prompt loop (modern auth token)'],
    steps: ['Start Outlook in safe mode (outlook.exe /safe)', 'Check mailbox size/quota', 'Test Outlook on the web', 'Clear credentials in Credential Manager'],
    actions: ['Rebuild Outlook profile', 'Disable faulty add-in', 'Request mailbox archive/quota increase'],
    kbTerms: 'Outlook',
  },
  {
    id: 'teams', title: 'Microsoft Teams', keywords: /\b(teams|meeting|vergadering|headset|camera|microfoon|microphone)\b/i,
    causes: ['Corrupt Teams cache', 'Wrong audio/video device selected', 'Outdated Teams client', 'Network/firewall restrictions'],
    steps: ['Check device settings in Teams', 'Clear Teams cache', 'Test call (Settings → Devices → Make a test call)', 'Test via Teams web'],
    actions: ['Reset/reinstall Teams', 'Update audio drivers / headset firmware'],
    kbTerms: 'Teams',
  },
  {
    id: 'account', title: 'Account / password / MFA', keywords: /\b(password|wachtwoord|locked|geblokkeerd|account|login|inlog|sign.?in|mfa|authenticator|2fa)\b/i,
    causes: ['Account locked after failed attempts', 'Expired password', 'MFA method changed (new phone)', 'Cached old credentials on a device'],
    steps: ['Verify identity according to procedure', 'Check lockout status and source', 'Check MFA registration status', 'Remove stale credentials on mobile devices'],
    actions: ['Unlock account / initiate password reset', 'Re-register MFA', 'Escalate to IAM team for persistent lockouts'],
    kbTerms: 'password reset',
  },
  {
    id: 'printer', title: 'Printing', keywords: /\b(print|printer|printen|scan|scanner|follow.?me)\b/i,
    causes: ['Print queue stuck', 'Driver issue', 'Printer offline / out of supplies', 'User not enrolled for follow-me printing'],
    steps: ['Check printer status and queue', 'Remove and re-add printer', 'Test print from another device', 'Verify badge enrolment'],
    actions: ['Restart print spooler', 'Reinstall driver', 'Log facility/vendor call for hardware fault'],
    kbTerms: 'printer',
  },
  {
    id: 'network', title: 'Wi-Fi / network', keywords: /\b(wifi|wi-fi|wlan|netwerk|network|internet|ethernet|lan|dns|no connection|geen verbinding)\b/i,
    causes: ['Outdated wireless driver', 'Wrong Wi-Fi profile / certificate', 'DHCP/DNS issue', 'Local outage'],
    steps: ['ipconfig /all and check IP/DNS', 'Forget and re-add Wi-Fi network', 'Test wired connection', 'Check for known outages'],
    actions: ['Update network driver', 'Reset network stack (netsh winsock reset)', 'Escalate to Network team with location details'],
    kbTerms: 'wifi',
  },
  {
    id: 'performance', title: 'Slow device / performance', keywords: /\b(slow|traag|freeze|hang|bevriest|performance|cpu|memory|geheugen|disk full|schijf vol)\b/i,
    causes: ['High CPU/memory usage by a process', 'Disk almost full', 'Pending updates / reboot required', 'Failing disk or overheating'],
    steps: ['Check Task Manager for top consumers', 'Check free disk space', 'Check uptime and pending reboots', 'Run hardware diagnostics'],
    actions: ['Clean temp files / OneDrive free up space', 'Install updates and reboot', 'Arrange hardware replacement if diagnostics fail'],
    kbTerms: 'slow laptop',
  },
  {
    id: 'hardware', title: 'Hardware defect', keywords: /\b(broken|kapot|defect|screen|scherm|keyboard|toetsenbord|battery|accu|batterij|won'?t boot|start niet|blue screen|bsod|dock|monitor|charger|lader)\b/i,
    causes: ['Physical damage', 'Battery/charger failure', 'Docking station firmware', 'Driver/BIOS issue causing crashes'],
    steps: ['Run vendor hardware diagnostics', 'Test with another charger/dock/monitor', 'Check BIOS/firmware version', 'Check warranty status of the asset'],
    actions: ['Request device replacement (Hardware & POD tab)', 'Update BIOS/dock firmware', 'Log vendor warranty case'],
    kbTerms: 'hardware replacement',
  },
  {
    id: 'onedrive', title: 'OneDrive / SharePoint / files', keywords: /\b(onedrive|sharepoint|sync|synchron|share|bestand|file|folder|map|permission|rechten|toegang|access)\b/i,
    causes: ['Sync client paused or signed out', 'Path too long / invalid characters', 'Missing permissions', 'Storage quota reached'],
    steps: ['Check OneDrive sync status icon', 'Check path length and file names', 'Verify group membership / permissions', 'Check storage quota'],
    actions: ['Reset OneDrive client', 'Request access via the owner', 'Restore previous version / recycle bin'],
    kbTerms: 'OneDrive',
  },
  {
    id: 'software', title: 'Software / application', keywords: /\b(install|software|application|applicatie|app|license|licentie|update|crash|error|foutmelding)\b/i,
    causes: ['Application not assigned to user/device', 'Corrupt installation', 'License not assigned', 'Compatibility with recent update'],
    steps: ['Capture exact error message / screenshot', 'Check software center deployment status', 'Check license assignment', 'Test with another user/device'],
    actions: ['Reinstall application', 'Request license', 'Escalate to application team with logs'],
    kbTerms: 'software installation',
  },
  {
    id: 'mobile', title: 'Mobile device', keywords: /\b(iphone|android|mobile|mobiel|telefoon|intune|company portal|smartphone|tablet|ipad)\b/i,
    causes: ['Device not compliant in Intune', 'Outdated OS', 'Company Portal enrolment issue', 'Mail profile not configured'],
    steps: ['Check Intune compliance state', 'Update OS', 'Sync device in Company Portal', 'Re-add work account'],
    actions: ['Re-enrol device', 'Wipe work profile and re-enrol (with user consent)'],
    kbTerms: 'Intune',
  },
];

export interface AdviceMatch {
  rule: AdviceRule;
  score: number;
}

export function analyse(text: string): AdviceMatch[] {
  const res: AdviceMatch[] = [];
  for (const rule of ADVICE_RULES) {
    const g = new RegExp(rule.keywords.source, 'gi');
    const hits = text.match(g);
    if (hits?.length) res.push({ rule, score: hits.length });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 3);
}

const STOP = new Set('the and for with from that this have has not are was were een het de en van voor met niet bij naar ook dan als zijn wordt is op te in om aan er'.split(' '));
/** Keywords for a ServiceNow knowledge search, derived from the short description. */
export function keywordsFor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 6)
    .join(' ');
}
