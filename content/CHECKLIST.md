# A1 content pack: what to check

Claude found and recorded everything below on 26 Sep 2026. Every item comes from NCPOR itself (its website, its official YouTube channel, its data portal) or from PIB. Your job is to confirm it with your own eyes before the portal shows it. NCPOR judges will recognise their own material, so one wrong date costs more than ten missing items.

**How to check an item** (about 1 minute each):
1. Click the link. It should open and match the title.
2. For events, read the source and compare it with the `summary` in `events.json`. Is every fact in the summary also in the source?
3. If the "Check this" column says something, look at that specifically.
4. Tick the box (change ☐ to ☑). If something is wrong, fix the JSON or tell Claude.

The data lives in three files next to this one:
- `videos.json`: 18 videos. They are **embedded only**, never downloaded, so no copyright problem.
- `events.json`: 17 institutional activities, each with a source link.
- `datasets.json`: 5 NCPOR datasets. `npm run fetch-datasets` downloads them.

## Also check the AI's output (added 26 Sep, after import)

Everything in this pack is now live in the portal. Gemini watched each video and wrote summaries, chapters and a timestamped digest, and it wrote Hindi titles and summaries for the events and reports.

**How the site labels this now.** Until a person checks an item, its page says "AI-assisted summary · not yet checked by DHRUV staff". To check one, sign in as the reviewer, open **Admin → Review queue**, and use the list "Live but not yet checked by a person": open the item, compare the summary with its source, then press **Mark as checked** (or **Take off site** if it is wrong). The label then changes to "approved by DHRUV staff", and the approval is recorded in the audit log. Do the five demo videos and the ATCM, Bharati post office and South Pole items first.

**Resolved:** the South Pole date. NCPOR's own page ([Significant Achievements](https://ncpor.res.in/antarcticas/display/369-significant-achievements-)) says the team reached the Pole on **21 November 2010** and returned to Maitri on 1 December 2010. The AI's "22 November" has been corrected in the summaries and the search text.

The expedition's own report (30th ISEA, day log) agrees: Day 9 was 21 November, and the team radioed the Pole station at 16:00 GMT and drove the last 20 km that evening. The AI's summary of that report had also said 22 November; it has been corrected the same way. ⚑ **Distance still differs:** NCPOR's website says 2,300 km, the AI summary of the report says 2,240 km, and the report's day log gives 2,433 km at the last camp before the Pole. Check the report's pages and tell Claude which figure to use; until then the site uses NCPOR's 2,300 km.

