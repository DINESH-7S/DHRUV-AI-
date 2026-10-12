import { Station, Expedition, Asset, ContentPost, Lesson, Quiz } from '../types/database';

export const MOCK_STATIONS: Station[] = [
  {
    id: 'st-maitri',
    name: 'Maitri Research Station',
    region: 'antarctic',
    lat: -70.766,
    lng: 11.733,
    established_year: 1989,
    status: 'active',
    description: 'India\'s second permanent Antarctic research station, located in the ice-free rocky area of Schirmacher Oasis. Conducts meteorology, glaciology, and environmental studies.',
    image: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'st-bharati',
    name: 'Bharati Research Station',
    region: 'antarctic',
    lat: -69.407,
    lng: 76.191,
    established_year: 2012,
    status: 'active',
    description: 'State-of-the-art third Antarctic research facility located in Larsemann Hills. Features energy-efficient architecture and automated atmospheric monitoring systems.',
    image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'st-himadri',
    name: 'Himadri Station',
    region: 'arctic',
    lat: 78.926,
    lng: 11.932,
    established_year: 2008,
    status: 'active',
    description: 'India\'s first Arctic research station located at Ny-Ålesund, Svalbard, Norway. Focuses on aerosol chemistry, fjord dynamics, and Arctic flora.',
    image: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'st-himansh',
    name: 'Himansh Observatory',
    region: 'himalaya',
    lat: 32.401,
    lng: 77.616,
    established_year: 2016,
    status: 'active',
    description: 'High-altitude research station located at 4,000m above sea level in Sutri Dhaka, Lahaul-Spiti valley, Himachal Pradesh for Himalayan glaciology.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'st-dakshin-gangotri',
    name: 'Dakshin Gangotri',
    region: 'antarctic',
    lat: -70.083,
    lng: 12.000,
    established_year: 1983,
    status: 'historic',
    description: 'India\'s historic first scientific base station in Antarctica, established during the third expedition. Currently preserved as a supply depot and historical monument.',
    image: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  }
];

