# Connecticut and Rhode Island course expansion review

Reviewed: **August 22, 2026**

Staging file: [`data/import/new-england-expansion-south.reviewed.json`](../../data/import/new-england-expansion-south.reviewed.json)

## Result

This review adds **16 staged records** that are not in the existing authoritative launch file:

- **Connecticut:** 13 additions
- **Rhode Island:** 3 additions

Each published source URL belongs to a course operator, municipality, state agency, federal agency, or official state tourism office. Directory records were not accepted as proof of operation. They were used only to find candidates and cross-check map pins or layout facts when an official source had already established the course identity.

The staging data uses factual, newly written summaries. It does not reproduce third-party course descriptions, reviews, maps, or photographs.

## Interpretation of availability

`OPERATOR_CONFIRMED_AVAILABLE` means the reviewed operator or agency presently publishes the course as a facility or recreation offering. It does **not** mean the course is guaranteed open at the moment a player arrives. Weather, maintenance, events, capacity, construction, and local rules can change same-day access.

`STATUS_UNVERIFIED` is used when a primary source establishes the course but does not provide a sufficiently current operating schedule. Those records should display a confirmation-before-travel message.

Confirmed records are scheduled for review within 45 days. Unverified records are scheduled within 30 days.

## Connecticut additions

| Course | Primary source | Staged interpretation | Important qualification |
| --- | --- | --- | --- |
| Alvord Park Disc Golf Course, Torrington | [City facility inventory](https://www.torringtonct.org/parks-recreation/files/parks-and-recreation-facilities-and-activites) | Available municipal recreation facility | No day-specific schedule or price is published. |
| Brodie Park South Disc Golf Course, New Hartford | [September 2025 Board of Selectmen minutes](https://www.newhartfordct.gov/board-of-selectmen/minutes/board-of-selectmen-regular-meeting-minutes-31) | Status unverified | Recent municipal activity is documented, but regular hours are not. |
| Center Springs Park Disc Golf Course, Manchester | [Town park page](https://www.manchesterct.gov/Government/Departments/Leisure-Family-and-Recreation-Department/Recreation-Divison/Parks-Pools-Locator/Center-Springs-Park) | Available, dawn to dusk | The page header and detailed section disagree on layout size; the detailed nine-hole section was used. |
| Columbia Recreation Park Disc Golf Course | [Town recreation resources](https://www.columbiact.gov/recreation/page/resources) | Available nine-hole municipal course | First-come access yields to scheduled programs and events. |
| Cross Farms Disc Golf Course, Tolland | [Town Spring/Summer 2026 newsletter](https://www.tollandct.gov/home/files/community-newsletter-spring-summer-2026) | Available 18-hole municipal course, sunrise to sunset | Event permits may temporarily affect access. |
| Crystal Pond Park Disc Golf Course, Woodstock | [Operator course page](https://crystalpondpark.com/disc-golf-course) | Available year-round, sunrise to sunset | The operator requests a suggested donation; weather and park conditions can still affect play. |
| Hidden Pond Disc Golf Course, Southbury | [Town park page](https://www.southbury-ct.org/hiddenpondpark) | Available municipal park course, sunrise to sunset | The town page confirms the course but does not state the hole count; the staged count is a secondary cross-check. |
| High Plains Disc Golf Course, Orange | [Town disc-golf page](https://www.orange-ct.gov/518/Disc-Golf) | Available nine-hole municipal course | The official nine-hole count is retained even though some directories describe a later expanded layout. |
| Page Park Disc Golf Course, Bristol | [City facility page](https://bristolct.myrec.com/info/facilities/details.aspx?ActivityID=153333) | Currently marked open; dawn to 10 p.m. | A temporary city notice can supersede the facility page. |
| Rockwell Park Disc Golf Course, Bristol | [City park guide and maps](https://bristolct.myrec.com/forms/5291_park_maps.pdf) | Available 18-hole municipal course, dawn to dusk | Players should use a published park entrance and observe posted notices. |
| Sherwood Island State Park Disc Golf Course, Westport | [Connecticut State Parks page](https://ctparks.com/node/132) | Available 18-hole state-park course, daily 8 a.m. to sunset | Access is first-come; crowding can make part of the course temporarily unplayable, and parking rates vary. |
| Lufbery Park Disc Golf Course, Wallingford | [Town Parks and Recreation page](https://www.wallingfordct.gov/government/departments/parks-recreation/) and [current community course site](https://lufberydiscgolf.com/) | Available 18-hole municipal course, sunrise to sunset | The exact first-tee pin remains facility-approximate; the course site shows August 2026 results and scheduled league play. |
| West Thompson Lake Disc Golf Course, North Grosvenordale | [U.S. Army Corps of Engineers recreation page](https://www.nae.usace.army.mil/Missions/Recreation/West-Thompson-Lake/) | Available 18-hole, no-charge course in a year-round recreation area | A 2026 campground reservation pause is separate from disc golf; federal alerts still control access. |

## Rhode Island additions

| Course | Primary source | Staged interpretation | Important qualification |
| --- | --- | --- | --- |
| Curtis Corner Disc Golf Course, South Kingstown | [Town FY2024–25 budget](https://www.southkingstownri.gov/DocumentCenter/View/15185/FY2024-25-TC-Preliminary-Adopted-Budget-full-version) | Status unverified; town documents an 18-hole course | The reviewed source establishes municipal operation and maintenance but not a current daily schedule. |
| Deerfield Disc Golf Course, Smithfield | [Town disc-golf page](https://www.smithfieldri.gov/departments/recreation/activities/smithfield-disc-golf) | Available 18-hole municipal course | The town publishes a $5 day pass and $50 annual membership; posted schedules and events still apply. |
| Willow Valley Disc Golf, Richmond | [Visit Rhode Island listing](https://www.visitrhodeisland.com/listing/willow-valley-disc-golf/8180/) | Status unverified | The official state tourism listing confirms identity and address, but not an operator schedule or same-day access. |

## Rhode Island candidates withheld

Only three additional Rhode Island courses met the source standard in this cycle. These candidates were deliberately withheld:

- **Baker Farm, Prudence Island:** the [Prudence Conservancy protected-land page](https://www.prudenceconservancy.org/Protected%20Lan.html) establishes the property and trails but does not currently identify disc golf.
- **Farnham Farm, Portsmouth:** current municipal facility material establishes the farm/community-center property but does not confirm a maintained disc-golf course.
- **North Smithfield High School:** no current school or town page was found that confirms public course access.
- **Roger Williams University:** an official 2024 alumni event schedule referenced an 18-hole course, but no current course page or public-access policy was located for an August 2026 listing.

These records should remain candidates until an operator or public agency publishes a current course page or directly confirms access.

## Data-quality notes

- Existing authoritative records were excluded: Norbrook Farm, Wickham Park, Cranbury Park, Ninigret Park, and Slater Park.
- Latitude and longitude are discovery pins, not survey-grade tee locations. Pins marked `FACILITY_APPROXIMATE` require a future entrance or first-tee verification.
- The primary source is authoritative for identity and the fields listed in each record's `evidence_fields`. A hole count that is only directory-cross-checked is intentionally omitted from the supporting field list.
- No unsupported “open now” claim was created. Course pages and government inventories can become stale between review cycles.
- Course fees that were not published by the primary source are recorded as unknown, not free.
- Before merging this staging batch into the production catalog, run duplicate detection against current IDs, slugs, normalized names, and facility coordinates.

## Recommended follow-up

1. Contact the New Hartford, South Kingstown, and Willow Valley operators for current schedules and access rules.
2. Confirm first-tee coordinates for Brodie Park South and Lufbery Park.
3. Ask Manchester and Orange to clarify official layout counts where third-party directories differ from municipal pages.
4. Recheck all 16 primary URLs on the scheduled review date and immediately downgrade any record whose operator page disappears or changes materially.