**Resolved:** the team names. NCPOR's repository lists the South Pole report's authors as Rasik Ravindra, Mirza Javed Beg, Ajay Dhar, Pradeep Malhotra, Thamban Meloth, Ashit Swain, K. Krishnamurthy and Surat Singh (eight, matching the eight-member team). [Source](http://14.139.119.23:8080/dspace/handle/123456789/1260)

## Round 2 (26 Sep): expeditions, reports, publications, photos

**Expedition pages** (`content/expeditions.json`, loaded with `npm run import-expeditions`). Each fact has a source link on the page. Check the ones marked ⚑.

| ✓ | Code | Facts to check | Source |
|---|---|---|---|
| ☐ | ISEA-01 | Left Mormugao 6 Dec 1981, landed 9 Jan 1982, back 21 Feb 1982; 21 members; leader S. Z. Qasim. ⚑ "21 members" and the landing date come from a PTI news report, not NCPOR | [DSpace report](http://14.139.119.23:8080/dspace/handle/123456789/126), [PTI](https://www.deccanherald.com/india/indias-first-antarctica-mission-was-top-secret-felt-like-being-in-james-bond-film-recall-members-2792699) |
| ☐ | ISEA-02 | Leader V. K. Raina; 56 days on the continent; blizzard 19–20 Jan 1983; back in Goa 21 Mar 1983 | [DSpace report](http://14.139.119.23:8080/dspace/handle/123456789/161) |
| ☐ | ISEA-03 | Leader Harsh K. Gupta; sailed 3 Dec 1983; wintering from 1 Mar 1984 (12 members); summer team back 29 Mar 1984; wintering team back 25 Mar 1985. ⚑ Station commissioned 26 Jan 1984 comes from Wikipedia | [DSpace report](http://14.139.119.23:8080/dspace/handle/123456789/202) |
| ☐ | SPE-2010 | 8 members, 2,300 km in 9 days, Pole on 21 Nov 2010, back at Maitri 1 Dec 2010 | [NCPOR](https://ncpor.res.in/antarcticas/display/369-significant-achievements-) |
| ☐ | ISEA-42 | Launched from Goa 22 Oct 2022 | [NCPOR](https://ncpor.res.in/pages/view/247-expedition-updates) |
| ☐ | ARCTIC-WINTER-2023 | Flagged off 18 Dec 2023 | [PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1987724) |
| ☐ | ISEA-43 | Cargo at Mormugao 20–24 Nov 2023; left Cape Town 23 Dec; Antarctic waters 3 Jan 2024; 21+1+2 members | [PIB](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1993769) |
| ☐ | ISEA-44 | Theme and GeoEAIS; shown as the "2024–25 season". ⚑ The season is inferred from the numbering | [NCPOR](https://ncpor.res.in/news/view/726) |
| ☐ | ISEA-45 | Left Mumbai 31 Oct 2025; at Maitri via Novo 4 Nov 2025 | [NCPOR](https://ncpor.res.in/news/view/929) |
| ☐ | ARCTIC-17 | Pledge at Himadri 9 Sep 2026 | [NCPOR](https://ncpor.res.in/news/view/1049) |
| ☐ | HIM-SAMUDRA-TAPU-2026 | Second field task, HydroMat site, sub-bottom profiling (reported 25 Sep 2026) | [NCPOR](https://ncpor.res.in/news/view/1056) |

The seed's ARCTIC-2024 and HIM-2024 records had approximate dates and no source, so they are **hidden** from the public site until a source is found.

The home page now says **45** Indian Antarctic expeditions ([NCPOR news 929](https://ncpor.res.in/news/view/929): the 45th reached Maitri on 4 Nov 2025).

**Expedition reports** from NCPOR's DSpace repository (the official "Scientific Report of the ... Indian Expedition to Antarctica" series): the introductions of the 1st, 2nd and 3rd reports, the Dakshin Gangotri article, and from the 30th report the South Pole expedition report and the expedition overview. The two 30th-expedition files are scans; DHRUV's copies have re-compressed images to fit free storage, and each page links to the original. ⚑ Their year is set to 2010 (the expedition season); the publication year is not in the repository record.

**Publications** (open access, CC BY 4.0, each with a DOI and NCPOR co-authors identified through OpenAlex): Record Low Antarctic Sea Ice Cover in February 2022 (GRL); The Dominant Role of Extreme Precipitation Events in Antarctic Snowfall Variability (GRL, 2019); Increased influence of ENSO on Antarctic temperature since the Industrial Era (Sci. Rep., 2019); Anomalously low δ13C of marine organic matter in an Arctic fjord (Sci. Rep., 2016); Recent Decline in Antarctic Sea Ice Cover From 2016 to 2022 (Tellus A, 2023). The two GRL PDFs come from the NERC open repository because the publisher blocks automated downloads.

**Photos** (Wikimedia Commons, credited): Thamban Meloth on the 2010 South Pole expedition; Dakshin Gangotri under construction and its generator room (1984, Pavan Nair); a 7th-expedition member at Dakshin Gangotri (26 Jan 1988); an aerial view of Dakshin Gangotri; a Copernicus Sentinel-2 image of Maitri (ESA); a penguin study in the Larsemann Hills (2006). ⚑ The Larsemann Hills photo does not say which country's expedition it was, so the site does not claim it is Indian.

**Datasets:** each dataset page now shows a monthly chart and the first rows, computed from the file (`npm run dataset-previews`). Values of −999 (missing data) are left out of the averages.

## Round 3 (27 Sep): things found while testing Ask Dhruv

| ✓ | Item | What to check |
|---|---|---|
| ☐ | ⚑ "Dhruvika, 5th issue (2024)" (3a63563e) | The file is the same size as the draft "dhruvika-2023-hi" and its text says 2023. Check which issue it really is and fix the title and year. |
| ☐ | NCPOR Annual Report 2023-24 (f28e05a7) and the Hindi Annual Report 2024-25 (1ca2c7b2) | Only their summaries are searchable; the full text was never split into passages. Re-run the AI on them from Admin (or re-import). |
| ☐ | ⚑ Page numbers for scanned PDFs | Found by the AI, not read from a text layer: Annual Report 2024-25, 30th expedition overview, Dhruvika 2022, dhruvika-2023. Spot-check three citations each. The South Pole report was skipped (pages out of order). |
| ☐ | Accuracy test answer key | `content/eval/questions.json`: every "verified at" link was opened and checked on 26-27 Sep. Two sources were added to the Arctic winter questions after checking that they state the fact (`key_note` says why). |
| ☐ | Home hero photo | Thamban Meloth's South Pole photo (Wikimedia Commons, CC BY-SA 4.0) is shown toned (slightly darker); the credit on the photo says so and links to the item. |

## Videos (18)

All videos are from **NCPOR, Goa Vasco** (@NCPORGoaVasco), the channel linked from the footer of ncpor.res.in. All allow embedding.

Watch the five **demo** videos fully. The others only need to open.

| ✓ | Title (click to open) | Uploaded | Length | Lang | Used for |
|---|---|---|---|---|---|
| ☐ | [1st South Pole Expedition by Indian Scientists of Indian Antarctic Program](https://www.youtube.com/watch?v=pE1K3YQ43j8) | 2023-05-08 | 5 min | en | **demo** |
| ☐ | [The Himalayan Ice Keepers](https://www.youtube.com/watch?v=jwEiBZbD9aw) | 2021-03-30 | 16 min | en | **demo** |
| ☐ | [Arctic The Indian Connection](https://www.youtube.com/watch?v=cHESHyo7NYo) | 2021-05-07 | 28 min | en | **demo** |
| ☐ | [Into the Southern Ocean](https://www.youtube.com/watch?v=IfcXX4msZDQ) | 2022-06-29 | 42 min | en | **demo** |
| ☐ | [NCPOR study covered in Gyan-Vigyan Program of RSTV (Hindi)](https://www.youtube.com/watch?v=4u6TJDRqwf8) | 2020-08-11 | 6 min | hi | **demo** |
| ☐ | [NCPOR study on arctic sea ice covered by RSTV](https://www.youtube.com/watch?v=9qezdBidoGw) | 2020-08-11 | 7 min | en | library |
| ☐ | [Indian Arctic Expedition](https://www.youtube.com/watch?v=6YeAQQAZ61g) | 2020-10-20 | 7 min | en | library |
| ☐ | [MADICE Indo Norwegian Initiative](https://www.youtube.com/watch?v=2YFX7P7tFkU) | 2021-04-13 | 13 min | en | library |
| ☐ | [HIMANSH- NCPOR's High Altitude research station in Himalayas](https://www.youtube.com/watch?v=4DGp4MuUbzc) | 2025-01-13 | 50 s | en | library |
| ☐ | [National Centre for POlar and Ocean Research (NCPOR)- 2019](https://www.youtube.com/watch?v=xAQQ-wpPCkw) | 2019-10-09 | 14 min | en | library |
| ☐ | [NCPOR – Celebrating 25 years of Excellence](https://www.youtube.com/watch?v=u9-31RaKQsg) | 2025-09-25 | 19 min | en | library |
| ☐ | [2024: A Year to Remember – Highlights of NCPOR's Achievements](https://www.youtube.com/watch?v=on3h5F5opHw) | 2024-12-31 | 4 min | en | library |
| ☐ | [Chronicles of Year 2023 : A Retrospective Journey at NCPOR](https://www.youtube.com/watch?v=UPfSzGAG61Y) | 2024-01-11 | 6 min | en | library |
| ☐ | [NCPOR Antarctica Day 2023 Part 1](https://www.youtube.com/watch?v=te1jnAm-rS4) | 2023-12-08 | 89 min | en | event recording |
| ☐ | [Inauguration of a new Branch Post Office at Bharati Station in Antarctica](https://www.youtube.com/watch?v=mWjfIdN9baM) | 2024-04-09 | 32 min | en | event recording |
| ☐ | [NCPOR 24th Foundation Day Ceremony](https://www.youtube.com/watch?v=bVtk6yv2go4) | 2024-04-09 | 99 min | en | event recording |
| ☐ | [Foundation Day Lecture on "Planetary and Space Missions of India"](https://www.youtube.com/watch?v=mcq2YuqI-co) | 2024-04-09 | 78 min | en | event recording |
| ☐ | [AntarcticaDay2021 AKAM](https://www.youtube.com/watch?v=etBrO1veP8c) | 2022-01-14 | 6 min | en | event recording |

The two RSTV clips are Rajya Sabha TV (now Sansad TV) programmes that NCPOR posted. `videos.json` credits both Rajya Sabha TV and NCPOR.

## Events (17)

| ✓ | Date | Event | Source | Check this |
|---|---|---|---|---|
| ☐ | 2021-12-01 | Antarctica Day 2021: painting and short comic story competition for school students | [NCPOR YouTube (video description)](https://www.youtube.com/watch?v=etBrO1veP8c) | The date is Antarctica Day (1 December). The source does not give the competition's own dates. |
| ☐ | 2023-12-01 | Antarctica Day 2023 and 40 years of Dakshin Gangotri | [NCPOR YouTube (video description)](https://www.youtube.com/watch?v=te1jnAm-rS4) | Venue assumed to be NCPOR, Goa. Check in the video. |
| ☐ | 2023-12-18 | Flag-off of India's first winter scientific expedition to the Arctic | [PIB, 18 Dec 2023](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1987724) | – |
| ☐ | 2024-01-02 to 2024-02-25 | Call for research proposals: 44th Indian Scientific Expedition to Antarctica | [NCPOR news](https://ncpor.res.in/news/view/726) | – |
| ☐ | 2024-04-05 | NCPOR 24th Foundation Day and opening of the Bharati Branch Post Office in Antarctica | [PIB, 5 Apr 2024](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2017293) | – |
| ☐ | 2024-05-20 to 2024-05-30 | 46th Antarctic Treaty Consultative Meeting (ATCM-46) and CEP-26, hosted by India | [PIB, 31 May 2024](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2022278) | – |
| ☐ | 2026-08-04 to 2026-08-06 | NCPOR at the 38th COMNAP Annual General Meeting, Tromsø | [NCPOR news](https://ncpor.res.in/news/view/1043) | – |
| ☐ | 2026-08-10 to 2026-08-14 | NCPOR at the 12th SCAR Open Science Conference, Oslo | [NCPOR news](https://ncpor.res.in/news/view/1044) | Dates come from [SCAR's site](https://scar.org/events/osc/oslo-2026); the NCPOR item gives none. |
| ☐ | 2026-08-15 | Independence Day 2026 at NCPOR | [NCPOR news](https://ncpor.res.in/news/view/1042) | – |
| ☐ | 2026-08-17 to 2026-08-19 | India at the 39th SCAR Delegates Meeting, and renewal of the SCAR–IASC agreement | [NCPOR news](https://ncpor.res.in/news/view/1045) | – |
| ☐ | 2026-08-18 | State-level Hindi essay writing competition at NCPOR (NARAKAS, South Goa) | [NCPOR news (Hindi)](https://ncpor.res.in/news/view/1055) | The Hindi title is shortened from the source heading. Does it read well? |
| ☐ | 2026-08-18 | Senior naval officers of the Advanced Hydrography Course visit NCPOR | [NCPOR news](https://ncpor.res.in/news/view/1047) | – |
| ☐ | 2026-09-07 | Workshop: Southern Ocean Biogeochemistry – Future Directions and Way Forward | [NCPOR news](https://ncpor.res.in/news/view/1050) | – |
| ☐ | 2026-09-09 | Launch of India's new ocean research vessel 'Sagar Manthan' | [NCPOR news](https://ncpor.res.in/news/view/1052) | The date comes from [press coverage](https://www.maritimegateway.com/grse-launches-sagar-manthan-ocean-research-vessel-for-ncpor/); the NCPOR item gives none. |
| ☐ | 2026-09-09 | Swachh Sagar, Surakshit Sagar pledge at NCPOR and at Himadri | [NCPOR news](https://ncpor.res.in/news/view/1049) | The pledge at Himadri is not dated in the source. |
| ☐ | 2026-09-18 | Asian Forum for Polar Sciences (AFoPS) annual meeting opens in Kochi | [NCPOR news](https://ncpor.res.in/news/view/1057) | End date not given in the source. |
| ☐ | 2026-09-19 | Beach clean-up at Miramar, Goa: Swachh Sagar, Surakshit Sagar 5.0 | [NCPOR news](https://ncpor.res.in/news/view/1058) | – |

**Left out on purpose:** the PIN code "MH-1718" for the Bharati post office. It appears only in press coverage, not in the PIB release.

## Datasets (5)

All five are NCPOR's own data from its [data portal](https://data.ncpor.res.in). The [NPDC data policy](https://npdc.ncpor.res.in/npdc/mainmenu_home.action?ref_id=REF14329&main_menu_id=55&main_menu_name=Data+Policy+%26amp%3B+Guidelines) makes data free and open once its 2- to 5-year lock-in has passed, provided NCPOR is acknowledged. The newest of these ends in 2019.

| ✓ | Dataset | NCPOR page |
|---|---|---|
| ☐ | Surface weather at Dakshin Gangotri and Maitri, Antarctica, 1985-2010 (74,986 observations, every 3 hours) | [data.ncpor.res.in/ant_temp_pres](https://data.ncpor.res.in/ant_temp_pres) |
| ☐ | Himansh automatic weather station, Chandra basin, Himalaya | [data.ncpor.res.in/dataset/Himansh/](https://data.ncpor.res.in/dataset/Himansh/) |
| ☐ | Sutri Dhaka automatic weather station, Chandra basin, Himalaya | [data.ncpor.res.in/dataset/SutriDhaka/](https://data.ncpor.res.in/dataset/SutriDhaka/) |
| ☐ | Bara Shigri glacier automatic weather station, Himalaya | [data.ncpor.res.in/dataset/BaraShigri/](https://data.ncpor.res.in/dataset/BaraShigri/) |
| ☐ | Gepang automatic weather station, Chandra basin, Himalaya | [data.ncpor.res.in/dataset/Gepang/](https://data.ncpor.res.in/dataset/Gepang/) |

**Note on the Maitri table:** NCPOR's online table lists every observation twice. The download script keeps one copy of each row and changes nothing else, apart from fixing the misspelt "Temperature" heading.

**Optional extras, not yet included:** NCPOR's portal also exports Maitri AWS (selected years, 1985–2016) and Bharati AWS (2015–2026) one year at a time as Excel files. For example, Bharati 2023 is 3 MB. These need converting to CSV first.

## Facts found along the way (for task A4, expeditions)

The expeditions table still has four records labelled "Demo record" with approximate dates. These verified facts can replace or extend them:

| Fact | Source |
|---|---|
| The **17th Indian Arctic Expedition (2026–27)** is under way at Himadri. Suggested new code: `ARCTIC-17`. | [NCPOR news 1049](https://ncpor.res.in/news/view/1049) |
| The 44th ISEA's theme is "Climate Change and its signatures in Antarctica". | [NCPOR news 726](https://ncpor.res.in/news/view/726) |
| India's first scientific expedition to the South Pole left Maitri in 2010. An 8-member team covered 2,300 km in 9 days and reached the South Pole on 21 November 2010. | [NCPOR video description](https://www.youtube.com/watch?v=pE1K3YQ43j8) |
| A second NCPOR field task at Samudra Tapu glacier (Himalaya) finished in September 2026. | [NCPOR news 1056](https://ncpor.res.in/news/view/1056) |
| NCPOR also publishes live readings from automatic weather stations at Maitri, Bharati, Himansh and Himadri. This is a better, real-NCPOR source for the "live polar window" idea (task B4) than a weather model. Use it only as a credited link unless NCPOR agrees to more. | [data.ncpor.res.in](https://data.ncpor.res.in) |

## Still to source (next round)

| Content | Have (26 Sep, round 2) | Target |
|---|---|---|
| Publications | 7 (5 CC BY papers with DOIs + 2 Dhruvika) | ≥5 ✅ |
| Reports linked to expeditions | 10 (6 ISEA scientific reports + 4 annual reports) | ≥10 ✅ |
| Photos | 23 | ≥30 |
| Lessons | 4 | ≥8 (generate from the new reports in Admin → Lessons, then review) |
| Telegram channel | code ready | needs the team's bot token and channel |

## How to load it

1. `npm run fetch-datasets` downloads the 5 datasets (about 50 MB, mostly the Maitri web page) and adds them to `seed-content/manifest.json`.
2. `npm run import-content -- --only=dataset` imports them through the AI pipeline.
3. Videos and events need tasks A2 and A3, which add the import code and pages for these two types.

## Before the deck (27 Sep): three things only a person can do

| ⚑ | What | Why |
|---|---|---|
| ⚑ | **Approve the 8 social posts** for *NCPOR Annual Report 2024-25* (X, Instagram, LinkedIn, Facebook, in English and Hindi) in Admin → Review queue. Sign in as **Demo Reviewer** (`reviewer@dhruv.dev`, password printed by `npm run seed`) with `DEV_AUTH_BYPASS=false` in `.env.local`, so your name is recorded. Read each post first; reject any that are wrong. | The "Upload once, get everything" page then shows named approvals, and each approved post gets its QR check. The drafts were made by the AI and sent for review; nobody has approved them. |
| ⚑ | In the same session, open the report in the Review queue and mark it **Checked against source**. | Its summary and public page then show "approved by a named person" too. |
| ⚑ | After any change to the archive, run `npm run save-answers` (about 7 minutes). | The sample questions on Ask Dhruv serve these saved answers; they should match the archive. |
