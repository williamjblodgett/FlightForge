# Course refresh — September 19, 2026

Nine new factual listings raise the public catalog from 177 to 186: ME 120, NH 14, VT 14, MA 15, CT 18, RI 5. No owner affiliation, current weather, same-day operating guarantee, tee-time inventory, reviews, images or precise hole geometry was invented. Ownership remains unclaimed. Each new record has a 30-day review deadline and explicit pricing classification so an unstated price is not inferred to be free or paid.

The machine-readable source URLs, observations, access limits and geolocation provenance are in `data/import/new-england-september.reviewed.json`. Municipal facility addresses were geocoded with the public US Census address-range service. These are approximate planning points, not surveyed tees or navigation guarantees.

| Addition | Main source | Important retained limitation |
| --- | --- | --- |
| Bretton Woods, NH | https://www.brettonwoods.com/experiences/disc-golf/ | 18 holes; seasonal resort activity. The page disagrees on late-May/June start, so no exact opening date inferred. Owner JSON-LD point is the ski-area facility. |
| Pines at Wheelock, NH | https://keeneparks.recdesk.com/Community/Facility/Detail?facilityId=102 | Nine-hole beginner course; published facility hours 8 a.m.–8 p.m.; course price unspecified. |
| Awasiwi Woods, VT | https://www.southburlingtonvt.gov/677/Awasiwi-Woods---Disc-Golf-Course | Nine baskets, not 18; two 18-tee layouts. School-hours parking at 375 Hinesburg Road. Pin identifies parking only. |
| Hard’ack, VT | https://stalbansvt.myrec.com/info/activities/program_details.aspx?ProgramID=21613 | 18 holes, donation-supported public property. Gate may close at 5 p.m.; ski/lodge hours are not disc-golf hours. Address corroborated by municipal facility directory. |
| Buffumville Lake, MA | https://www.nae.usace.army.mil/Missions/Recreation/Buffumville-Lake/ | Current official description says 18, not older 27-hole reports. Free dam-side course; separate park vehicle fee/hours not applied. |
| Tully Lake, MA | https://www.nae.usace.army.mil/Missions/Recreation/Tully-Lake/ | 18 holes, conditions/flood closures can limit year-round access. Official facility address, not first tee. |
| Crane Hill, MA | https://www.wilbraham-ma.gov/290/Crane-Hill-Disc-Golf-Course | Free, sunrise–sunset, 139V address preserved. Trail crosses fairways. Companion town trail page confirms 18 holes. |
| Orenaug Park, CT | https://woodburyct.myrec.com/info/facilities/details.aspx?FacilityID=13826 | 18 holes; price/hours unspecified. Approximate Park Road approach from destination of town-embedded directions, not its map center. |
| North Quarter Park, CT | https://www.chesterct.org/parks-recreation-commission/pages/parks | Nine holes; intersection location only; yield to other park users. No unsupported beach-residency restrictions applied. |

## Retrieval limits

The USACE HTML endpoints returned 403 to direct tools. Their recently indexed official-page content supported the stated facts, supplemented by the federal recreation guide: https://www.nae.usace.army.mil/Portals/74/docs/Recreation/Recreational-Opportunities-2022.pdf . A 403 is not proof of course closure, nor was it recorded as a successful direct fetch. Chester's newer document endpoint timed out; indexed town content and its linked https://www.chesterct.org/sites/g/files/vyhlif8561/f/pages/disc-golf-sign.pdf supplied the course instructions. These retrieval limits are retained in source observations. The existing large source-health snapshot was not re-dated or misrepresented as freshly checked.

## Researched but not published this cycle

- Storrs Pond, Hanover NH: operator confirms **back nine only; front nine closed indefinitely**, $5 nonmember play, members free. https://www.storrspond.org/activities/disc-golf/ . The reviewed map parameters were viewport centers, not verified pins; location remains pending.
- Williston VT: town confirms free nine-hole play, dawn–dusk, closed March/April or whenever very wet. https://willistonvt.myrec.com/info/facilities/details.aspx?FacilityID=14747 . Official-address geocoder returned no match; no point invented.
- Northwood/Maple McMillan, Rutland Town VT: town supports year-round disc golf, but the course-map layout and location need another check. https://www.rutlandtown.com/recreation/ .
- Barre Falls Dam MA: primary-supported 18-hole course, but Census silently matched **Old Coldbrook Road** instead of the official **Coldbrook Road**. Rejected that coordinate instead of publishing a likely wrong pin.
- Lake St. Catherine VT: state-domain search content supports a seasonal course; direct page retrieval was unsuccessful in this pass. https://www.vtstateparks.com/parks/lake-st-catherine .

The 474-entry ledger is a candidate inventory, not 474 independently verified open courses. It still includes alias matching issues (e.g. Dacey/Dacey Field and Sherwood Island), so 288 withheld entries are not necessarily 288 distinct missing properties. Only 16 of 120 legacy Maine records have attached primary overrides; a uniform operator-source audit remains unfinished.

Supabase seed SQL was regenerated for 186 courses but **not applied**. D1-backed mutable workflows and the source-backed published catalog remain the live architecture. A source-ID conflict issue in the PostgreSQL seed generator also requires rehearsal before any production cutover; this data update does not authorize that cutover.
