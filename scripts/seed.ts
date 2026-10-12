/**
 * Seeds the real Supabase project: demo logins with roles, stations and expeditions.
 * Idempotent — safe to run repeatedly.  Run:  npm run seed
 *
 * Accuracy policy: historical facts below are limited to widely published ones (station
 * names, locations, founding years, the first expedition). Anything we cannot verify is
 * labelled as demo data instead of being presented as NCPOR fact.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || url.includes('127.0.0.1')) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const DEMO_PASSWORD = 'dhruv2026!';

const DEMO_USERS = [
  { email: 'admin@dhruv.dev', full_name: 'Demo Super Admin', role: 'super_admin' },
  { email: 'scientist@dhruv.dev', full_name: 'Demo Scientist', role: 'scientist' },
  { email: 'outreach@dhruv.dev', full_name: 'Demo Outreach Officer', role: 'outreach_officer' },
  { email: 'reviewer@dhruv.dev', full_name: 'Demo Reviewer', role: 'reviewer' },
] as const;

// Illustrative landscape photos (Unsplash licence), not photographs of the stations themselves.
const PHOTO = {
  antarctic: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
  antarctic2: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1200&q=80',
  arctic: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80',
  himalaya: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  historic: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=1200&q=80',
};

const STATIONS = [
  {
    name: 'Dakshin Gangotri',
    name_hi: 'दक्षिण गंगोत्री',
    description_hi: 'अंटार्कटिका में भारत का पहला वैज्ञानिक बेस, जिसे तीसरे भारतीय अंटार्कटिका अभियान (1983-84) के दौरान स्थापित किया गया था। बाद में यह बर्फ में दब गया और इसे बंद कर दिया गया; भारत का अनुसंधान कार्य मैत्री पर स्थानांतरित हो गया।',
    region: 'antarctic',
    lat: -70.083,
    lng: 12.0,
    established_year: 1983,
    status: 'decommissioned',
    description: "India's first scientific base in Antarctica, set up during the Third Indian Expedition to Antarctica (1983-84). It was later buried by ice and decommissioned; India's research moved to Maitri.",
    image: PHOTO.historic,
  },
  {
    name: 'Maitri',
    name_hi: 'मैत्री',
    description_hi: 'भारत का दूसरा स्थायी अंटार्कटिक अनुसंधान केंद्र, जो ड्रोनिंग मॉड लैंड के बर्फ-मुक्त शिरमाकर ओएसिस में स्थित है। यहाँ मौसम विज्ञान, हिमनद विज्ञान (ग्लेशियोलॉजी) और पर्यावरण अध्ययन सहित पूरे वर्ष अवलोकन किए जाते हैं।',
    region: 'antarctic',
    lat: -70.767,
    lng: 11.733,
    established_year: 1989,
    status: 'active',
    description: "India's second permanent Antarctic research station, in the ice-free Schirmacher Oasis of Dronning Maud Land. It supports year-round observations including meteorology, glaciology and environmental studies.",
    image: PHOTO.antarctic,
  },
  {
    name: 'Bharati',
    name_hi: 'भारती',
    description_hi: 'भारत का तीसरा अंटार्कटिक अनुसंधान केंद्र, जो प्रिड्ज़ खाड़ी के तट पर लार्समैन हिल्स में स्थित है और 2012 में शुरू किया गया।',
    region: 'antarctic',
    lat: -69.408,
    lng: 76.193,
    established_year: 2012,
    status: 'active',
    description: "India's third Antarctic research station, in the Larsemann Hills on the Prydz Bay coast, commissioned in 2012.",
    image: PHOTO.antarctic2,
  },
  {
    name: 'Himadri',
    name_hi: 'हिमाद्रि',
    description_hi: 'नॉर्वे के स्वालबार्ड में न्यू-ऑलेसुंड के अंतरराष्ट्रीय अनुसंधान गाँव में स्थित भारत का आर्कटिक अनुसंधान केंद्र, जो 2008 में खोला गया।',
    region: 'arctic',
    lat: 78.925,
    lng: 11.93,
    established_year: 2008,
    status: 'active',
    description: "India's Arctic research station at the international research village of Ny-Ålesund, Svalbard (Norway), opened in 2008.",
    image: PHOTO.arctic,
  },
  {
    name: 'Himansh',
    name_hi: 'हिमांश',
    description_hi: 'हिमाचल प्रदेश के लाहौल-स्पीति की चंद्रा घाटी में स्थित ऊँचाई वाला अनुसंधान केंद्र, जिसे 2016 में हिमालयी ग्लेशियरों और जलवायु परिवर्तन पर उनकी प्रतिक्रिया के अध्ययन के लिए स्थापित किया गया।',
    region: 'himalaya',
    lat: 32.4,
    lng: 77.6,
    established_year: 2016,
    status: 'active',
    description: 'High-altitude research station in the Chandra basin of Lahaul-Spiti, Himachal Pradesh, set up in 2016 to study Himalayan glaciers and their response to climate change.',
    image: PHOTO.himalaya,
  },
];

const EXPEDITIONS = [
  {
    code: 'ISEA-01',
    name_hi: 'अंटार्कटिका के लिए पहला भारतीय अभियान',
    summary_hi: 'अंटार्कटिका के लिए भारत का पहला वैज्ञानिक अभियान। दल 6 दिसंबर 1981 को एमवी पोलर सर्कल जहाज़ से गोवा से रवाना हुआ और जनवरी 1982 में अंटार्कटिका पहुँचा।',
    name: 'First Indian Expedition to Antarctica',
    region: 'antarctic',
    start_date: '1981-12-06',
    end_date: null,
    leader: 'Dr. S. Z. Qasim',
    summary: "India's first scientific expedition to Antarctica. The team sailed from Goa on 6 December 1981 aboard MV Polar Circle and reached Antarctica in January 1982.",
    cover_image: PHOTO.historic,
  },
  {
    code: 'ISEA-03',
    name_hi: 'अंटार्कटिका के लिए तीसरा भारतीय अभियान',
    summary_hi: '1983-84 का अभियान, जिसने अंटार्कटिका में भारत का पहला बेस दक्षिण गंगोत्री स्थापित किया। (आरंभ तिथि अनुमानित।)',
    name: 'Third Indian Expedition to Antarctica',
    region: 'antarctic',
    start_date: '1983-12-01',
    end_date: null,
    leader: 'See NCPOR records',
    summary: "The 1983-84 expedition that set up Dakshin Gangotri, India's first base in Antarctica. (Start date approximate.)",
    cover_image: PHOTO.historic,
  },
  {
    code: 'ISEA-43',
    name_hi: 'अंटार्कटिका के लिए 43वाँ भारतीय वैज्ञानिक अभियान',
    summary_hi: 'डेमो रिकॉर्ड: मैत्री और भारती में अनुसंधान में सहयोग करने वाला 2023-24 का भारतीय अंटार्कटिक अभियान सत्र। तिथियाँ अनुमानित।',
    name: '43rd Indian Scientific Expedition to Antarctica',
    region: 'antarctic',
    start_date: '2023-11-01',
    end_date: null,
    leader: 'See NCPOR records',
    summary: 'Demo record: the 2023-24 Indian Antarctic expedition season supporting research at Maitri and Bharati. Dates approximate.',
    cover_image: PHOTO.antarctic,
  },
  {
    code: 'ISEA-44',
    name_hi: 'अंटार्कटिका के लिए 44वाँ भारतीय वैज्ञानिक अभियान',
    summary_hi: 'डेमो रिकॉर्ड: 2024-25 का भारतीय अंटार्कटिक अभियान सत्र। तिथियाँ अनुमानित।',
    name: '44th Indian Scientific Expedition to Antarctica',
    region: 'antarctic',
    start_date: '2024-11-01',
    end_date: null,
    leader: 'See NCPOR records',
    summary: 'Demo record: the 2024-25 Indian Antarctic expedition season. Dates approximate.',
    cover_image: PHOTO.antarctic2,
  },
  {
    code: 'ARCTIC-2024',
    name_hi: 'हिमाद्रि आर्कटिक ग्रीष्मकालीन अभियान 2024',
    summary_hi: 'डेमो रिकॉर्ड: न्यू-ऑलेसुंड स्थित हिमाद्रि में ग्रीष्मकालीन अनुसंधान अभियान। तिथियाँ अनुमानित।',
    name: 'Himadri Arctic Summer Campaign 2024',
    region: 'arctic',
    start_date: '2024-06-01',
    end_date: null,
    leader: 'See NCPOR records',
    summary: 'Demo record: summer research campaign at Himadri, Ny-Ålesund. Dates approximate.',
    cover_image: PHOTO.arctic,
  },
  {
    code: 'HIM-2024',
    name_hi: 'चंद्रा घाटी हिमनद क्षेत्रीय अभियान 2024',
    summary_hi: 'डेमो रिकॉर्ड: हिमांश केंद्र से हिमनद निगरानी क्षेत्रीय अभियान। तिथियाँ अनुमानित।',
    name: 'Chandra Basin Glacier Field Campaign 2024',
    region: 'himalaya',
    start_date: '2024-09-01',
    end_date: null,
    leader: 'See NCPOR records',
    summary: 'Demo record: glacier monitoring field campaign from Himansh station. Dates approximate.',
    cover_image: PHOTO.himalaya,
  },
];

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function seedUsers() {
  for (const u of DEMO_USERS) {
    let id = await findUserId(u.email);
    if (!id) {
      const { data, error } = await db.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });
      if (error) throw new Error(`Creating ${u.email}: ${error.message}`);
      id = data.user.id;
    }
    // The signup trigger creates the profile with role 'public'; raise it here.
    const { error } = await db.from('profiles').upsert({ id, full_name: u.full_name, role: u.role });
    if (error) throw new Error(`Setting role for ${u.email}: ${error.message}`);
    console.log(`  user ${u.email.padEnd(22)} ${u.role}`);
  }
}

async function main() {
  console.log('Seeding DHRUV →', url);

  console.log('Users (password: %s)', DEMO_PASSWORD);
  await seedUsers();

  const { error: stErr } = await db.from('stations').upsert(STATIONS, { onConflict: 'name' });
  if (stErr) throw new Error(`Stations: ${stErr.message}`);
  console.log(`Stations: ${STATIONS.length}`);

  const { error: exErr } = await db.from('expeditions').upsert(EXPEDITIONS, { onConflict: 'code' });
  if (exErr) throw new Error(`Expeditions: ${exErr.message}`);
  console.log(`Expeditions: ${EXPEDITIONS.length}`);

  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
