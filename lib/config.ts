// URL Web App Apps Script. Bisa diganti lewat env Vercel: NEXT_PUBLIC_APPS_SCRIPT_URL
export const API_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbx0ZJEh2CJwY0jjhk9Gn2Oe7VMEI8ilfXF5egXXQTtv0oT49a42LfbYB8w-c0l8HMPV/exec'

export const TIPE = ['ASSET', 'NON ASSET']
export const STATUS_DISPO = ['On Progres', 'Done']
export const STATUS_MOM = ['Open', 'Done']

export const DEPTS = [
  'Akunting', 'Corporate', 'Retail', 'Digicom', 'Marketing', 'Sales', 'Finance', 'General Affair', 'Human Capital',
  'Legal', 'IT', 'Customer Service', 'Inbound 1', 'Inbound 2', 'Inbound Support',
  'Outbound', 'PAO', 'Branch Business Partner', 'Cianjur', 'Garut', 'Sumedang', 'Rancaekek',
  'Soreang', 'Cimareme',
]

// Singkatan pada Excel lama -> nama baku. Yang tidak dikenal dibiarkan apa adanya.
export const DEPT_ALIAS: Record<string, string> = {
  acc: 'Akunting', akunting: 'Akunting', accounting: 'Akunting',
  corp: 'Corporate', 'corp org': 'Corporate', corporate: 'Corporate',
  ret: 'Retail', retai: 'Retail', retail: 'Retail',
  fin: 'Finance', finance: 'Finance',
  ga: 'General Affair', 'general affair': 'General Affair',
  hc: 'Human Capital', 'human capital': 'Human Capital',
  grt: 'Garut', garut: 'Garut',
  cjr: 'Cianjur', cianjur: 'Cianjur',
  sumedang: 'Sumedang', rancaekek: 'Rancaekek', soreang: 'Soreang', cimareme: 'Cimareme',
  it: 'IT', legal: 'Legal', marketing: 'Marketing', digicom: 'Digicom', pao: 'PAO', outbound: 'Outbound',
  'customer service': 'Customer Service', cs: 'Customer Service',
  'inbound 1': 'Inbound 1', 'inbound 2': 'Inbound 2', 'inbound support': 'Inbound Support',
  bbp: 'Branch Business Partner', 'branch business partner': 'Branch Business Partner',
  'branch businiss partner': 'Branch Business Partner',
}

export const SLA_BM_MAX = 3
export const SLA_NONBM_MAX = 10
export const SLA_SPPD_MAX = 3
