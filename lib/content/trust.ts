/**
 * Text of the trust pages (/about, /privacy, /accessibility, /ai-policy) in English and Hindi.
 * Every statement describes how this prototype actually works; update it when the code changes.
 */

export type TrustSlug = 'about' | 'privacy' | 'accessibility' | 'ai-policy';

interface Section {
  h: string;
  p?: string[];
  list?: string[];
}

export interface TrustPage {
  title: string;
  intro: string;
  sections: Section[];
}

type Bilingual = Record<'en' | 'hi', TrustPage>;

export const TRUST_UPDATED = '2026-09-26';

export const TRUST: Record<TrustSlug, Bilingual> = {
  about: {
    en: {
      title: 'About DHRUV',
      intro:
        "DHRUV is a prototype outreach, knowledge and media portal for India's polar and Himalayan science, built for Smart India Hackathon problem statement SIH26063 (Ministry of Earth Sciences / NCPOR). It is not an official Government of India website, and it does not speak for NCPOR, the Ministry or PIB.",
      sections: [
        {
          h: 'What it does',
          list: [
            'Keeps reports, datasets, publications, photos, videos and institutional activities in one bilingual archive.',
            'Uses AI to catalogue each item: English and Hindi summaries, keywords, captions, video chapters. A person approves before anything goes out.',
            'Ask Dhruv answers questions from the archive only, with numbered citations that open the exact page or video minute.',
            'Turns archive items into school lessons, quizzes and verifiable certificates, and into drafts for news and social media.',
          ],
        },
        {
          h: 'Where the content comes from',
          p: [
            "Everything in the archive links to its source: NCPOR's website and YouTube channel, NCPOR's National Polar Data Center, PIB releases, NSIDC, and Wikimedia Commons photographers. Each item's page names its owner and licence. Videos are embedded from YouTube, never copied.",
          ],
        },
        {
          h: 'Built on open source',
          p: [
            'Next.js, PostgreSQL with pgvector (Supabase), three.js and next-intl, all open source. AI runs either on a free hosted tier (Google Gemini) or fully on DHRUV\'s own hardware with open models (Ollama with Qwen3 and Gemma 3), so the portal can run inside India with no AI bill and no vendor lock-in.',
          ],
        },
      ],
    },
    hi: {
      title: 'DHRUV के बारे में',
      intro:
        'DHRUV भारत के ध्रुवीय और हिमालयी विज्ञान के लिए एक प्रोटोटाइप आउटरीच, ज्ञान और मीडिया पोर्टल है, जिसे स्मार्ट इंडिया हैकाथॉन की समस्या SIH26063 (पृथ्वी विज्ञान मंत्रालय / NCPOR) के लिए बनाया गया है। यह भारत सरकार की आधिकारिक वेबसाइट नहीं है और NCPOR, मंत्रालय या PIB की ओर से नहीं बोलती।',
      sections: [
        {
          h: 'यह क्या करता है',
          list: [
            'रिपोर्ट, डेटासेट, प्रकाशन, तस्वीरें, वीडियो और संस्थागत गतिविधियाँ एक ही द्विभाषी संग्रह में रखता है।',
            'हर सामग्री को AI से सूचीबद्ध करता है: अंग्रेज़ी और हिंदी सारांश, कीवर्ड, कैप्शन, वीडियो अध्याय। कुछ भी बाहर जाने से पहले एक व्यक्ति स्वीकृति देता है।',
            'आस्क ध्रुव केवल संग्रह से उत्तर देता है, क्रमांकित स्रोतों के साथ जो सही पृष्ठ या वीडियो का सही मिनट खोलते हैं।',
            'संग्रह सामग्री से स्कूल पाठ, प्रश्नोत्तरी और सत्यापन-योग्य प्रमाणपत्र, तथा समाचार व सोशल मीडिया के मसौदे बनाता है।',
          ],
        },
        {
          h: 'सामग्री कहाँ से आती है',
          p: [
            'संग्रह की हर सामग्री अपने स्रोत से जुड़ी है: NCPOR की वेबसाइट और यूट्यूब चैनल, NCPOR का राष्ट्रीय ध्रुवीय डेटा केंद्र, PIB विज्ञप्तियाँ, NSIDC और विकिमीडिया कॉमन्स के फ़ोटोग्राफ़र। हर सामग्री के पृष्ठ पर उसके स्वामी और लाइसेंस का नाम है। वीडियो यूट्यूब से एम्बेड किए जाते हैं, कभी कॉपी नहीं किए जाते।',
          ],
        },
        {
          h: 'ओपन सोर्स पर आधारित',
          p: [
            'Next.js, pgvector के साथ PostgreSQL (Supabase), three.js और next-intl, सभी ओपन सोर्स। AI या तो मुफ़्त होस्टेड सेवा (Google Gemini) पर चलता है या पूरी तरह DHRUV के अपने हार्डवेयर पर ओपन मॉडलों (Qwen3 और Gemma 3 के साथ Ollama) से, ताकि पोर्टल भारत के भीतर, बिना AI बिल और बिना किसी एक कंपनी पर निर्भर हुए चल सके।',
          ],
        },
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy',
      intro: 'DHRUV collects as little as it can. Visitors do not need an account, and there are no advertising or tracking scripts.',
      sections: [
        {
          h: 'What is stored',
          list: [
            'Ask Dhruv questions and answers, with a random session number and the items cited. No name or IP address is stored with them. Staff use them to see what the archive cannot answer yet ("What India asks").',
            'Certificates: the name and school a learner types, the lesson and the score, so anyone can verify the certificate.',
            'View and download counts for each archive item, with no personal data.',
            'Staff accounts: email address, role and an audit log of what each staff member approved or published.',
          ],
        },
        {
          h: 'Cookies',
          list: [
            'NEXT_LOCALE remembers English or Hindi.',
            'Sign-in cookies, for staff only.',
          ],
        },
        {
          h: 'Other services',
          list: [
            'YouTube (privacy-enhanced mode) loads only after you press play on a video.',
            "Weather at the stations comes from Open-Meteo. DHRUV's server asks for it, so your browser does not contact Open-Meteo.",
            "Ask Dhruv sends your question and the archive excerpts to the AI engine. On the hosted engine (Google Gemini free tier), Google's terms allow it to use this to improve its services, so do not type personal information. In sovereign mode the open-source model runs on DHRUV's own server and nothing leaves it.",
          ],
        },
      ],
    },
    hi: {
      title: 'गोपनीयता',
      intro: 'DHRUV कम से कम जानकारी रखता है। आगंतुकों को खाते की ज़रूरत नहीं है, और कोई विज्ञापन या ट्रैकिंग स्क्रिप्ट नहीं है।',
      sections: [
        {
          h: 'क्या सहेजा जाता है',
          list: [
            'आस्क ध्रुव के प्रश्न और उत्तर, एक यादृच्छिक सत्र संख्या और उद्धृत सामग्री के साथ। इनके साथ कोई नाम या IP पता नहीं सहेजा जाता। स्टाफ़ इनसे देखता है कि संग्रह अभी किन प्रश्नों का उत्तर नहीं दे पाता ("भारत क्या पूछता है")।',
            'प्रमाणपत्र: शिक्षार्थी द्वारा लिखा नाम और स्कूल, पाठ और अंक, ताकि कोई भी प्रमाणपत्र की पुष्टि कर सके।',
            'हर संग्रह सामग्री के देखे जाने और डाउनलोड की संख्या, बिना किसी निजी जानकारी के।',
            'स्टाफ़ खाते: ईमेल पता, भूमिका और एक लेखा-पंजी कि किस स्टाफ़ सदस्य ने क्या स्वीकृत या प्रकाशित किया।',
          ],
        },
        {
          h: 'कुकीज़',
          list: ['NEXT_LOCALE आपकी भाषा (अंग्रेज़ी या हिंदी) याद रखती है।', 'साइन-इन कुकीज़, केवल स्टाफ़ के लिए।'],
        },
        {
          h: 'अन्य सेवाएँ',
          list: [
            'यूट्यूब (गोपनीयता-संवर्धित मोड) केवल तब लोड होता है जब आप वीडियो चलाते हैं।',
            'केंद्रों का मौसम Open-Meteo से आता है। इसे DHRUV का सर्वर माँगता है, आपका ब्राउज़र Open-Meteo से संपर्क नहीं करता।',
            'आस्क ध्रुव आपका प्रश्न और संग्रह के अंश AI इंजन को भेजता है। होस्टेड इंजन (Google Gemini मुफ़्त स्तर) पर Google की शर्तें उसे अपनी सेवाएँ सुधारने के लिए इनका उपयोग करने देती हैं, इसलिए निजी जानकारी न लिखें। स्वदेशी मोड में ओपन-सोर्स मॉडल DHRUV के अपने सर्वर पर चलता है और कुछ भी बाहर नहीं जाता।',
          ],
        },
      ],
    },
  },
  accessibility: {
    en: {
      title: 'Accessibility',
      intro:
        'DHRUV aims to meet WCAG 2.1 level AA, as the Guidelines for Indian Government Websites (GIGW) require. Automated checks (axe) report no violations on the public pages in English and Hindi; that does not replace testing with people who use assistive technology.',
      sections: [
        {
          h: 'What is in place',
          list: [
            'Every public page in English and Hindi, with the language marked for screen readers.',
            'Full keyboard use, visible focus, and a "Skip to main content" link.',
            'Animations switch off when your device asks for reduced motion.',
            'Photos carry text alternatives drafted by AI from the photo and its credit.',
            'Every station on the 3D globe is also a plain button, and the live station panel is plain text.',
          ],
        },
        {
          h: 'Known limits',
          list: [
            'Original PDF reports come from their publishers and may not be accessible. Their summaries on DHRUV are.',
            "Video captions are YouTube's own and depend on what the channel provides.",
            'Expedition route maps are schematic pictures; the stops are also listed in text next to each map.',
          ],
        },
      ],
    },
    hi: {
      title: 'सुगम्यता',
      intro:
        'DHRUV का लक्ष्य WCAG 2.1 स्तर AA को पूरा करना है, जैसा भारत सरकार की वेबसाइटों के दिशानिर्देश (GIGW) माँगते हैं। स्वचालित जाँच (axe) अंग्रेज़ी और हिंदी के सार्वजनिक पृष्ठों पर कोई उल्लंघन नहीं दिखाती; यह सहायक तकनीक का उपयोग करने वाले लोगों के साथ परीक्षण का विकल्प नहीं है।',
      sections: [
        {
          h: 'क्या उपलब्ध है',
          list: [
            'हर सार्वजनिक पृष्ठ अंग्रेज़ी और हिंदी में, स्क्रीन रीडर के लिए भाषा चिह्नित।',
            'पूरा कीबोर्ड उपयोग, दिखाई देने वाला फ़ोकस, और "मुख्य सामग्री पर जाएँ" लिंक।',
            'जब आपका उपकरण कम गति माँगता है, तो एनिमेशन बंद हो जाते हैं।',
            'तस्वीरों के पाठ्य विकल्प AI ने तस्वीर और उसके श्रेय से तैयार किए हैं।',
            '3D ग्लोब का हर केंद्र एक सामान्य बटन भी है, और लाइव केंद्र पैनल सादा पाठ है।',
          ],
        },
        {
          h: 'ज्ञात सीमाएँ',
          list: [
            'मूल PDF रिपोर्टें उनके प्रकाशकों की हैं और हो सकता है सुगम्य न हों। DHRUV पर उनके सारांश सुगम्य हैं।',
            'वीडियो कैप्शन यूट्यूब के अपने हैं और चैनल पर उपलब्ध होने पर निर्भर करते हैं।',
            'अभियान मार्ग के मानचित्र योजनाबद्ध चित्र हैं; पड़ाव हर मानचित्र के पास पाठ में भी लिखे हैं।',
          ],
        },
      ],
    },
  },
  'ai-policy': {
    en: {
      title: 'AI and content policy',
      intro: 'AI does the heavy lifting on DHRUV; people decide what is published. These are the rules the code enforces.',
      sections: [
        {
          h: 'What the AI does',
          list: [
            'Drafts summaries in English and Hindi, keywords, photo captions and text alternatives, and video chapters.',
            'Answers questions from archive excerpts only, with citations, and says so when the archive has no answer.',
            'Drafts lessons, quizzes, news stories, social posts and content briefs for the outreach team.',
          ],
        },
        {
          h: 'What people do',
          list: [
            'A reviewer approves every AI draft before it is published, and the person who generated a post cannot approve it. Every approval is logged.',
            'Items loaded in bulk by the DHRUV team are labelled "not yet checked by DHRUV staff" until a reviewer checks them against the source.',
            'Staff can take any item off the site at once.',
          ],
        },
        {
          h: 'Sources and credit',
          list: [
            'Every item names its owner, licence and source link. Nothing is presented as published or endorsed by NCPOR, the Ministry of Earth Sciences or PIB.',
            'The AI is told never to invent numbers, dates or names. If a fact cannot be traced to a source, it is left out.',
            'Weather on the station panels is model data from Open-Meteo, not the stations\' own instruments, and says so.',
          ],
        },
      ],
    },
    hi: {
      title: 'AI और सामग्री नीति',
      intro: 'DHRUV पर भारी काम AI करता है; क्या प्रकाशित होगा, यह लोग तय करते हैं। ये नियम कोड में लागू हैं।',
      sections: [
        {
          h: 'AI क्या करता है',
          list: [
            'अंग्रेज़ी और हिंदी में सारांश, कीवर्ड, तस्वीरों के कैप्शन व पाठ्य विकल्प, और वीडियो अध्याय तैयार करता है।',
            'केवल संग्रह के अंशों से स्रोतों सहित उत्तर देता है, और जब संग्रह में उत्तर नहीं होता तो साफ़ बताता है।',
            'आउटरीच टीम के लिए पाठ, प्रश्नोत्तरी, समाचार, सोशल पोस्ट और सामग्री-योजनाओं के मसौदे बनाता है।',
          ],
        },
        {
          h: 'लोग क्या करते हैं',
          list: [
            'हर AI मसौदे को प्रकाशन से पहले एक समीक्षक स्वीकृत करता है, और जिसने पोस्ट बनाई वह उसे स्वीकृत नहीं कर सकता। हर स्वीकृति दर्ज होती है।',
            'DHRUV टीम द्वारा एक साथ लोड की गई सामग्री पर तब तक "DHRUV टीम ने अभी जाँचा नहीं" लिखा रहता है जब तक कोई समीक्षक उसे स्रोत से मिलाकर न जाँच ले।',
            'स्टाफ़ किसी भी सामग्री को तुरंत साइट से हटा सकता है।',
          ],
        },
        {
          h: 'स्रोत और श्रेय',
          list: [
            'हर सामग्री पर उसके स्वामी, लाइसेंस और स्रोत का लिंक है। कुछ भी NCPOR, पृथ्वी विज्ञान मंत्रालय या PIB द्वारा प्रकाशित या समर्थित के रूप में नहीं दिखाया जाता।',
            'AI को निर्देश है कि वह कभी संख्याएँ, तिथियाँ या नाम न गढ़े। जो तथ्य किसी स्रोत तक न पहुँचे, उसे छोड़ दिया जाता है।',
            'केंद्र पैनलों पर मौसम Open-Meteo का मॉडल डेटा है, केंद्रों के अपने उपकरणों का नहीं, और यह वहाँ लिखा है।',
          ],
        },
      ],
    },
  },
};
