param(
  [string]$OutputPath = "data/import/maine-courses.statewide.json",
  [int]$MaximumPages = 10
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web

$userAgent = "FlightForgeCourseResearch/1.0 (+https://github.com/williamjblodgett/FlightForge)"
$checkedAt = (Get-Date).ToUniversalTime().ToString("o")

function Get-Page([string]$Uri) {
  return (Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers @{ "User-Agent" = $userAgent } -TimeoutSec 30).Content
}

function Clean-Text([string]$Value) {
  if (-not $Value) { return $null }
  $decoded = [System.Web.HttpUtility]::HtmlDecode($Value)
  return (($decoded -replace "<[^>]+>", " " -replace "\s+", " ").Trim())
}

function Read-DetailValue([string]$Html, [string]$Label) {
  $pattern = '<div[^>]*>\s*' + [regex]::Escape($Label) + '\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>(?<value>[^<]*)</div>'
  $match = [regex]::Match($Html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $match.Success) { return $null }
  return Clean-Text $match.Groups["value"].Value
}

function Normalize-Name([string]$Value) {
  if (-not $Value) { return "" }
  return (($Value.ToLowerInvariant() -replace "[^a-z0-9]+", " ") -replace "\b(the|course|disc|golf|dgc)\b", " " -replace "\s+", " ").Trim()
}

function Get-NameTokens([string]$Value) {
  $normalized = Normalize-Name $Value
  if (-not $normalized) { return @() }
  return @($normalized.Split(" ") | Where-Object { $_.Length -gt 1 } | Sort-Object -Unique)
}

function Get-TokenSimilarity([string]$Left, [string]$Right) {
  $leftTokens = @(Get-NameTokens $Left)
  $rightTokens = @(Get-NameTokens $Right)
  if ($leftTokens.Count -eq 0 -or $rightTokens.Count -eq 0) { return 0.0 }
  $intersection = @($leftTokens | Where-Object { $rightTokens -contains $_ }).Count
  $union = @($leftTokens + $rightTokens | Sort-Object -Unique).Count
  if ($union -eq 0) { return 0.0 }
  return $intersection / $union
}

function Get-DistanceMiles([double]$LatitudeA, [double]$LongitudeA, [double]$LatitudeB, [double]$LongitudeB) {
  $radius = 3958.8
  $latDelta = ($LatitudeB - $LatitudeA) * [Math]::PI / 180
  $lonDelta = ($LongitudeB - $LongitudeA) * [Math]::PI / 180
  $a = [Math]::Sin($latDelta / 2) * [Math]::Sin($latDelta / 2) +
    [Math]::Cos($LatitudeA * [Math]::PI / 180) * [Math]::Cos($LatitudeB * [Math]::PI / 180) *
    [Math]::Sin($lonDelta / 2) * [Math]::Sin($lonDelta / 2)
  return $radius * 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
}

function Get-Slug([string]$Value) {
  $ascii = $Value.Normalize([Text.NormalizationForm]::FormD) -replace "\p{Mn}", ""
  return (($ascii.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-"))
}

function Get-UDiscCourses {
  $courseUrls = New-Object System.Collections.Generic.HashSet[string]
  for ($page = 1; $page -le $MaximumPages; $page++) {
    $uri = "https://udisc.com/courses?page=$page&placeId=maine-united-states"
    $html = Get-Page $uri
    $before = $courseUrls.Count
    foreach ($match in [regex]::Matches($html, 'href="(?<path>/courses/[^"/?]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $path = $match.Groups["path"].Value
      if ($path -ne "/courses/add") { [void]$courseUrls.Add("https://udisc.com$path") }
    }
    if ($courseUrls.Count -eq $before) { break }
  }

  $courses = @()
  foreach ($courseUrl in @($courseUrls | Sort-Object)) {
    try {
      $courseHtml = Get-Page $courseUrl
      $jsonMatch = [regex]::Match($courseHtml, '<script type="application/ld\+json">(?<json>[\s\S]*?)</script>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if (-not $jsonMatch.Success) { continue }
      $structured = $jsonMatch.Groups["json"].Value | ConvertFrom-Json
      if ($structured.'@type' -ne "SportsActivityLocation") { continue }
      $coordinateMatch = [regex]::Match(
        $courseHtml,
        'href="/courses\?latitude=(?<latitude>-?[0-9.]+)&amp;longitude=(?<longitude>-?[0-9.]+)"',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
      )

      $detailsHtml = Get-Page "$courseUrl/details"
      $courseStatus = Read-DetailValue $detailsHtml "Course status"
      $availabilityType = Read-DetailValue $detailsHtml "Availability type"
      $courseLocation = Read-DetailValue $detailsHtml "Course location"
      $holeCount = Read-DetailValue $detailsHtml "Hole count"
      $access = Read-DetailValue $detailsHtml "Who can play"
      $cost = Read-DetailValue $detailsHtml "Cost"

      $city = $structured.address.addressLocality
      if (-not $city -and $courseLocation) { $city = ($courseLocation -split ",")[0].Trim() }
      $status = switch -Regex ($courseStatus) {
        "^Available$" { if ($availabilityType -match "Season") { "SEASONAL_AVAILABLE" } else { "AVAILABLE_REPORTED" }; break }
        "Closed|Unavailable" { "UNAVAILABLE_REPORTED"; break }
        default { "STATUS_UNVERIFIED" }
      }

      $rawName = [string]$structured.name
      $name = $rawName.Trim('"')
      $courses += [pscustomobject]@{
        external_id = "udisc:" + ($courseUrl -split "/")[-1]
        slug = Get-Slug $name
        name = $name
        city = $city
        state = "ME"
        country_code = "US"
        postal_code = $null
        address_line_1 = $null
        latitude = if ($coordinateMatch.Success) { [double]$coordinateMatch.Groups["latitude"].Value } elseif ($structured.geo.latitude) { [double]$structured.geo.latitude } else { $null }
        longitude = if ($coordinateMatch.Success) { [double]$coordinateMatch.Groups["longitude"].Value } elseif ($structured.geo.longitude) { [double]$structured.geo.longitude } else { $null }
        hole_count = if ($holeCount -match "\d+") { [int]([regex]::Match($holeCount, "\d+").Value) } else { $null }
        operational_status = $status
        availability_type = $availabilityType
        access = $access
        cost_note = $cost
        source_name = "UDisc course directory"
        source_url = $courseUrl
        source_type = "PUBLIC_DIRECTORY"
        source_observation = $courseStatus
        source_checked_at = $checkedAt
        secondary_source_name = $null
        secondary_source_url = $null
        verification_level = "DIRECTORY_SINGLE_SOURCE"
        location_accuracy = "DIRECTORY_COORDINATE"
        claim_status = "UNCLAIMED"
        data_verification_status = "SOURCE_REVIEW_REQUIRED"
        fictional_demo = $false
      }
    } catch {
      Write-Warning "Could not review $courseUrl`: $($_.Exception.Message)"
    }
  }
  return @($courses)
}

function Get-PdgaCourses {
  $base = "https://www.pdga.com"
  $directoryPages = @(
    "$base/course-directory/advanced/search?field_course_location_administrative_area=ME&field_course_location_country=US&location_title=Maine",
    "$base/course-directory/advanced/search?field_course_location_administrative_area=ME&field_course_location_country=US&location_title=Maine&page=1"
  )
  $directoryRows = @()
  foreach ($uri in $directoryPages) {
    $html = Get-Page $uri
    foreach ($rowMatch in [regex]::Matches($html, '<tr[^>]*>[\s\S]*?</tr>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $hrefMatch = [regex]::Match($rowMatch.Value, 'href="(?<href>/course-directory/course/[^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if (-not $hrefMatch.Success) { continue }
      $cells = @([regex]::Matches($rowMatch.Value, '<td[^>]*>(?<value>[\s\S]*?)</td>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase) | ForEach-Object { Clean-Text $_.Groups["value"].Value })
      if ($cells.Count -lt 7) { continue }
      $directoryRows += [pscustomobject]@{
        name = $cells[0]
        established = if ($cells[1] -match "\d{4}") { [int]$cells[1] } else { $null }
        city = $cells[2]
        postal_code = $cells[5]
        holes = if ($cells[6] -match "\d+") { [int]$cells[6] } else { $null }
        source_url = "$base$($hrefMatch.Groups['href'].Value)"
      }
    }
  }

  $courses = @()
  foreach ($row in @($directoryRows | Sort-Object source_url -Unique)) {
    try {
      $html = Get-Page $row.source_url
      $latitudeMatch = [regex]::Match($html, 'property="og:latitude"\s+content="(?<value>-?[0-9.]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $longitudeMatch = [regex]::Match($html, 'property="og:longitude"\s+content="(?<value>-?[0-9.]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $typeMatch = [regex]::Match($html, 'field-name-field-course-type[\s\S]{0,500}?field-item[^>]*>(?<value>[^<]+)<', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $addressMatch = [regex]::Match($html, 'class="street-block"[\s\S]{0,600}?class="thoroughfare">(?<value>[^<]+)<', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $courses += [pscustomobject]@{
        name = $row.name
        city = $row.city
        postal_code = $row.postal_code
        address_line_1 = if ($addressMatch.Success) { Clean-Text $addressMatch.Groups["value"].Value } else { $null }
        latitude = if ($latitudeMatch.Success) { [double]$latitudeMatch.Groups["value"].Value } else { $null }
        longitude = if ($longitudeMatch.Success) { [double]$longitudeMatch.Groups["value"].Value } else { $null }
        holes = $row.holes
        established = $row.established
        course_type = if ($typeMatch.Success) { Clean-Text $typeMatch.Groups["value"].Value } else { $null }
        source_url = $row.source_url
      }
    } catch {
      Write-Warning "Could not review $($row.source_url): $($_.Exception.Message)"
    }
  }
  return @($courses)
}

$udiscCourses = @(Get-UDiscCourses)
$pdgaCourses = @(Get-PdgaCourses)

foreach ($course in $udiscCourses) {
  $candidate = $null
  $candidateScore = 0.0
  foreach ($pdga in $pdgaCourses) {
    if (-not $pdga.latitude -or -not $pdga.longitude) { continue }
    $distance = Get-DistanceMiles $course.latitude $course.longitude $pdga.latitude $pdga.longitude
    $similarity = Get-TokenSimilarity $course.name $pdga.name
    $sameCity = $course.city -and $pdga.city -and $course.city.ToLowerInvariant() -eq $pdga.city.ToLowerInvariant()
    if ($distance -le 1.25 -and ($similarity -ge 0.34 -or ($sameCity -and $similarity -ge 0.2))) {
      $score = $similarity + [Math]::Max(0, (1.25 - $distance) / 5)
      if ($score -gt $candidateScore) { $candidate = $pdga; $candidateScore = $score }
    }
  }
  if ($candidate) {
    $course.secondary_source_name = "PDGA course directory"
    $course.secondary_source_url = $candidate.source_url
    $course.verification_level = "DIRECTORY_CROSS_CHECKED"
    $course.data_verification_status = "DIRECTORY_CROSS_CHECKED"
    if (-not $course.postal_code) { $course.postal_code = $candidate.postal_code }
    if (-not $course.address_line_1) { $course.address_line_1 = $candidate.address_line_1 }
    if (-not $course.hole_count) { $course.hole_count = $candidate.holes }
    $course | Add-Member -NotePropertyName established_year -NotePropertyValue $candidate.established
    $course | Add-Member -NotePropertyName pdga_course_type -NotePropertyValue $candidate.course_type
  } else {
    $course | Add-Member -NotePropertyName established_year -NotePropertyValue $null
    $course | Add-Member -NotePropertyName pdga_course_type -NotePropertyValue $null
  }
}

$result = [ordered]@{
  format_version = "2.0"
  batch_id = [guid]::NewGuid().ToString()
  generated_at = $checkedAt
  source_policy = "Factual fields only. No third-party descriptions, photographs, reviews, ratings, or proprietary maps are copied."
  status_policy = "AVAILABLE_REPORTED means a current directory reports the course available; it is not an open-now guarantee. Operator-confirmed status requires a separate authoritative source review."
  sources = @(
    [ordered]@{ name = "UDisc Maine directory"; url = "https://udisc.com/places/us/maine-united-states"; role = "Current discovery and availability cross-check" },
    [ordered]@{ name = "PDGA Maine course directory"; url = "https://www.pdga.com/course-directory/advanced/search?field_course_location_administrative_area=ME&field_course_location_country=US&location_title=Maine"; role = "Independent factual and coordinate cross-check" }
  )
  counts = [ordered]@{
    udisc_records = $udiscCourses.Count
    pdga_records = $pdgaCourses.Count
    cross_checked_records = @($udiscCourses | Where-Object { $_.verification_level -eq "DIRECTORY_CROSS_CHECKED" }).Count
    unavailable_reported = @($udiscCourses | Where-Object { $_.operational_status -eq "UNAVAILABLE_REPORTED" }).Count
    status_unverified = @($udiscCourses | Where-Object { $_.operational_status -eq "STATUS_UNVERIFIED" }).Count
  }
  records = @($udiscCourses | Sort-Object name)
}

$resolvedOutput = Join-Path (Get-Location) $OutputPath
$parent = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resolvedOutput -Encoding UTF8
Write-Output "Wrote $($udiscCourses.Count) UDisc records with $(@($udiscCourses | Where-Object { $_.verification_level -eq 'DIRECTORY_CROSS_CHECKED' }).Count) PDGA cross-checks to $resolvedOutput"