export const MOCK_EXPEDITIONS: Expedition[] = [
  {
    id: 'exp-isea-43',
    name: '43rd Indian Scientific Expedition to Antarctica',
    code: 'ISEA-43',
    region: 'antarctic',
    start_date: '2023-11-15',
    end_date: '2024-04-10',
    leader: 'See NCPOR records',
    summary: 'Focused on ice core drilling, sea ice thickness measurement, and biological sampling across Queen Maud Land and Larsemann Hills.',
    cover_image: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-isea-40',
    name: '40th Indian Scientific Expedition to Antarctica',
    code: 'ISEA-40',
    region: 'antarctic',
    start_date: '2020-12-01',
    end_date: '2021-04-20',
    leader: 'See NCPOR records',
    summary: 'A milestone 40th winter expedition executed under strict health protocols to sustain climate research at Maitri and Bharati.',
    cover_image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-arctic-2024',
    name: 'Indian Arctic Summer Expedition 2024',
    code: 'ARCTIC-2024',
    region: 'arctic',
    start_date: '2024-06-01',
    end_date: '2024-09-15',
    leader: 'See NCPOR records',
    summary: 'Investigated marine biology, toxic metal transport in Kongsfjorden waters, and Arctic warming acceleration effects.',
    cover_image: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-isea-01',
    name: '1st Indian Antarctic Expedition',
    code: 'ISEA-01',
    region: 'antarctic',
    start_date: '1981-12-06',
    end_date: '1982-02-21',
    leader: 'Dr. S. Z. Qasim',
    summary: 'Historic inaugural voyage aboard MV Polar Circle that established India as a leading polar scientific nation under Operation Gangotri.',
    cover_image: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'ast-01',
    type: 'report',
    title: 'Glaciers Melt and Ice Dynamics in Schirmacher Oasis: 2023 Technical Report',
    title_hi: 'शिर्माकर ओएसिस में ग्लेशियर पिघलने और बर्फ की गतिशीलता: 2023 तकनीकी रिपोर्ट',
    description: 'Comprehensive evaluation of surface mass balance, ablation rates, and supraglacial lake discharge measured during the 43rd Antarctic Expedition.',
    file_path: 'expedition-reports/schirmacher-glacier-dynamics-2023.pdf',
    mime_type: 'application/pdf',
    file_size: 14200000,
    thumbnail: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
    expedition_id: 'exp-isea-43',
    station_id: 'st-maitri',
    region: 'antarctic',
    discipline: ['Glaciology', 'Climate Science', 'Hydrology'],
    year: 2023,
    authors: ['Demo Author'],
    doi: '10.6084/m9.figshare.2023.001',
    license: 'CC-BY-4.0',
    access_level: 'public',
    status: 'published',
    ai_summary: 'This report measures mass loss across Schirmacher Oasis glaciers using satellite altimetry and ground radar. Results indicate a net ablation rate of 1.4 meters per year, driven by rising seasonal surface temperatures and albedo loss.',
    ai_summary_simple: 'Scientists studied ice melting near India\'s Maitri station in Antarctica. They found that warmer summer months are causing ice to melt slightly faster than ten years ago.',
    ai_summary_hi: 'यह रिपोर्ट उपग्रह अल्टीमेट्री और ग्राउंड रडार का उपयोग करके शिर्माकर ओएसिस ग्लेशियरों में बर्फ के नुकसान को मापती है। परिणाम बढ़ते मौसमी सतह तापमान के कारण 1.4 मीटर प्रति वर्ष पिघलने की दर दर्शाते हैं।',
    ai_keywords: ['Antarctica', 'Glacier Melt', 'Maitri Station', 'Mass Balance', 'Climate Change'],
    view_count: 1420,
    download_count: 512,
    created_at: '2024-01-15T10:00:00Z',
    published_at: '2024-01-16T12:00:00Z'
  },
  {
    id: 'ast-02',
    type: 'dataset',
    title: 'Kongsfjorden High-Resolution Water Column Salinity & Temperature Time-Series (2024)',
    title_hi: 'कॉोंग्सफ़जोर्डन उच्च-रिज़ॉल्यूशन जल स्तंभ लवणता और तापमान समय-श्रृंखला (2024)',
    description: 'Conductivity-Temperature-Depth (CTD) profile datasets sampled at 15 oceanographic stations inside Svalbard Arctic fjords.',
    file_path: 'datasets/kongsfjorden-ctd-2024.csv',
    mime_type: 'text/csv',
    file_size: 45000000,
    thumbnail: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=600&q=80',
    expedition_id: 'exp-arctic-2024',
    station_id: 'st-himadri',
    region: 'arctic',
    discipline: ['Oceanography', 'Marine Chemistry'],
    year: 2024,
    authors: ['Demo Author'],
    doi: '10.6084/m9.figshare.2024.045',
    license: 'CC-BY-4.0',
    access_level: 'public',
    status: 'published',
    ai_summary: 'Continuous CTD sensor ocean measurements revealing warm Atlantic Water intrusion into Kongsfjorden, impacting local marine ecosystem food webs.',
    ai_summary_simple: 'Data collected by Indian Arctic scientists showing ocean temperatures and salt levels near Svalbard.',
    ai_summary_hi: 'भारतीय आर्क्टिक वैज्ञानिकों द्वारा एकत्र किया गया डेटा जो स्वालबार्ड के पास समुद्र के तापमान और नमक के स्तर को दर्शाता है।',
    ai_keywords: ['Arctic', 'Oceanography', 'Himadri', 'Svalbard', 'CTD Data'],
    view_count: 890,
    download_count: 310,
    created_at: '2024-07-20T09:30:00Z',
    published_at: '2024-07-22T14:00:00Z'
  },
  {
    id: 'ast-03',
    type: 'photo',
    title: 'Aurora Australis Illuminating Bharati Station Dome at Midnight',
    title_hi: 'मध्यरात्रि में भारती स्टेशन गुंबद को रोशन करता औरोरा ऑस्ट्रेलिस',
    description: 'High-exposure photography capturing intense geomagnetic green and violet aurora curtains above the Bharati research facility in Larsemann Hills.',
    file_path: 'media/photos/aurora-bharati-2023.jpg',
    mime_type: 'image/jpeg',
    file_size: 8900000,
    thumbnail: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=600&q=80',
    expedition_id: 'exp-isea-43',
    station_id: 'st-bharati',
    region: 'antarctic',
    discipline: ['Atmospheric Science', 'Space Physics'],
    year: 2023,
    authors: ['NCPOR (demo)'],
    license: 'CC-BY-4.0',
    access_level: 'public',
    status: 'published',
    ai_summary: 'Dramatic imagery of southern lights aurora phenomenon interacting with ionospheric particles above Bharati Station.',
    ai_summary_simple: 'A beautiful night sky photo of green lights (Aurora) glowing over India\'s Bharati station in Antarctica.',
    ai_summary_hi: 'अंटार्कटिका में भारत के भारती स्टेशन के ऊपर हरे रंग की रोशनी (औरौरा) की एक सुंदर रात के आकाश की तस्वीर।',
    ai_keywords: ['Aurora Australis', 'Bharati Station', 'Antarctica', 'Night Sky', 'NCPOR'],
    ai_caption: 'Vibrant green Aurora Australis dances above the glowing Bharati Station in Antarctica.',
    alt_text: 'Bharati research station dome glowing in warm light under vibrant green aurora australis in the dark Antarctic night sky.',
    view_count: 3450,
    download_count: 1280,
    created_at: '2023-12-01T15:00:00Z',
    published_at: '2023-12-02T10:00:00Z'
  },
  {
    id: 'ast-04',
    type: 'publication',
    title: 'Aerosol Black Carbon Dynamics Over Chandra Basin, Western Himalayas',
    title_hi: 'पश्चिमी हिमालय के चंद्रा बेसिन पर एरोसोल ब्लैक कार्बन गतिशीलता',
    description: 'Peer-reviewed research paper published in Journal of Environmental Management analyzing black carbon pollution deposits on Himalayan glaciers.',
    file_path: 'publications/himalaya-black-carbon-2023.pdf',
    mime_type: 'application/pdf',
    file_size: 6700000,
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    station_id: 'st-himansh',
    region: 'himalaya',
    discipline: ['Glaciology', 'Environmental Science'],
    year: 2023,
    authors: ['Demo Author'],
    doi: '10.1016/j.jenvman.2023.1098',
    license: 'CC-BY-NC-4.0',
    access_level: 'public',
    status: 'published',
    ai_summary: 'Study analyzing black carbon concentrations monitored continuously at Himansh Observatory (4000m). Data confirms long-range transport of soot particles from plains accelerating snow melt rates by 12%.',
    ai_summary_simple: 'Scientists at Himansh station found that soot pollution from cities travels up to high mountain glaciers and causes them to melt faster.',
    ai_summary_hi: 'हिमांश स्टेशन के वैज्ञानिकों ने पाया कि शहरों का धुआं और कालिख ऊंचे हिमालयी ग्लेशियरों तक पहुंचती है और उन्हें तेजी से पिघलाती है।',
    ai_keywords: ['Himalaya', 'Himansh', 'Black Carbon', 'Glacier Melting', 'Soot'],
    view_count: 1120,
    download_count: 430,
    created_at: '2023-09-10T11:00:00Z',
    published_at: '2023-09-12T09:00:00Z'
  }
];

