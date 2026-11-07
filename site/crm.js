// Sign-up submission adapter. Not connected to anything yet.
// To connect a CRM later, set CRM.endpoint (and headers if needed) or replace submitSignup's body
// with the CRM SDK call (HubSpot, Zoho, Salesforce, etc.). The form already sends one clean object:
// { name, email, phone, city, role, interests[], newsletter, consentAt, source }
export const CRM = { endpoint: null, headers: { 'Content-Type': 'application/json' } };

export async function submitSignup(lead) {
  if (!CRM.endpoint) {
    await new Promise(r => setTimeout(r, 650));          // simulate the round trip
    return { ok: true, connected: false };
  }
  const res = await fetch(CRM.endpoint, { method: 'POST', headers: CRM.headers, body: JSON.stringify(lead) });
  if (!res.ok) throw new Error(`CRM responded ${res.status}`);
  return { ok: true, connected: true };
}