export const MOCK_POSTS: ContentPost[] = [
  {
    id: 'post-01',
    asset_id: 'ast-01',
    channel: 'x',
    language: 'en',
    body: '❄️ New research from India\'s 43rd Antarctic Expedition! Scientists at Maitri Station measured glacier ice dynamics in Schirmacher Oasis. Rising seasonal temps contribute to 1.4m annual ablation. Explore full dataset & report on DHRUV! 🇮🇳🇦🇳 #PolarScience #NCPOR #Maitri',
    hashtags: ['#PolarScience', '#NCPOR', '#Antarctica', '#ClimateChange'],
    image_url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    status: 'approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'post-02',
    asset_id: 'ast-03',
    channel: 'instagram',
    language: 'en',
    body: 'Dancing Lights of Antarctica! 🌌✨\n\nWhen the polar night sets in over Larsemann Hills, the sky turns into a celestial canvas. Here is Bharati Station glowing beneath an ethereal curtain of Aurora Australis captured during the 43rd Indian Scientific Expedition.\n\n📸 Photo by NCPOR Expedition Team\n\nDiscover more polar stories on DHRUV — National Polar Knowledge Portal.',
    hashtags: ['#Antarctica', '#AuroraAustralis', '#BharatiStation', '#NCPOR', '#MoES', '#SouthernLights', '#PolarResearch'],
    image_url: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1200&q=80',
    status: 'approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'post-03',
    asset_id: 'ast-04',
    channel: 'linkedin',
    language: 'en',
    body: 'High-Altitude Himalayan Research Update 🏔️\n\nResearch published by NCPOR scientists operating from Himansh Observatory (4,000m ASL in Lahaul-Spiti) sheds light on aerosol black carbon deposition over western Himalayan glaciers.\n\nKey finding: Anthropogenic soot transport accelerates local snow cover ablation by 12%. Understanding these dynamics is vital for regional water security.\n\nRead the full open-access publication on the DHRUV Portal.',
    hashtags: ['#HimalayanGlaciology', '#ClimateScience', '#NCPOR', '#MoES', '#ResearchImpact'],
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    status: 'scheduled',
    scheduled_at: '2026-10-01T09:00:00Z',
    created_at: new Date().toISOString()
  }
];

export const MOCK_LESSONS: Lesson[] = [
  {
    id: 'les-01',
    asset_id: 'ast-01',
    title: 'Understanding Antarctic Glaciers and Ice Sheets',
    grade_band: '9-10',
    language: 'en',
    content_md: `# Understanding Antarctic Glaciers and Ice Sheets

## 1. Introduction
Antarctica holds about 70% of the world's fresh water in the form of ice. Indian scientists at **Maitri Station** continuously monitor how glaciers melt and move in an area called the **Schirmacher Oasis**.

## 2. What is Surface Ablation?
Ablation refers to the removal of ice from a glacier due to melting, evaporation, or iceberg calving. During summer months, sunlight warms the dark rocky surfaces around Maitri, causing nearby ice to melt at a rate of roughly 1.4 meters per year.

## 3. Did You Know?
- **Maitri Station** was established in 1989 and operates 365 days a year!
- Glaciers move under their own weight like very slow rivers of ice.

## 4. Key Vocabulary
- **Glaciology:** The scientific study of glaciers and ice.
- **Mass Balance:** The difference between ice gained by snowfall and ice lost by melting.
`,
    learning_objectives: [
      'Explain how ice mass balance is measured in Antarctica',
      'Identify the location and significance of India\'s Maitri Research Station',
      'Describe the effect of seasonal temperature variations on glacier melt'
    ],
    status: 'published',
    created_at: new Date().toISOString()
  }
];

export const MOCK_QUIZZES: Quiz[] = [
  {
    id: 'quiz-01',
    lesson_id: 'les-01',
    questions: [
      {
        q: 'In which year was India\'s Maitri Research Station established in Antarctica?',
        options: ['1981', '1989', '2008', '2012'],
        answer_index: 1,
        explanation: 'Maitri Station was established in 1989 in the Schirmacher Oasis area of Antarctica.'
      },
      {
        q: 'What percentage of the world\'s fresh water is held in the Antarctic ice sheet?',
        options: ['25%', '50%', '70%', '90%'],
        answer_index: 2,
        explanation: 'Antarctica holds roughly 70% of Earth\'s fresh water locked in its massive ice sheets.'
      },
      {
        q: 'What term describes the loss of ice from a glacier due to melting or evaporation?',
        options: ['Accretion', 'Ablation', 'Sublimation', 'Compaction'],
        answer_index: 1,
        explanation: 'Ablation is the scientific term for net ice loss from a glacier.'
      },
      {
        q: 'Where is India\'s high-altitude Himalayan glaciology observatory "Himansh" located?',
        options: ['Svalbard', 'Schirmacher Oasis', 'Lahaul-Spiti, Himachal Pradesh', 'Larsemann Hills'],
        answer_index: 2,
        explanation: 'Himansh Observatory is located at 4,000m altitude in Lahaul-Spiti, Himachal Pradesh.'
      }
    ]
  }
];
