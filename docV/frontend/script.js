// ==================== DOCUMENT PORTAL - VANILLA JAVASCRIPT ==================== //

// --- CONFIGURATION ---
// API base:
//  - Local dev (localhost): same origin — the Node server serves this frontend.
//  - Hosted: frontend lives on Cloudflare Pages (thecosmicdev.net) and the
//    backend on the VPS at a SAME-SITE subdomain (api.thecosmicdev.net) so the
//    login session cookie is sent cross-subdomain. Override with
//    window.API_ORIGIN if you use a different backend host.
// Default: same origin — works for local dev AND the all-in-one deploy where the
// Node server serves this frontend (docuchain.thecosmicdev.net).
// Split hosting (frontend on Cloudflare Pages, API on the VPS): set
// window.API_ORIGIN in index.html, e.g. "https://api.docuchain.thecosmicdev.net".
const API_ORIGIN = window.API_ORIGIN || location.origin;
const API_BASE_URL = `${API_ORIGIN}/api`;

// --- CONSTANTS ---
const COUNTRY_CODES = [
    { name: "Afghanistan", code: "AF", dial_code: "+93", flag: "🇦🇫" },
    { name: "Albania", code: "AL", dial_code: "+355", flag: "🇦🇱" },
    { name: "Algeria", code: "DZ", dial_code: "+213", flag: "🇩🇿" },
    { name: "American Samoa", code: "AS", dial_code: "+1684", flag: "🇦🇸" },
    { name: "Andorra", code: "AD", dial_code: "+376", flag: "🇦🇩" },
    { name: "Angola", code: "AO", dial_code: "+244", flag: "🇦🇴" },
    { name: "Anguilla", code: "AI", dial_code: "+1264", flag: "🇦🇮" },
    { name: "Antarctica", code: "AQ", dial_code: "+672", flag: "🇦🇶" },
    { name: "Antigua & Barbuda", code: "AG", dial_code: "+1268", flag: "🇦🇬" },
    { name: "Argentina", code: "AR", dial_code: "+54", flag: "🇦🇷" },
    { name: "Armenia", code: "AM", dial_code: "+374", flag: "🇦🇲" },
    { name: "Aruba", code: "AW", dial_code: "+297", flag: "🇦🇼" },
    { name: "Australia", code: "AU", dial_code: "+61", flag: "🇦🇺" },
    { name: "Austria", code: "AT", dial_code: "+43", flag: "🇦🇹" },
    { name: "Azerbaijan", code: "AZ", dial_code: "+994", flag: "🇦🇿" },
    { name: "Bahamas", code: "BS", dial_code: "+1242", flag: "🇧🇸" },
    { name: "Bahrain", code: "BH", dial_code: "+973", flag: "🇧🇭" },
    { name: "Bangladesh", code: "BD", dial_code: "+880", flag: "🇧🇩" },
    { name: "Barbados", code: "BB", dial_code: "+1246", flag: "🇧🇧" },
    { name: "Belarus", code: "BY", dial_code: "+375", flag: "🇧🇾" },
    { name: "Belgium", code: "BE", dial_code: "+32", flag: "🇧🇪" },
    { name: "Belize", code: "BZ", dial_code: "+501", flag: "🇧🇿" },
    { name: "Benin", code: "BJ", dial_code: "+229", flag: "🇧🇯" },
    { name: "Bermuda", code: "BM", dial_code: "+1441", flag: "🇧🇲" },
    { name: "Bhutan", code: "BT", dial_code: "+975", flag: "🇧🇹" },
    { name: "Bolivia", code: "BO", dial_code: "+591", flag: "🇧🇴" },
    { name: "Bosnia & Herzegovina", code: "BA", dial_code: "+387", flag: "🇧🇦" },
    { name: "Botswana", code: "BW", dial_code: "+267", flag: "🇧🇼" },
    { name: "Brazil", code: "BR", dial_code: "+55", flag: "🇧🇷" },
    { name: "British Indian Ocean Territory", code: "IO", dial_code: "+246", flag: "🇮🇴" },
    { name: "British Virgin Islands", code: "VG", dial_code: "+1284", flag: "🇻🇬" },
    { name: "Brunei", code: "BN", dial_code: "+673", flag: "🇧🇳" },
    { name: "Bulgaria", code: "BG", dial_code: "+359", flag: "🇧🇬" },
    { name: "Burkina Faso", code: "BF", dial_code: "+226", flag: "🇧🇫" },
    { name: "Burundi", code: "BI", dial_code: "+257", flag: "🇧🇮" },
    { name: "Cambodia", code: "KH", dial_code: "+855", flag: "🇰🇭" },
    { name: "Cameroon", code: "CM", dial_code: "+237", flag: "🇨🇲" },
    { name: "Canada", code: "CA", dial_code: "+1", flag: "🇨🇦" },
    { name: "Cape Verde", code: "CV", dial_code: "+238", flag: "🇨🇻" },
    { name: "Cayman Islands", code: "KY", dial_code: "+1345", flag: "🇰🇾" },
    { name: "Central African Republic", code: "CF", dial_code: "+236", flag: "🇨🇫" },
    { name: "Chad", code: "TD", dial_code: "+235", flag: "🇹🇩" },
    { name: "Chile", code: "CL", dial_code: "+56", flag: "🇨🇱" },
    { name: "China", code: "CN", dial_code: "+86", flag: "🇨🇳" },
    { name: "Christmas Island", code: "CX", dial_code: "+61", flag: "🇨🇽" },
    { name: "Cocos Islands", code: "CC", dial_code: "+61", flag: "🇨🇨" },
    { name: "Colombia", code: "CO", dial_code: "+57", flag: "🇨🇴" },
    { name: "Comoros", code: "KM", dial_code: "+269", flag: "🇰🇲" },
    { name: "Cook Islands", code: "CK", dial_code: "+682", flag: "🇨🇰" },
    { name: "Costa Rica", code: "CR", dial_code: "+506", flag: "🇨🇷" },
    { name: "Croatia", code: "HR", dial_code: "+385", flag: "🇭🇷" },
    { name: "Cuba", code: "CU", dial_code: "+53", flag: "🇨🇺" },
    { name: "Curacao", code: "CW", dial_code: "+599", flag: "🇨🇼" },
    { name: "Cyprus", code: "CY", dial_code: "+357", flag: "🇨🇾" },
    { name: "Czech Republic", code: "CZ", dial_code: "+420", flag: "🇨🇿" },
    { name: "DR Congo", code: "CD", dial_code: "+243", flag: "🇨🇩" },
    { name: "Denmark", code: "DK", dial_code: "+45", flag: "🇩🇰" },
    { name: "Djibouti", code: "DJ", dial_code: "+253", flag: "🇩🇯" },
    { name: "Dominica", code: "DM", dial_code: "+1767", flag: "🇩🇲" },
    { name: "Dominican Republic", code: "DO", dial_code: "+1809", flag: "🇩🇴" },
    { name: "East Timor", code: "TL", dial_code: "+670", flag: "🇹🇱" },
    { name: "Ecuador", code: "EC", dial_code: "+593", flag: "🇪🇨" },
    { name: "Egypt", code: "EG", dial_code: "+20", flag: "🇪🇬" },
    { name: "El Salvador", code: "SV", dial_code: "+503", flag: "🇸🇻" },
    { name: "Equatorial Guinea", code: "GQ", dial_code: "+240", flag: "🇬🇶" },
    { name: "Eritrea", code: "ER", dial_code: "+291", flag: "🇪🇷" },
    { name: "Estonia", code: "EE", dial_code: "+372", flag: "🇪🇪" },
    { name: "Ethiopia", code: "ET", dial_code: "+251", flag: "🇪🇹" },
    { name: "Falkland Islands", code: "FK", dial_code: "+500", flag: "🇫🇰" },
    { name: "Faroe Islands", code: "FO", dial_code: "+298", flag: "🇫🇴" },
    { name: "Fiji", code: "FJ", dial_code: "+679", flag: "🇫🇯" },
    { name: "Finland", code: "FI", dial_code: "+358", flag: "🇫🇮" },
    { name: "France", code: "FR", dial_code: "+33", flag: "🇫🇷" },
    { name: "French Guiana", code: "GF", dial_code: "+594", flag: "🇬🇫" },
    { name: "French Polynesia", code: "PF", dial_code: "+689", flag: "🇵🇫" },
    { name: "Gabon", code: "GA", dial_code: "+241", flag: "🇬🇦" },
    { name: "Gambia", code: "GM", dial_code: "+220", flag: "🇬🇲" },
    { name: "Georgia", code: "GE", dial_code: "+995", flag: "🇬🇪" },
    { name: "Germany", code: "DE", dial_code: "+49", flag: "🇩🇪" },
    { name: "Ghana", code: "GH", dial_code: "+233", flag: "🇬🇭" },
    { name: "Gibraltar", code: "GI", dial_code: "+350", flag: "🇬🇮" },
    { name: "Greece", code: "GR", dial_code: "+30", flag: "🇬🇷" },
    { name: "Greenland", code: "GL", dial_code: "+299", flag: "🇬🇱" },
    { name: "Grenada", code: "GD", dial_code: "+1473", flag: "🇬🇩" },
    { name: "Guadeloupe", code: "GP", dial_code: "+590", flag: "🇬🇵" },
    { name: "Guam", code: "GU", dial_code: "+1671", flag: "🇬🇺" },
    { name: "Guatemala", code: "GT", dial_code: "+502", flag: "🇬🇹" },
    { name: "Guernsey", code: "GG", dial_code: "+44", flag: "🇬🇬" },
    { name: "Guinea", code: "GN", dial_code: "+224", flag: "🇬🇳" },
    { name: "Guinea-Bissau", code: "GW", dial_code: "+245", flag: "🇬🇼" },
    { name: "Guyana", code: "GY", dial_code: "+592", flag: "🇬🇾" },
    { name: "Haiti", code: "HT", dial_code: "+509", flag: "🇭🇹" },
    { name: "Honduras", code: "HN", dial_code: "+504", flag: "🇭🇳" },
    { name: "Hong Kong", code: "HK", dial_code: "+852", flag: "🇭🇰" },
    { name: "Hungary", code: "HU", dial_code: "+36", flag: "🇭🇺" },
    { name: "Iceland", code: "IS", dial_code: "+354", flag: "🇮🇸" },
    { name: "India", code: "IN", dial_code: "+91", flag: "🇮🇳" },
    { name: "Indonesia", code: "ID", dial_code: "+62", flag: "🇮🇩" },
    { name: "Iran", code: "IR", dial_code: "+98", flag: "🇮🇷" },
    { name: "Iraq", code: "IQ", dial_code: "+964", flag: "🇮🇶" },
    { name: "Ireland", code: "IE", dial_code: "+353", flag: "🇮🇪" },
    { name: "Isle of Man", code: "IM", dial_code: "+44", flag: "🇮🇲" },
    { name: "Israel", code: "IL", dial_code: "+972", flag: "🇮🇱" },
    { name: "Italy", code: "IT", dial_code: "+39", flag: "🇮🇹" },
    { name: "Ivory Coast", code: "CI", dial_code: "+225", flag: "🇨🇮" },
    { name: "Jamaica", code: "JM", dial_code: "+1876", flag: "🇯🇲" },
    { name: "Japan", code: "JP", dial_code: "+81", flag: "🇯🇵" },
    { name: "Jersey", code: "JE", dial_code: "+44", flag: "🇯🇪" },
    { name: "Jordan", code: "JO", dial_code: "+962", flag: "🇯🇴" },
    { name: "Kazakhstan", code: "KZ", dial_code: "+7", flag: "🇰🇿" },
    { name: "Kenya", code: "KE", dial_code: "+254", flag: "🇰🇪" },
    { name: "Kiribati", code: "KI", dial_code: "+686", flag: "🇰🇮" },
    { name: "Kosovo", code: "XK", dial_code: "+383", flag: "🇽🇰" },
    { name: "Kuwait", code: "KW", dial_code: "+965", flag: "🇰🇼" },
    { name: "Kyrgyzstan", code: "KG", dial_code: "+996", flag: "🇰🇬" },
    { name: "Laos", code: "LA", dial_code: "+856", flag: "🇱🇦" },
    { name: "Latvia", code: "LV", dial_code: "+371", flag: "🇱🇻" },
    { name: "Lebanon", code: "LB", dial_code: "+961", flag: "🇱🇧" },
    { name: "Lesotho", code: "LS", dial_code: "+266", flag: "🇱🇸" },
    { name: "Liberia", code: "LR", dial_code: "+231", flag: "🇱🇷" },
    { name: "Libya", code: "LY", dial_code: "+218", flag: "🇱🇾" },
    { name: "Liechtenstein", code: "LI", dial_code: "+423", flag: "🇱🇮" },
    { name: "Lithuania", code: "LT", dial_code: "+370", flag: "🇱🇹" },
    { name: "Luxembourg", code: "LU", dial_code: "+352", flag: "🇱🇺" },
    { name: "Macau", code: "MO", dial_code: "+853", flag: "🇲🇴" },
    { name: "Madagascar", code: "MG", dial_code: "+261", flag: "🇲🇬" },
    { name: "Malawi", code: "MW", dial_code: "+265", flag: "🇲🇼" },
    { name: "Malaysia", code: "MY", dial_code: "+60", flag: "🇲🇾" },
    { name: "Maldives", code: "MV", dial_code: "+960", flag: "🇲🇻" },
    { name: "Mali", code: "ML", dial_code: "+223", flag: "🇲🇱" },
    { name: "Malta", code: "MT", dial_code: "+356", flag: "🇲🇹" },
    { name: "Marshall Islands", code: "MH", dial_code: "+692", flag: "🇲🇭" },
    { name: "Martinique", code: "MQ", dial_code: "+596", flag: "🇲🇶" },
    { name: "Mauritania", code: "MR", dial_code: "+222", flag: "🇲🇷" },
    { name: "Mauritius", code: "MU", dial_code: "+230", flag: "🇲🇺" },
    { name: "Mayotte", code: "YT", dial_code: "+262", flag: "🇾🇹" },
    { name: "Mexico", code: "MX", dial_code: "+52", flag: "🇲🇽" },
    { name: "Micronesia", code: "FM", dial_code: "+691", flag: "🇫🇲" },
    { name: "Moldova", code: "MD", dial_code: "+373", flag: "🇲🇩" },
    { name: "Monaco", code: "MC", dial_code: "+377", flag: "🇲🇨" },
    { name: "Mongolia", code: "MN", dial_code: "+976", flag: "🇲🇳" },
    { name: "Montenegro", code: "ME", dial_code: "+382", flag: "🇲🇪" },
    { name: "Montserrat", code: "MS", dial_code: "+1664", flag: "🇲🇸" },
    { name: "Morocco", code: "MA", dial_code: "+212", flag: "🇲🇦" },
    { name: "Mozambique", code: "MZ", dial_code: "+258", flag: "🇲🇿" },
    { name: "Myanmar", code: "MM", dial_code: "+95", flag: "🇲🇲" },
    { name: "Namibia", code: "NA", dial_code: "+264", flag: "🇳🇦" },
    { name: "Nauru", code: "NR", dial_code: "+674", flag: "🇳🇷" },
    { name: "Nepal", code: "NP", dial_code: "+977", flag: "🇳🇵" },
    { name: "Netherlands", code: "NL", dial_code: "+31", flag: "🇳🇱" },
    { name: "New Caledonia", code: "NC", dial_code: "+687", flag: "🇳🇨" },
    { name: "New Zealand", code: "NZ", dial_code: "+64", flag: "🇳🇿" },
    { name: "Nicaragua", code: "NI", dial_code: "+505", flag: "🇳🇮" },
    { name: "Niger", code: "NE", dial_code: "+227", flag: "🇳🇪" },
    { name: "Nigeria", code: "NG", dial_code: "+234", flag: "🇳🇬" },
    { name: "Niue", code: "NU", dial_code: "+683", flag: "🇳🇺" },
    { name: "Norfolk Island", code: "NF", dial_code: "+672", flag: "🇳🇫" },
    { name: "North Korea", code: "KP", dial_code: "+850", flag: "🇰🇵" },
    { name: "North Macedonia", code: "MK", dial_code: "+389", flag: "🇲🇰" },
    { name: "Northern Mariana Islands", code: "MP", dial_code: "+1670", flag: "🇲🇵" },
    { name: "Norway", code: "NO", dial_code: "+47", flag: "🇳🇴" },
    { name: "Oman", code: "OM", dial_code: "+968", flag: "🇴🇲" },
    { name: "Pakistan", code: "PK", dial_code: "+92", flag: "🇵🇰" },
    { name: "Palau", code: "PW", dial_code: "+680", flag: "🇵🇼" },
    { name: "Palestine", code: "PS", dial_code: "+970", flag: "🇵🇸" },
    { name: "Panama", code: "PA", dial_code: "+507", flag: "🇵🇦" },
    { name: "Papua New Guinea", code: "PG", dial_code: "+675", flag: "🇵🇬" },
    { name: "Paraguay", code: "PY", dial_code: "+595", flag: "🇵🇾" },
    { name: "Peru", code: "PE", dial_code: "+51", flag: "🇵🇪" },
    { name: "Philippines", code: "PH", dial_code: "+63", flag: "🇵🇭" },
    { name: "Pitcairn", code: "PN", dial_code: "+64", flag: "🇵🇳" },
    { name: "Poland", code: "PL", dial_code: "+48", flag: "🇵🇱" },
    { name: "Portugal", code: "PT", dial_code: "+351", flag: "🇵🇹" },
    { name: "Puerto Rico", code: "PR", dial_code: "+1939", flag: "🇵🇷" },
    { name: "Qatar", code: "QA", dial_code: "+974", flag: "🇶🇦" },
    { name: "Congo", code: "CG", dial_code: "+242", flag: "🇨🇬" },
    { name: "Reunion", code: "RE", dial_code: "+262", flag: "🇷🇪" },
    { name: "Romania", code: "RO", dial_code: "+40", flag: "🇷🇴" },
    { name: "Russia", code: "RU", dial_code: "+7", flag: "🇷🇺" },
    { name: "Rwanda", code: "RW", dial_code: "+250", flag: "🇷🇼" },
    { name: "St Barthelemy", code: "BL", dial_code: "+590", flag: "🇧🇱" },
    { name: "St Helena", code: "SH", dial_code: "+290", flag: "🇸🇭" },
    { name: "St Kitts & Nevis", code: "KN", dial_code: "+1869", flag: "🇰🇳" },
    { name: "St Lucia", code: "LC", dial_code: "+1758", flag: "🇱🇨" },
    { name: "St Martin", code: "MF", dial_code: "+590", flag: "🇲🇫" },
    { name: "St Pierre & Miquelon", code: "PM", dial_code: "+508", flag: "🇵🇲" },
    { name: "St Vincent & Grenadines", code: "VC", dial_code: "+1784", flag: "🇻🇨" },
    { name: "Samoa", code: "WS", dial_code: "+685", flag: "🇼🇸" },
    { name: "San Marino", code: "SM", dial_code: "+378", flag: "🇸🇲" },
    { name: "Sao Tome & Principe", code: "ST", dial_code: "+239", flag: "🇸🇹" },
    { name: "Saudi Arabia", code: "SA", dial_code: "+966", flag: "🇸🇦" },
    { name: "Senegal", code: "SN", dial_code: "+221", flag: "🇸🇳" },
    { name: "Serbia", code: "RS", dial_code: "+381", flag: "🇷🇸" },
    { name: "Seychelles", code: "SC", dial_code: "+248", flag: "🇸🇨" },
    { name: "Sierra Leone", code: "SL", dial_code: "+232", flag: "🇸🇱" },
    { name: "Singapore", code: "SG", dial_code: "+65", flag: "🇸🇬" },
    { name: "Sint Maarten", code: "SX", dial_code: "+1721", flag: "🇸🇽" },
    { name: "Slovakia", code: "SK", dial_code: "+421", flag: "🇸🇰" },
    { name: "Slovenia", code: "SI", dial_code: "+386", flag: "🇸🇮" },
    { name: "Solomon Islands", code: "SB", dial_code: "+677", flag: "🇸🇧" },
    { name: "Somalia", code: "SO", dial_code: "+252", flag: "🇸🇴" },
    { name: "South Africa", code: "ZA", dial_code: "+27", flag: "🇿🇦" },
    { name: "South Korea", code: "KR", dial_code: "+82", flag: "🇰🇷" },
    { name: "South Sudan", code: "SS", dial_code: "+211", flag: "🇸🇸" },
    { name: "Spain", code: "ES", dial_code: "+34", flag: "🇪🇸" },
    { name: "Sri Lanka", code: "LK", dial_code: "+94", flag: "🇱🇰" },
    { name: "Sudan", code: "SD", dial_code: "+249", flag: "🇸🇩" },
    { name: "Suriname", code: "SR", dial_code: "+597", flag: "🇸🇷" },
    { name: "Svalbard", code: "SJ", dial_code: "+47", flag: "🇸🇯" },
    { name: "Eswatini", code: "SZ", dial_code: "+268", flag: "🇸🇿" },
    { name: "Sweden", code: "SE", dial_code: "+46", flag: "🇸🇪" },
    { name: "Switzerland", code: "CH", dial_code: "+41", flag: "🇨🇭" },
    { name: "Syria", code: "SY", dial_code: "+963", flag: "🇸🇾" },
    { name: "Taiwan", code: "TW", dial_code: "+886", flag: "🇹🇼" },
    { name: "Tajikistan", code: "TJ", dial_code: "+992", flag: "🇹🇯" },
    { name: "Tanzania", code: "TZ", dial_code: "+255", flag: "🇹🇿" },
    { name: "Thailand", code: "TH", dial_code: "+66", flag: "🇹🇭" },
    { name: "Togo", code: "TG", dial_code: "+228", flag: "🇹🇬" },
    { name: "Tokelau", code: "TK", dial_code: "+690", flag: "🇹🇰" },
    { name: "Tonga", code: "TO", dial_code: "+676", flag: "🇹🇴" },
    { name: "Trinidad & Tobago", code: "TT", dial_code: "+1868", flag: "🇹🇹" },
    { name: "Tunisia", code: "TN", dial_code: "+216", flag: "🇹🇳" },
    { name: "Turkey", code: "TR", dial_code: "+90", flag: "🇹🇷" },
    { name: "Turkmenistan", code: "TM", dial_code: "+993", flag: "🇹🇲" },
    { name: "Turks & Caicos", code: "TC", dial_code: "+1649", flag: "🇹🇨" },
    { name: "Tuvalu", code: "TV", dial_code: "+688", flag: "🇹🇻" },
    { name: "Uganda", code: "UG", dial_code: "+256", flag: "🇺🇬" },
    { name: "Ukraine", code: "UA", dial_code: "+380", flag: "🇺🇦" },
    { name: "UAE", code: "AE", dial_code: "+971", flag: "🇦🇪" },
    { name: "United Kingdom", code: "GB", dial_code: "+44", flag: "🇬🇧" },
    { name: "United States", code: "US", dial_code: "+1", flag: "🇺🇸" },
    { name: "Uruguay", code: "UY", dial_code: "+598", flag: "🇺🇾" },
    { name: "Uzbekistan", code: "UZ", dial_code: "+998", flag: "🇺🇿" },
    { name: "Vanuatu", code: "VU", dial_code: "+678", flag: "🇻🇺" },
    { name: "Vatican City", code: "VA", dial_code: "+39", flag: "🇻🇦" },
    { name: "Venezuela", code: "VE", dial_code: "+58", flag: "🇻🇪" },
    { name: "Vietnam", code: "VN", dial_code: "+84", flag: "🇻🇳" },
    { name: "Wallis & Futuna", code: "WF", dial_code: "+681", flag: "🇼🇫" },
    { name: "Yemen", code: "YE", dial_code: "+967", flag: "🇾🇪" },
    { name: "Zambia", code: "ZM", dial_code: "+260", flag: "🇿🇲" },
    { name: "Zimbabwe", code: "ZW", dial_code: "+263", flag: "🇿🇼" }
];

// --- STATE MANAGEMENT ---
let currentUser = null;
let currentView = 'guest';
let currentDashboardSection = 'home';
let userDocuments = [];
let userStatistics = {};
let isLoading = false;
let isEmailVerified = false;
let generatedOTP = null;

// --- UTILITY FUNCTIONS ---

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    let icon = '';
    let colorClass = '';

    if (type === 'success') {
        icon = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        colorClass = 'border-l-4 border-green-500';
    } else if (type === 'error') {
        icon = '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        colorClass = 'border-l-4 border-red-500';
    } else {
        icon = '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        colorClass = 'border-l-4 border-blue-500';
    }

    toast.className = `toast flex items-center w-full max-w-sm p-4 text-slate-600 bg-white rounded-lg shadow-lg pointer-events-auto transform transition-all duration-300 ${colorClass}`;
    toast.innerHTML = `
        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
            ${icon}
        </div>
        <div class="ml-3 text-sm font-normal">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 4.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * Toggle loading overlay
 * @param {boolean} show - Whether to show or hide loading
 */
function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        isLoading = true;
    } else {
        overlay.classList.add('hidden');
        isLoading = false;
    }
}

/**
 * Get user initials from full name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
function getUserInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Get greeting based on time of day
 * @returns {string} Greeting message
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get status color class
 * @param {string} status - Document status
 * @returns {string} CSS class
 */
function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'verified': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
        case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
        default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
}

/**
 * Get status icon
 * @param {string} status - Document status
 * @returns {string} Icon emoji
 */
function getStatusIcon(status) {
    switch (status?.toLowerCase()) {
        case 'verified': return '✅';
        case 'rejected': return '❌';
        case 'pending': return '⏳';
        default: return '📄';
    }
}

/**
 * Toggle password visibility
 * @param {string} inputId - ID of password input
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

/**
 * Send OTP to email (Mock)
 */
/**
 * Send OTP to email
 */
/**
 * Send OTP to email (Simulated)
 */
async function sendEmailOTP() {
    const emailInput = document.getElementById('signup-email');
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const btn = document.getElementById('verify-email-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/send-email-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Failed to send the code');

        document.getElementById('email-otp-container').classList.remove('hidden');
        btn.textContent = 'Sent';
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        showToast(`Verification code sent to ${email}`, 'success');
    } catch (err) {
        btn.disabled = false;
        btn.textContent = originalText;
        showToast(err.message || 'Could not send the code. Please try again.', 'error');
    }
}

// ============================================
// RESTORED FUNCTIONS
// ============================================

/**
 * Verify entered OTP
 */
/**
 * Verify entered OTP
 */
/**
 * Verify entered OTP (Simulated)
 */
async function verifyEmailOTP() {
    const input = document.getElementById('email-otp-input');
    const enteredOTP = input.value.trim();
    const email = document.getElementById('signup-email').value.trim();

    if (!enteredOTP) {
        showToast('Enter the verification code', 'error');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: enteredOTP }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Invalid verification code');

        isEmailVerified = true;
        document.getElementById('email-otp-container').classList.add('hidden');
        const btn = document.getElementById('verify-email-btn');
        btn.textContent = 'Verified';
        btn.classList.remove('bg-slate-800', 'opacity-50', 'cursor-not-allowed');
        btn.classList.add('bg-green-600');
        document.getElementById('signup-email').readOnly = true;

        showToast('Email verified successfully!', 'success');
    } catch (err) {
        showToast(err.message || 'Invalid verification code', 'error');
    }
}

// --- NAVIGATION FUNCTIONS ---

/**
 * Show specific page
 * @param {string} pageId - ID of page to show
 */
function showPage(pageId) {
    // Hide all pages
    ['guestPage', 'authPage', 'dashboard', 'issuerAuthPage', 'issuerDashboard']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

    // Show requested page
    document.getElementById(pageId).classList.remove('hidden');
    currentView = pageId;

    // Notify the Dogstudio motion layer so it can reset smooth-scroll + refresh ScrollTrigger
    window.dispatchEvent(new CustomEvent('ds:pagechange', { detail: { pageId } }));

    // Load data if showing dashboard
    if (pageId === 'dashboard') {
        loadDashboardData();
    }
}

/**
 * Show authentication page
 * @param {string} tab - Tab to show (signin/signup)
 */
function showAuth(tab = 'signin') {
    showPage('authPage');
    switchAuthTab(tab);
}

/**
 * Switch authentication tab
 * @param {string} tab - Tab to switch to
 */
function switchAuthTab(tab) {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const signinTab = document.getElementById('auth-tab-signin');
    const signupTab = document.getElementById('auth-tab-signup');
    const errorDiv = document.getElementById('auth-error');

    // Reset error message
    errorDiv.classList.add('hidden');

    if (tab === 'signin') {
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        
        signinTab.classList.add('bg-white', 'text-brand-900', 'shadow-sm');
        signinTab.classList.remove('text-slate-500');
        
        signupTab.classList.remove('bg-white', 'text-brand-900', 'shadow-sm');
        signupTab.classList.add('text-slate-500');
    } else {
        signinForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        
        signupTab.classList.add('bg-white', 'text-brand-900', 'shadow-sm');
        signupTab.classList.remove('text-slate-500');
        
        signinTab.classList.remove('bg-white', 'text-brand-900', 'shadow-sm');
        signinTab.classList.add('text-slate-500');
    }
}

/**
 * Update country select display
 */
/**
 * Custom country-code dropdown. Replaces the native <select> because its popup
 * is rendered translucent + unstyleable by Chrome on Windows 11. This is plain
 * DOM, so it's always opaque. The chosen dial code is stored in the hidden
 * #country-code input so existing signup code (reads .value) is unchanged.
 */
function populateCountryCodes() {
    const list = document.getElementById('cc-list');
    const hidden = document.getElementById('country-code');
    const label = document.getElementById('cc-label');
    const btn = document.getElementById('cc-btn');
    if (!list || !hidden || !label || !btn) return;

    const priority = ['IN', 'US', 'GB', 'AE', 'CA', 'AU'];
    const ordered = [
        ...priority.map(code => COUNTRY_CODES.find(c => c.code === code)).filter(Boolean),
        null, // separator
        ...COUNTRY_CODES.filter(c => !priority.includes(c.code)),
    ];

    const choose = (country) => {
        hidden.value = country.dial_code;
        label.textContent = `${country.flag} ${country.dial_code}`;
        list.classList.add('hidden');
    };

    list.innerHTML = '';
    ordered.forEach(country => {
        if (!country) {
            const sep = document.createElement('div');
            sep.className = 'cc-sep';
            list.appendChild(sep);
            return;
        }
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cc-item';
        item.setAttribute('role', 'option');
        item.innerHTML = `<span>${country.flag} ${country.name}</span><span class="cc-dial">${country.dial_code}</span>`;
        item.addEventListener('click', () => choose(country));
        list.appendChild(item);
    });

    // Toggle open/close
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        list.classList.toggle('hidden');
    });
    // Close on outside click / Escape
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#cc-wrap')) list.classList.add('hidden');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') list.classList.add('hidden');
    });
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
    }
}

/**
 * Show dashboard section
 * @param {string} sectionId - Section to show
 */
function showDashboardSection(sectionId) {
    currentDashboardSection = sectionId;
    
    // Update header title
    const titles = {
        'home': 'Dashboard Overview',
        'inventory': 'Document Inventory',
        'analytics': 'Analytics Dashboard',
        'verify': 'Verify Document',
        'authenticity': 'Authenticity Check',
        'received': 'Received Documents',
        'qrVerification': 'QR Scanner',
        'share': 'Share Document',
        'profile': 'My Profile',
        'settings': 'Settings'
    };
    
    document.getElementById('header-title').textContent = titles[sectionId] || 'Dashboard';
    
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('text-brand-700', 'bg-brand-50');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50');
    });
    
    // Find and activate current nav item
    const currentNavItem = document.querySelector(`[onclick="showDashboardSection('${sectionId}')"]`);
    if (currentNavItem) {
        currentNavItem.classList.add('text-brand-700', 'bg-brand-50');
        currentNavItem.classList.remove('text-slate-600', 'hover:bg-slate-50');
    }
    
    // CRITICAL FIX: Reload data for sections that need fresh data
    if (sectionId === 'inventory' || sectionId === 'analytics' || sectionId === 'home') {
        // Show loading state for inventory
        if (sectionId === 'inventory') {
            const content = document.getElementById('dashboard-content');
            content.innerHTML = `
                <div class="flex items-center justify-center h-64">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                        <p class="text-slate-600">Loading your documents...</p>
                    </div>
                </div>
            `;
        }
        
        // Load fresh data before showing the section
        loadDashboardData().then(() => {
            // Load section content after data is loaded
            loadDashboardSection(sectionId);
        }).catch(() => {
            // Load section content even if data loading fails
            loadDashboardSection(sectionId);
        });
    } else {
        // Load section content immediately for other sections
        loadDashboardSection(sectionId);
    }
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        toggleSidebar();
    }
}

// --- AUTHENTICATION FUNCTIONS ---

/**
 * Check password strength
 * @param {string} password 
 * @returns {boolean} valid
 */
function checkPasswordStrength(password) {
    const requirements = {
        length: password.length >= 6,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    const updateUI = (reqId, valid) => {
        const el = document.getElementById(reqId);
        if (!el) return;
        
        const dot = el.querySelector('span');
        if (valid) {
            el.classList.remove('text-slate-500');
            el.classList.add('text-green-600');
            dot.classList.remove('bg-slate-300');
            dot.classList.add('bg-green-600');
        } else {
            el.classList.add('text-slate-500');
            el.classList.remove('text-green-600');
            dot.classList.add('bg-slate-300');
            dot.classList.remove('bg-green-600');
        }
    };

    updateUI('req-length', requirements.length);
    updateUI('req-upper', requirements.upper);
    updateUI('req-lower', requirements.lower);
    updateUI('req-number', requirements.number);
    updateUI('req-special', requirements.special);

    return Object.values(requirements).every(Boolean);
}

/**
 * Handle user signup
 * @param {Event} e - Form submit event
 */
async function handleSignup(e) {
    e.preventDefault();
    toggleLoading(true);

    const formData = new FormData(e.target);

    // Validation
    const password = formData.get('password');
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    // Check password strength
    if (!checkPasswordStrength(password)) {
        showAuthError('Password does not meet connection requirements');
        toggleLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        toggleLoading(false);
        return;
    }
    
    if (!isEmailVerified) {
        showAuthError('Please verify your email address first');
        toggleLoading(false);
        return;
    }

    // MetaMask wallet is mandatory — connect and prove ownership before signup.
    let wallet;
    try {
        wallet = await Wallet.authenticate(true);
    } catch (err) {
        showAuthError(err.message || 'Connect your MetaMask wallet to sign up.');
        toggleLoading(false);
        return;
    }

    // Construct full phone number
    const countryCode = document.getElementById('country-code').value;
    const phoneNumber = formData.get('phone');
    const fullPhone = `${countryCode} ${phoneNumber}`;

    const userData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: fullPhone,
        password: password,
        walletAddress: wallet.walletAddress,
        signature: wallet.signature
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Account created successfully!', 'success');
            setTimeout(() => switchAuthTab('signin'), 1000);
        } else {
            showAuthError(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAuthError('Connection error. Please try again.');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handle user signin
 * @param {Event} e - Form submit event
 */
async function handleSignin(e) {
    e.preventDefault();
    toggleLoading(true);

    const formData = new FormData(e.target);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            // Load the FULL profile (email, phone, linked walletAddress) so the
            // wallet link persists/shows correctly right after login — not just
            // after a page reload.
            try {
                const profileResp = await fetch(`${API_BASE_URL}/profile`, { credentials: 'include' });
                if (profileResp.ok) currentUser = await profileResp.json();
            } catch (_) { /* fall back to the minimal user object */ }

            showToast(`Welcome back, ${currentUser.fullName || ''}!`, 'success');
            showPage('dashboard');
            showDashboardSection('home');
            updateUserInterface();

            // If a wallet is linked, silently re-reflect MetaMask connection.
            reconnectLinkedWallet();
        } else {
            showAuthError(data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Signin error:', error);
        showAuthError('Connection error. Please try again.');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Sign in with MetaMask: connect the wallet, sign a server nonce, and log in
 * the account linked to that wallet.
 */
async function handleSigninWallet() {
    const btn = document.getElementById('signin-metamask-btn');
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Connecting…'; }
    toggleLoading(true);
    try {
        const wallet = await Wallet.authenticate(true);
        const response = await fetch(`${API_BASE_URL}/auth/signin-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wallet),
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Wallet sign-in failed');

        currentUser = data.user;
        try {
            const profileResp = await fetch(`${API_BASE_URL}/profile`, { credentials: 'include' });
            if (profileResp.ok) currentUser = await profileResp.json();
        } catch (_) { /* fall back to minimal user */ }

        showToast(`Welcome back, ${currentUser.fullName || ''}!`, 'success');
        showPage('dashboard');
        showDashboardSection('home');
        updateUserInterface();
        reconnectLinkedWallet();
    } catch (error) {
        showAuthError(error.message || 'Wallet sign-in failed');
    } finally {
        toggleLoading(false);
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        userDocuments = [];
        userStatistics = {};
        
        showToast('Logged out successfully', 'info');
        showPage('guestPage');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

/**
 * Show authentication error
 * @param {string} message - Error message
 */
function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// --- DATA LOADING FUNCTIONS ---

/**
 * Check authentication status on page load
 */
async function checkAuthStatus() {
    try {
        toggleLoading(true);
        const response = await fetch(`${API_BASE_URL}/profile`, {
            credentials: 'include'
        });

        if (response.ok) {
            currentUser = await response.json();
            showPage('dashboard');
            showDashboardSection('home');
            updateUserInterface();
            reconnectLinkedWallet();
        } else {
            showPage('guestPage');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showPage('guestPage');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Refresh document inventory data
 */
async function refreshDocumentInventory() {
    try {
        // Load fresh documents
        const docsResponse = await fetch(`${API_BASE_URL}/documents`, {
            credentials: 'include'
        });
        
        if (docsResponse.ok) {
            userDocuments = await docsResponse.json();
            console.log('📊 Document inventory refreshed:', userDocuments.length, 'documents');
            
            // If currently viewing inventory, refresh the display
            if (currentDashboardSection === 'inventory') {
                loadDashboardSection('inventory');
            }
        }
    } catch (error) {
        console.error('Error refreshing document inventory:', error);
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    if (!currentUser) return;
    
    try {
        // Load statistics
        const statsResponse = await fetch(`${API_BASE_URL}/stats`, {
            credentials: 'include'
        });
        
        if (statsResponse.ok) {
            userStatistics = await statsResponse.json();
        }
        
        // Load documents
        const docsResponse = await fetch(`${API_BASE_URL}/documents`, {
            credentials: 'include'
        });
        
        if (docsResponse.ok) {
            userDocuments = await docsResponse.json();
        }

        // Merge documents RECEIVED through the Issuer Portal — the data this
        // account actually uses — so overview/analytics reflect reality.
        try {
            const recResp = await fetch(`${API_BASE_URL}/received-documents`, { credentials: 'include' });
            if (recResp.ok) {
                const received = await recResp.json();
                userDocuments = (userDocuments || []).concat(received.map(d => ({
                    __received: true,
                    docId: d.docId,
                    name: `${d.docType || 'Document'}${d.docNumber ? ' — ' + d.docNumber : ''}`,
                    docType: d.docType || 'Document',
                    docNumber: d.docNumber,
                    status: 'Verified',
                    transactionHash: d.transactionHash,
                    documentCID: d.documentCID,
                    uploadDate: d.issuedAt,
                    submittedAt: d.issuedAt,
                })));
            }
        } catch (e) { console.warn('received-docs merge failed', e); }

        // Update current section
        loadDashboardSection(currentDashboardSection);
        
    } catch (error) {
        console.error('Dashboard data loading error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Update user interface with current user data
 */
function updateUserInterface() {
    if (!currentUser) return;
    
    // Update user name displays
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const mobilePortalTitle = document.getElementById('mobile-portal-title');
    
    if (userName) userName.textContent = currentUser.fullName || 'User';
    if (userAvatar) userAvatar.textContent = getUserInitials(currentUser.fullName);
    if (sidebarTitle) sidebarTitle.textContent = `${currentUser.fullName?.split(' ')[0] || 'My'}'s Portal`;
    if (mobilePortalTitle) mobilePortalTitle.textContent = `${currentUser.fullName?.split(' ')[0] || 'User'} Portal`;
    
    // Update wallet status
    const walletStatus = document.getElementById('wallet-status');
    const userStatus = document.getElementById('user-status');
    
    if (currentUser.walletAddress) {
        if (walletStatus) {
            walletStatus.className = 'hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full';
            walletStatus.innerHTML = `
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span class="text-xs font-medium text-emerald-700">${currentUser.walletAddress.slice(0, 6)}...${currentUser.walletAddress.slice(-4)}</span>
            `;
        }
        if (userStatus) userStatus.textContent = 'Wallet Linked';
    } else {
        if (walletStatus) {
            walletStatus.className = 'hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full';
            walletStatus.innerHTML = `
                <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span class="text-xs font-medium text-orange-700">Wallet Not Linked</span>
            `;
        }
        if (userStatus) userStatus.textContent = 'Authorized User';
    }
}

/**
 * After login, silently reflect MetaMask connection if a wallet is already
 * linked to the account. The link itself lives in the DB, so it persists across
 * logins regardless of MetaMask's per-tab connection state.
 */
async function reconnectLinkedWallet() {
    try {
        if (!currentUser?.walletAddress || typeof window.ethereum === 'undefined') return;
        await window.ethereum.request({ method: 'eth_accounts' }); // no prompt
        updateUserInterface();
    } catch (_) { /* non-fatal */ }
}

// --- DASHBOARD SECTION LOADING ---

/**
 * Load specific dashboard section content
 * @param {string} sectionId - Section to load
 */
function loadDashboardSection(sectionId) {
    const content = document.getElementById('dashboard-content');
    
    switch (sectionId) {
        case 'home':
            content.innerHTML = getDashboardOverviewHTML();
            break;
        case 'inventory':
            content.innerHTML = getDocumentInventoryHTML();
            break;
        case 'analytics':
            content.innerHTML = getAnalyticsDashboardHTML();
            loadAnalyticsCharts();
            break;
        case 'verify':
            content.innerHTML = getDocumentVerificationHTML();
            setupDocumentVerification();
            break;
        case 'authenticity':
            content.innerHTML = getAuthenticityCheckHTML();
            setupAuthenticityCheck();
            break;
        case 'received':
            content.innerHTML = getReceivedDocumentsHTML();
            loadReceivedDocuments();
            break;
        case 'qrVerification':
            content.innerHTML = getQRScannerHTML();
            setupQRScanner();
            break;
        case 'profile':
            content.innerHTML = getUserProfileHTML();
            setupUserProfile();
            break;
        case 'settings':
            content.innerHTML = getSettingsHTML();
            break;
        case 'share':
            content.innerHTML = getShareDocumentHTML();
            setupShareDocument();
            break;
        default:
            content.innerHTML = getDashboardOverviewHTML();
    }
}

// --- HTML TEMPLATE FUNCTIONS ---

/**
 * Get dashboard overview HTML
 * @returns {string} HTML content
 */
function getDashboardOverviewHTML() {
    const stats = userStatistics;
    const greeting = getGreeting();
    const firstName = currentUser?.fullName?.split(' ')[0] || 'User';

    // ---- Recent chain activity (real documents) ----
    const docs = (userDocuments || []);
    const explorer = (window.DOCV_CONTRACT?.CHAIN_CONFIG?.blockExplorerUrls?.[0]) || 'https://sepolia.etherscan.io';
    const truncHash = (h) => h ? `${h.slice(0, 6)}…${h.slice(-4)}` : '—';
    const recent = [...docs].sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0)).slice(0, 5);
    const recentRows = recent.length ? recent.map(d => `
        <div class="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
            <div class="min-w-0">
                <p class="font-semibold text-slate-800 truncate">${d.name || d.docType || 'Untitled'}</p>
                <p class="text-xs text-slate-400">${d.docType || 'Document'} · ${formatDate(d.uploadDate)}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(d.status)}">${d.status || 'Unknown'}</span>
                ${d.transactionHash
                    ? `<a href="${explorer}/tx/${d.transactionHash}" target="_blank" rel="noopener" class="font-mono text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1" title="View on explorer">${truncHash(d.transactionHash)}<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>`
                    : `<span class="text-xs text-slate-300">no tx</span>`}
            </div>
        </div>`).join('') : `<div class="py-10 text-center text-slate-400 text-sm">No chain activity yet — documents issued to you will appear here.</div>`;

    // ---- Storage & node status (real metrics) ----
    const pinned = docs.filter(d => d.documentCID).length;
    const totalDocs = docs.length;
    const pinnedPct = totalDocs ? Math.round((pinned / totalDocs) * 100) : 0;
    const usedBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
    const usedLabel = (typeof formatFileSize === 'function' && usedBytes) ? formatFileSize(usedBytes) : '0 B';
    const ringCirc = 2 * Math.PI * 52;
    const ringOffset = ringCirc * (1 - pinnedPct / 100);
    const ipfsUp = pinned > 0;

    return `
        <div class="space-y-8">
            <!-- Welcome Header -->
            <div class="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">
                            ${greeting}, ${firstName}! 👋
                        </h1>
                        <p class="text-brand-100 text-lg">
                            Welcome to your personal document management portal
                        </p>
                    </div>
                    <div class="hidden md:block text-6xl opacity-20">
                        📄
                    </div>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Total Documents</p>
                            <h3 class="text-3xl font-bold text-slate-800">
                                ${stats?.totalDocuments || stats?.totalVerified || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                            📋
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Verified</p>
                            <h3 class="text-3xl font-bold text-emerald-600">
                                ${stats?.verifiedDocuments || stats?.successfulVerifications || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                            ✅
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">IPFS Stored</p>
                            <h3 class="text-3xl font-bold text-purple-600">
                                ${stats?.totalIPFSUploads || pinned || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">
                            🌐
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Success Rate</p>
                            <h3 class="text-3xl font-bold text-brand-600">
                                ${stats?.successRate || 0}%
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center text-2xl">
                            📈
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div>
                <h3 class="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 action-grid">
                    <button onclick="showDashboardSection('analytics')" class="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left">
                        <div class="flex items-center justify-between mb-4">
                            <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                                📊
                            </div>
                            <svg class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                            Analytics Dashboard
                        </h4>
                        <p class="text-sm text-slate-500 mt-1">
                            View insights and statistics
                        </p>
                    </button>

                    <button onclick="showDashboardSection('authenticity')" class="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left">
                        <div class="flex items-center justify-between mb-4">
                            <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                                🛡️
                            </div>
                            <svg class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                            Authenticity Check
                        </h4>
                        <p class="text-sm text-slate-500 mt-1">
                            Test a file against the registered original
                        </p>
                    </button>

                    <button onclick="showDashboardSection('received')" class="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left">
                        <div class="flex items-center justify-between mb-4">
                            <div class="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl">
                                📥
                            </div>
                            <svg class="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                            Received Documents
                        </h4>
                        <p class="text-sm text-slate-500 mt-1">
                            View, share and download your documents
                        </p>
                    </button>
                </div>
            </div>

            <!-- Recent Activity + Storage / Node Status -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div class="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-lg font-bold text-slate-800">Recent Chain Activity</h3>
                        <button onclick="showDashboardSection('received')" class="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</button>
                    </div>
                    <div>${recentRows}</div>
                </div>

                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Storage &amp; Node Status</h3>
                    <div class="flex items-center gap-5">
                        <div class="relative h-28 w-28 shrink-0">
                            <svg class="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="10"></circle>
                                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#ringgrad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${ringCirc.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}"></circle>
                                <defs><linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-2xl font-bold text-slate-800">${pinnedPct}%</span>
                                <span class="text-[10px] text-slate-400 uppercase tracking-wide">pinned</span>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <p class="text-slate-500">Decentralized storage</p>
                            <p class="text-slate-800 font-semibold">${usedLabel} <span class="text-slate-400 font-normal">· ${pinned}/${totalDocs} on IPFS</span></p>
                            <div class="flex items-center gap-2 pt-1">
                                <span class="relative flex h-2.5 w-2.5"><span class="${ipfsUp ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${ipfsUp ? 'bg-emerald-400' : 'bg-amber-400'} opacity-70"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 ${ipfsUp ? 'bg-emerald-500' : 'bg-amber-500'}"></span></span>
                                <span class="text-slate-600 font-medium">IPFS / Pinata — ${ipfsUp ? 'Connected' : 'Awaiting first pin'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="h-2.5 w-2.5 rounded-full bg-brand-500"></span>
                                <span class="text-slate-600 font-medium" id="dash-network">Sepolia Testnet</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ponytail: instant-verify dropzone removed with the Verify section.

/**
 * Get document inventory HTML
 * @returns {string} HTML content
 */
function getDocumentInventoryHTML() {
    const docs = userDocuments || [];
    const statusCounts = {
        total: docs.length,
        verified: docs.filter(doc => doc.status === 'Verified').length,
        rejected: docs.filter(doc => doc.status === 'Rejected').length,
        pending: docs.filter(doc => doc.status === 'Pending').length,
        ipfsStored: docs.filter(doc => doc.documentCID).length
    };

    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        📂 Document Inventory
                    </h1>
                    <p class="text-slate-600 mt-1">
                        Manage and access your verified documents securely
                    </p>
                </div>
                
                <button onclick="loadDashboardData()" class="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                </button>
            </div>

            <!-- Status Overview Cards -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stat-grid">
                <div class="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-600 text-sm font-medium">Total</p>
                            <p class="text-2xl font-bold text-slate-700">${statusCounts.total}</p>
                        </div>
                        <div class="text-2xl">📄</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-emerald-600 text-sm font-medium">Verified</p>
                            <p class="text-2xl font-bold text-emerald-700">${statusCounts.verified}</p>
                        </div>
                        <div class="text-2xl">✅</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-xl border border-red-200 hover:shadow-md transition-shadow stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-red-600 text-sm font-medium">Rejected</p>
                            <p class="text-2xl font-bold text-red-700">${statusCounts.rejected}</p>
                        </div>
                        <div class="text-2xl">❌</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-xl border border-orange-200 hover:shadow-md transition-shadow stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-orange-600 text-sm font-medium">Pending</p>
                            <p class="text-2xl font-bold text-orange-700">${statusCounts.pending}</p>
                        </div>
                        <div class="text-2xl">⏳</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-xl border border-blue-200 hover:shadow-md transition-shadow stat-card">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-600 text-sm font-medium">IPFS Stored</p>
                            <p class="text-2xl font-bold text-blue-700">${statusCounts.ipfsStored}</p>
                        </div>
                        <div class="text-2xl">🌐</div>
                    </div>
                </div>
            </div>

            <!-- Document List -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-100">
                    <h3 class="text-lg font-semibold text-slate-800">Your Documents</h3>
                    <p class="text-sm text-slate-500 mt-1">Click on any document to view details</p>
                </div>
                
                <div class="divide-y divide-slate-100">
                    ${docs.length === 0 ? `
                        <div class="p-8 text-center">
                            <div class="text-6xl mb-4">📄</div>
                            <h3 class="text-lg font-semibold text-slate-800 mb-2">No documents found</h3>
                            <p class="text-slate-500 mb-4">Start by verifying your first document</p>
                            <button onclick="showDashboardSection('verify')" class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg transition-colors">
                                Verify Document
                            </button>
                        </div>
                    ` : docs.map(doc => `
                        <div class="p-6 hover:bg-slate-50 transition-colors document-card ${doc.status === 'Rejected' ? '' : 'cursor-pointer'}" onclick="${doc.status === 'Rejected' ? `showToast('This document has been rejected', 'error')` : `viewDocument('${doc.id}')`}">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <div class="text-3xl">${getStatusIcon(doc.status)}</div>
                                    <div>
                                        <h4 class="font-semibold text-slate-800">${doc.name || 'Untitled Document'}</h4>
                                        <p class="text-sm text-slate-500">Type: ${doc.docType || 'Unknown'} • Number: ${doc.docNumber || 'N/A'}</p>
                                        <p class="text-xs text-slate-400">Uploaded: ${formatDate(doc.uploadDate)}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}">
                                        ${doc.status || 'Unknown'}
                                    </span>
                                    ${doc.documentCID ? `
                                        <p class="text-xs text-slate-400 mt-1">IPFS: ${doc.documentCID.substring(0, 10)}...</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Get analytics dashboard HTML
 * @returns {string} HTML content
 */
function getAnalyticsDashboardHTML() {
    const stats = userStatistics;
    
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        📊 Analytics Dashboard
                    </h1>
                    <p class="text-slate-600 mt-1">
                        Real-time insights into your document verification activities
                    </p>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <button
                            onclick="toggleAutoRefresh()"
                            id="auto-refresh-toggle"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-brand-600"
                        >
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
                        </button>
                        <span class="text-sm text-slate-600">Auto-refresh</span>
                    </div>
                    
                    <button onclick="loadDashboardData()" class="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Total Documents</p>
                            <h3 id="an-total" class="text-3xl font-bold text-slate-800">
                                ${stats?.totalDocuments || userDocuments.length || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                            📋
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Verified</p>
                            <h3 id="an-verified" class="text-3xl font-bold text-emerald-600">
                                ${stats?.verifiedDocuments || userDocuments.filter(doc => doc.status === 'Verified').length || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                            ✅
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">Success Rate</p>
                            <h3 id="an-rate" class="text-3xl font-bold text-brand-600">
                                ${stats?.successRate || 0}%
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center text-2xl">
                            📈
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-slate-500 text-sm font-medium mb-1">IPFS Stored</p>
                            <h3 id="an-ipfs" class="text-3xl font-bold text-purple-600">
                                ${stats?.ipfsUploads || userDocuments.filter(doc => doc.documentCID).length || 0}
                            </h3>
                        </div>
                        <div class="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">
                            🌐
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 class="text-lg font-semibold text-slate-800 mb-4">Document Status Distribution</h3>
                    <div class="relative h-64">
                        <canvas id="status-chart"></canvas>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 class="text-lg font-semibold text-slate-800 mb-4">Document Types</h3>
                    <div class="relative h-64">
                        <canvas id="types-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Activity Feed -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100">
                <div class="p-6 border-b border-slate-100">
                    <h3 class="text-lg font-semibold text-slate-800">Recent Activity</h3>
                </div>
                <div class="divide-y divide-slate-100">
                    ${userDocuments.slice(0, 5).map(doc => `
                        <div class="p-6 hover:bg-slate-50 transition-colors">
                            <div class="flex items-center gap-4">
                                <div class="text-2xl">${getStatusIcon(doc.status)}</div>
                                <div class="flex-1">
                                    <p class="font-medium text-slate-800">
                                        ${doc.status === 'Verified' ? 'Verified' : 'Uploaded'} ${doc.docType || 'Document'}
                                    </p>
                                    <p class="text-sm text-slate-500">
                                        ${doc.docNumber || 'No reference number'} • ${formatDate(doc.uploadDate)}
                                    </p>
                                </div>
                                <span class="text-xs text-slate-400">
                                    ${formatDate(doc.uploadDate)}
                                </span>
                            </div>
                        </div>
                    `).join('') || `
                        <div class="p-8 text-center">
                            <div class="text-4xl mb-2">📊</div>
                            <p class="text-slate-500">No recent activity</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Get document verification HTML
 * @returns {string} HTML content
 */
function getDocumentVerificationHTML() {
    return `
        <div class="max-w-2xl mx-auto space-y-6">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div class="text-center mb-8">
                    <h3 class="text-2xl font-bold text-slate-800">Verify Document</h3>
                    <p class="text-slate-500 mt-2">
                        Upload your document to verify its authenticity on the blockchain
                    </p>
                </div>

                <form id="verification-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">
                                Document Type
                            </label>
                            <select
                                name="docType"
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                required
                            >
                                <option value="Birth Certificate">Birth Certificate</option>
                                <option value="Educational Certificate">Educational Certificate</option>
                                <option value="Property Document">Property Document</option>
                                <option value="Identity Document">Identity Document</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">
                                Reference Number
                            </label>
                            <input
                                type="text"
                                name="docNumber"
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="e.g. BC-2023-001"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-2">
                            Upload Document
                        </label>
                        <label
                            for="document-file"
                            class="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-brand-50 hover:border-brand-400 transition-all"
                        >
                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg class="w-10 h-10 mb-3 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                </svg>
                                <p class="mb-2 text-sm text-slate-500 font-medium">
                                    <span class="font-bold text-brand-600">Click to upload</span> or drag and drop
                                </p>
                                <p class="text-xs text-slate-400">PDF, PNG, JPG (MAX. 5MB)</p>
                            </div>
                            <input
                                id="document-file"
                                type="file"
                                class="hidden"
                                accept=".pdf,.jpg,.png"
                                required
                            />
                        </label>
                        
                        <div id="selected-file" class="mt-2 text-sm text-slate-600 font-medium hidden">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <span id="file-name"></span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="verify-button"
                        class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50"
                    >
                        Securely Verify Document
                    </button>
                </form>

                <div id="verification-result" class="mt-6 hidden"></div>
            </div>
        </div>
    `;
}

/**
 * Get QR scanner HTML
 * @returns {string} HTML content
 */
function getQRScannerHTML() {
    return `
        <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">QR Code Scanner</h3>
                    <p class="text-slate-500 mt-2">
                        Scan a document QR code to validate its integrity
                    </p>
                </div>

                <div class="space-y-6">
                    <div id="qr-reader-hidden" class="hidden"></div>
                    <div class="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center">
                        <div id="qr-camera-view" class="text-white text-center">
                            <div class="text-4xl mb-4">📱</div>
                            <p>Camera is off</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <button
                            onclick="toggleQRCamera()"
                            id="camera-toggle"
                            class="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            Start Camera
                        </button>
                        
                        <button
                            onclick="document.getElementById('qr-file-input').click()"
                            id="upload-qr-button"
                            class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                        >
                            Upload QR Image
                        </button>
                        <input
                            id="qr-file-input"
                            type="file"
                            accept="image/*"
                            class="hidden"
                        />
                    </div>

                    <div id="qr-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-4 text-red-700"></div>
                    <div id="qr-result" class="hidden bg-slate-50 border border-slate-200 rounded-xl p-6"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get user profile HTML
 * @returns {string} HTML content
 */
function getUserProfileHTML() {
    const user = currentUser;
    
    return `
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <!-- Header -->
                <div class="bg-brand-900 h-32 relative">
                    <div class="absolute inset-0 bg-hero-pattern opacity-20 bg-cover bg-center"></div>
                </div>
                
                <div class="px-8 pb-8">
                    <div class="relative flex justify-between items-end -mt-12 mb-6">
                        <div class="h-24 w-24 bg-white p-1 rounded-full shadow-lg">
                            <div class="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-4xl">
                                👤
                            </div>
                        </div>
                    </div>

                    <div class="grid md:grid-cols-2 gap-12">
                        <!-- Profile Info -->
                        <div>
                            <h3 class="text-3xl font-bold text-slate-800">
                                ${user?.fullName || 'User'}
                            </h3>
                            <p class="text-slate-500 mb-4">${user?.email || 'user@example.com'}</p>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs text-slate-500 uppercase tracking-wider">Phone</label>
                                    <p class="text-sm text-slate-800">${user?.phone || 'Not provided'}</p>
                                </div>
                                
                                <div>
                                    <label class="text-xs text-slate-500 uppercase tracking-wider">Wallet Status</label>
                                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        user?.walletAddress 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : 'bg-orange-50 text-orange-700 border border-orange-100'
                                    }">
                                        <span class="w-2 h-2 rounded-full ${
                                            user?.walletAddress ? 'bg-emerald-500' : 'bg-orange-500'
                                        }"></span>
                                        ${user?.walletAddress ? 'Wallet Linked' : 'Wallet Not Linked'}
                                    </div>
                                    ${user?.walletAddress ? `
                                        <p class="text-xs text-slate-400 font-mono mt-2 break-all">
                                            ${user.walletAddress}
                                        </p>
                                        <div class="mt-3 flex flex-wrap gap-2">
                                            <button
                                                onclick="linkWallet()"
                                                class="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-lg transition-colors"
                                            >
                                                🔄 Change Wallet
                                            </button>
                                            <button
                                                onclick="unlinkWallet()"
                                                class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                            >
                                                🔓 Unlink Wallet
                                            </button>
                                        </div>
                                        <p class="text-xs text-slate-500 mt-2">
                                            "Change Wallet" lets you pick a different MetaMask account to link to this portal.
                                        </p>
                                    ` : `
                                        <div class="mt-3">
                                            <button
                                                onclick="linkWallet()"
                                                id="link-wallet-button"
                                                class="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                            >
                                                🔗 Link MetaMask Wallet
                                            </button>
                                            <p class="text-xs text-slate-500 mt-2">
                                                Link your MetaMask wallet to verify documents and access secure features.
                                            </p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>

                        <!-- Edit Form -->
                        <div>
                            <form id="profile-form" class="space-y-4">
                                <h4 class="text-lg font-bold text-slate-800 border-b pb-2">
                                    Edit Profile
                                </h4>
                                
                                <div id="profile-message" class="hidden p-3 rounded-lg text-sm"></div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value="${user?.fullName || ''}"
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-500 mb-1">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value="${user?.phone || ''}"
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value="${user?.email || ''}"
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        required
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    id="save-profile-button"
                                    class="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get settings HTML
 * @returns {string} HTML content
 */
function getSettingsHTML() {
    return `
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h3 class="text-2xl font-bold text-slate-800 mb-6">Settings</h3>
                
                <div class="space-y-8">
                    <!-- Account Settings -->
                    <div>
                        <h4 class="text-lg font-semibold text-slate-800 mb-4">Account Settings</h4>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p class="font-medium text-slate-800">Email Notifications</p>
                                    <p class="text-sm text-slate-500">Receive updates about your documents</p>
                                </div>
                                <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-600 transition-colors">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
                                </button>
                            </div>
                            
                            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p class="font-medium text-slate-800">Two-Factor Authentication</p>
                                    <p class="text-sm text-slate-500">Add an extra layer of security</p>
                                </div>
                                <button class="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                    Enable
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Privacy Settings -->
                    <div>
                        <h4 class="text-lg font-semibold text-slate-800 mb-4">Privacy Settings</h4>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p class="font-medium text-slate-800">Data Analytics</p>
                                    <p class="text-sm text-slate-500">Help improve our service</p>
                                </div>
                                <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 transition-colors">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Danger Zone -->
                    <div>
                        <h4 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h4>
                        <div class="p-4 border border-red-200 rounded-lg bg-red-50">
                            <p class="font-medium text-red-800 mb-2">Delete Account</p>
                            <p class="text-sm text-red-600 mb-4">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- SETUP FUNCTIONS ---

/**
 * Setup document verification functionality
 */
function setupDocumentVerification() {
    const form = document.getElementById('verification-form');
    const fileInput = document.getElementById('document-file');
    const selectedFileDiv = document.getElementById('selected-file');
    const fileNameSpan = document.getElementById('file-name');
    const resultDiv = document.getElementById('verification-result');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                selectedFileDiv.classList.remove('hidden');
                fileNameSpan.textContent = file.name;
            } else {
                selectedFileDiv.classList.add('hidden');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const file = fileInput.files[0];
            
            if (!file) {
                showToast('Please select a file', 'error');
                return;
            }
            
            formData.append('document', file);
            
            toggleLoading(true);
            resultDiv.classList.add('hidden');
            
            try {
                const response = await fetch(`${API_BASE_URL}/verify`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultDiv.className = 'mt-6 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700';
                    resultDiv.innerHTML = `
                        <div>
                            <p><strong>✅ Document Verified Successfully!</strong></p>
                            <p class="text-sm mt-2">Hash: ${result.fileHash?.substring(0, 20)}...</p>
                            ${result.documentCID ? `<p class="text-sm mt-1">IPFS CID: ${result.documentCID.substring(0, 20)}...</p>` : ''}
                            ${result.transactionHash ? `<p class="text-sm mt-1">Blockchain TX: ${result.transactionHash.substring(0, 20)}...</p>` : ''}
                            ${result.qrCodeDataUrl ? `
                                <div class="mt-4 text-center">
                                    <img src="${result.qrCodeDataUrl}" alt="QR Code" class="mx-auto w-32 h-32" />
                                    <p class="text-sm mt-2">QR Code for verification</p>
                                </div>
                            ` : ''}
                            <div class="mt-4 flex gap-3">
                                <button
                                    onclick="showDashboardSection('inventory')"
                                    class="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                                >
                                    View My Documents
                                </button>
                                <button
                                    onclick="document.getElementById('verification-result').classList.add('hidden'); document.getElementById('verification-form').reset(); document.getElementById('selected-file').classList.add('hidden');"
                                    class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-all"
                                >
                                    Verify Another
                                </button>
                            </div>
                        </div>
                    `;
                    showToast('Document verified successfully!', 'success');
                    
                    // CRITICAL FIX: Refresh document inventory after successful verification
                    refreshDocumentInventory();
                } else {
                    resultDiv.className = 'mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700';
                    resultDiv.innerHTML = `<p><strong>❌ Verification Failed:</strong> ${result.message || result.error}</p>`;
                    showToast('Verification failed', 'error');
                }
                
                resultDiv.classList.remove('hidden');
                
            } catch (error) {
                console.error('Verification error:', error);
                resultDiv.className = 'mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700';
                resultDiv.innerHTML = `<p><strong>❌ Verification Failed:</strong> Connection error. Please try again.</p>`;
                resultDiv.classList.remove('hidden');
                showToast('Connection error', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }
}

/**
 * Setup QR scanner functionality
 */
function setupQRScanner() {
    const fileInput = document.getElementById('qr-file-input');
    const errorDiv = document.getElementById('qr-error');
    const resultDiv = document.getElementById('qr-result');
    
    if (fileInput) {
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            toggleLoading(true);
            errorDiv.classList.add('hidden');
            resultDiv.classList.add('hidden');
            
            try {
                // Initialize Html5Qrcode
                // @ts-ignore - Global variable from script tag
                const html5QrCode = new Html5Qrcode("qr-reader-hidden");
                
                // Scan file
                const qrCodeMessage = await html5QrCode.scanFile(file, true);
                console.log('QR Code detected:', qrCodeMessage);
                
                if (qrCodeMessage) {
                    await processQRCode(qrCodeMessage);
                } else {
                    showQRError('No QR code found in image');
                }
                
                // Cleanup
                try {
                    await html5QrCode.clear();
                } catch (e) {
                    // Ignore clear errors
                }
            } catch (error) {
                console.error('QR Scan error:', error);
                showQRError('Failed to read QR code. Please ensure the image is clear.');
            } finally {
                toggleLoading(false);
            }
        });
    }
}

/**
 * Process QR code data
 * @param {string} qrData - QR code data
 */
async function processQRCode(qrData) {
    try {
        const url = new URL(qrData);
        const qrId = url.searchParams.get('id');
        
        if (!qrId) {
            showQRError('Invalid QR code format');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/qr-check?id=${qrId}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showQRResult({
                qrId,
                ...result,
                needsWalletVerification: true
            });
        } else {
            showQRError(result.message || 'Failed to verify QR code');
        }
        
    } catch (error) {
        showQRError(error.message || 'Failed to verify QR code');
    }
}

/**
 * Show QR error
 * @param {string} message - Error message
 */
function showQRError(message) {
    const errorDiv = document.getElementById('qr-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

/**
 * Show QR result
 * @param {Object} result - QR result data
 */
function showQRResult(result) {
    const resultDiv = document.getElementById('qr-result');
    
    resultDiv.innerHTML = `
        <p class="font-medium text-lg mb-4 text-center">QR Code Verification Result</p>
        
        <div class="bg-white p-4 rounded-lg border border-slate-100 text-sm space-y-3">
            <div class="flex justify-between">
                <span class="text-slate-500">Document Type:</span>
                <span class="font-semibold">${result.docType}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-500">Status:</span>
                <span class="font-bold ${result.verificationStatus === 'Verified' ? 'text-emerald-600' : 'text-orange-600'}">
                    ${result.verificationStatus}
                </span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-500">Submitted:</span>
                <span class="font-medium">
                    ${new Date(result.submittedAt).toLocaleDateString()}
                </span>
            </div>

            ${result.needsWalletVerification ? `
                <div class="mt-4 pt-4 border-t border-slate-200">
                    <p class="text-sm text-slate-600 mb-3">
                        🔐 Wallet verification required to view full document details
                    </p>
                    <div class="space-y-2">
                        <button
                            onclick="verifyQRWallet('${result.qrId}')"
                            id="verify-wallet-button"
                            class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            Verify with MetaMask
                        </button>
                        <p class="text-xs text-slate-500 text-center">
                            Note: You need to use the wallet that was linked to this document's owner account.
                        </p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    resultDiv.classList.remove('hidden');
}

/**
 * Verify QR with wallet
 * @param {string} qrId - QR ID
 */
async function verifyQRWallet(qrId) {
    try {
        if (typeof window.ethereum === 'undefined') {
            showQRError('MetaMask is required for wallet verification. Please install MetaMask extension.');
            return;
        }
        
        toggleLoading(true);
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];
        
        const message = `Verify document access for QR ID: ${qrId}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress],
        });
        
        const response = await fetch(`${API_BASE_URL}/qr-verify-signature`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrId,
                walletAddress,
                signature,
                message
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update result with full details
            const resultDiv = document.getElementById('qr-result');
            const currentContent = resultDiv.innerHTML;
            
            let statusMessage = '✅ Wallet Verified - Full Details:';
            let statusClass = 'text-emerald-600';
            
            // Handle warning for documents without linked wallets
            if (result.warning) {
                statusMessage = '⚠️ Wallet Verified (No Owner Wallet Linked) - Full Details:';
                statusClass = 'text-orange-600';
            }
            
            const walletSection = `
                <div class="mt-4 pt-4 border-t border-slate-200 space-y-2">
                    <p class="text-sm font-semibold ${statusClass} mb-2">
                        ${statusMessage}
                    </p>
                    ${result.warning ? `
                        <div class="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                            ${result.warning}
                        </div>
                    ` : ''}
                    <div class="flex justify-between">
                        <span class="text-slate-500">Document Number:</span>
                        <span class="font-medium">${result.docNumber}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">File Hash:</span>
                        <span class="font-mono text-xs">${result.fileHash?.substring(0, 20)}...</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Blockchain TX:</span>
                        <span class="font-mono text-xs">${result.transactionHash?.substring(0, 20)}...</span>
                    </div>
                    ${result.documentCID ? `
                        <div class="flex justify-between">
                            <span class="text-slate-500">IPFS CID:</span>
                            <span class="font-mono text-xs">${result.documentCID.substring(0, 20)}...</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            resultDiv.innerHTML = currentContent.replace(/needsWalletVerification.*?<\/div>\s*<\/div>/s, '') + walletSection;
            
            if (result.warning) {
                showToast('Wallet verified with warning - check details', 'info');
            } else {
                showToast('Wallet verified successfully!', 'success');
            }
        } else {
            // Enhanced error handling
            let errorMessage = result.message || 'Wallet verification failed';
            
            if (result.details) {
                errorMessage += `\n\nYour wallet: ${result.details.yourWallet}\nRequired wallet: ${result.details.requiredWallet}`;
                
                if (result.details.suggestion) {
                    errorMessage += `\n\nSuggestion: ${result.details.suggestion}`;
                }
            }
            
            showQRError(errorMessage);
        }
        
    } catch (error) {
        console.error('Wallet verification error:', error);
        if (error.message.includes('User rejected')) {
            showQRError('MetaMask signature was cancelled. Please try again.');
        } else {
            showQRError(`Wallet verification failed: ${error.message}`);
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Toggle QR camera
 */
function toggleQRCamera() {
    const cameraView = document.getElementById('qr-camera-view');
    const toggleButton = document.getElementById('camera-toggle');
    
    if (toggleButton.textContent === 'Start Camera') {
        cameraView.innerHTML = `
            <div class="text-white text-center">
                <div class="animate-pulse text-4xl mb-4">📷</div>
                <p>Camera is active - point at QR code</p>
                <p class="text-sm text-white/70 mt-2">
                    (Camera scanning not implemented - use Upload Image instead)
                </p>
            </div>
        `;
        toggleButton.textContent = 'Stop Camera';
        toggleButton.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors';
    } else {
        cameraView.innerHTML = `
            <div class="text-white/50 text-center">
                <div class="text-4xl mb-4">📱</div>
                <p>Camera is off</p>
            </div>
        `;
        toggleButton.textContent = 'Start Camera';
        toggleButton.className = 'bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors';
    }
}

/**
 * Setup user profile functionality
 */
function setupUserProfile() {
    const form = document.getElementById('profile-form');
    const messageDiv = document.getElementById('profile-message');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const profileData = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };
            
            toggleLoading(true);
            messageDiv.classList.add('hidden');
            
            try {
                const response = await fetch(`${API_BASE_URL}/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData),
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    currentUser = { ...currentUser, ...profileData };
                    updateUserInterface();
                    
                    messageDiv.className = 'p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200';
                    messageDiv.textContent = 'Profile updated successfully!';
                    messageDiv.classList.remove('hidden');
                    
                    showToast('Profile updated successfully!', 'success');
                } else {
                    messageDiv.className = 'p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200';
                    messageDiv.textContent = result.message || 'Failed to update profile';
                    messageDiv.classList.remove('hidden');
                    
                    showToast('Failed to update profile', 'error');
                }
                
            } catch (error) {
                console.error('Profile update error:', error);
                messageDiv.className = 'p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200';
                messageDiv.textContent = 'Connection error. Please try again.';
                messageDiv.classList.remove('hidden');
                
                showToast('Connection error', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }
}

/**
 * Link (or change) the MetaMask wallet for the User Portal.
 * Forces MetaMask's account picker so the user chooses which account to link,
 * instead of silently grabbing whatever account is currently active.
 */
async function linkWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            showToast('MetaMask is required. Please install MetaMask extension.', 'error');
            return;
        }

        toggleLoading(true);

        // Force the MetaMask account-selection popup so the user can pick which
        // account to link/switch to (otherwise eth_requestAccounts returns the
        // active account without prompting).
        try {
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            });
        } catch (permErr) {
            // Older MetaMask or user dismissed the picker — fall back to the
            // active account below.
            console.warn('Account picker not shown:', permErr.message);
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];

        const response = await fetch(`${API_BASE_URL}/profile/link-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress }),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            currentUser.walletAddress = walletAddress;
            updateUserInterface();
            showDashboardSection('profile'); // Refresh profile page
            showToast(`Wallet linked: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, 'success');
        } else {
            showToast(result.message || 'Failed to link wallet', 'error');
        }

    } catch (error) {
        console.error('Wallet linking error:', error);
        if (error.message.includes('User rejected')) {
            showToast('MetaMask connection was cancelled.', 'error');
        } else {
            showToast('Failed to link wallet', 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Unlink the currently linked MetaMask wallet from the User Portal account.
 */
async function unlinkWallet() {
    if (!confirm('Unlink your MetaMask wallet from this account? You can link a different one afterwards.')) {
        return;
    }
    try {
        toggleLoading(true);

        const response = await fetch(`${API_BASE_URL}/profile/unlink-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            currentUser.walletAddress = null;
            updateUserInterface();
            showDashboardSection('profile'); // Refresh profile page
            showToast('Wallet unlinked successfully.', 'success');
        } else {
            showToast(result.message || 'Failed to unlink wallet', 'error');
        }
    } catch (error) {
        console.error('Wallet unlink error:', error);
        showToast('Failed to unlink wallet', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Load analytics charts
 */
async function loadAnalyticsCharts() {
    // Analytics reflects what the account actually holds: documents RECEIVED
    // through the Issuer Portal (all on-chain => Verified) merged with any
    // legacy Verify-flow records. Exclude already-merged received entries —
    // we re-fetch them here so analytics works even before loadDashboardData.
    let docs = (userDocuments || []).filter(d => !d.__received);
    try {
        const resp = await fetch(`${API_BASE_URL}/received-documents`, { credentials: 'include' });
        if (resp.ok) {
            const received = await resp.json();
            docs = docs.concat(received.map(d => ({
                status: 'Verified',
                docType: d.docType || 'Document',
                documentCID: d.documentCID,
                submittedAt: d.issuedAt,
            })));
        }
    } catch (e) { console.warn('Analytics: received-docs fetch failed', e); }

    // Update the stat tiles from the merged data.
    const verified = docs.filter(d => d.status === 'Verified').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('an-total', docs.length);
    set('an-verified', verified);
    set('an-rate', (docs.length ? Math.round((verified / docs.length) * 100) : 0) + '%');
    set('an-ipfs', docs.filter(d => d.documentCID).length);

    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => createCharts(docs);
        document.head.appendChild(script);
    } else {
        createCharts(docs);
    }
}

/**
 * Create analytics charts
 */
function createCharts(docs) {
    docs = docs || userDocuments || [];
    // Re-render safety: destroy previous instances bound to these canvases.
    if (window.__anCharts) { window.__anCharts.forEach(c => { try { c.destroy(); } catch (e) {} }); }
    window.__anCharts = [];
    
    // Status Distribution Chart
    const statusCtx = document.getElementById('status-chart');
    if (statusCtx) {
        const statusCounts = {
            verified: docs.filter(doc => doc.status === 'Verified').length,
            rejected: docs.filter(doc => doc.status === 'Rejected').length,
            pending: docs.filter(doc => doc.status === 'Pending').length
        };
        
        window.__anCharts.push(new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Verified', 'Rejected', 'Pending'],
                datasets: [{
                    data: [statusCounts.verified, statusCounts.rejected, statusCounts.pending],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }));
    }

    // Document Types Chart
    const typesCtx = document.getElementById('types-chart');
    if (typesCtx) {
        const typeCounts = {};
        docs.forEach(doc => {
            const type = doc.docType || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        window.__anCharts.push(new Chart(typesCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    label: 'Documents',
                    data: Object.values(typeCounts),
                    backgroundColor: '#3b82f6',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        }));
    }
}

/**
 * View document with MetaMask verification
 * @param {string} docId - Document ID
 */
async function viewDocument(docId) {
    console.log('viewDocument called with docId:', docId);
    
    const doc = userDocuments.find(d => d.id === docId);
    if (!doc) {
        console.error('Document not found:', docId);
        showToast('Document not found', 'error');
        return;
    }

    if (doc.status === 'Rejected') {
        showToast('This document has been rejected and cannot be viewed', 'error');
        return;
    }
    
    console.log('Found document:', doc);
    
    try {
        // Check if MetaMask is available
        if (!window.ethereum) {
            showToast('MetaMask is required to view documents', 'error');
            return;
        }
        
        toggleLoading(true);
        
        // Request MetaMask connection
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];
        
        if (!walletAddress) {
            showToast('Please connect your MetaMask wallet', 'error');
            toggleLoading(false);
            return;
        }
        
        console.log('MetaMask connected:', walletAddress);
        
        // Create signature for document access
        const message = `Access document: ${docId}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress]
        });
        
        console.log('Signature created:', signature);
        
        // Request document from backend with MetaMask verification
        const response = await fetch(`${API_BASE_URL}/documents/${docId}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                walletAddress: walletAddress,
                signature: signature
            })
        });
        
        const result = await response.json();
        console.log('Backend response:', result);
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to access document');
        }
        
        if (result.success) {
            // Build a blob URL from the DECRYPTED content so download / open use
            // the real document (IPFS now holds ciphertext, not the plaintext).
            let blobUrl = '';
            try {
                const bytes = Uint8Array.from(atob(result.content), c => c.charCodeAt(0));
                blobUrl = URL.createObjectURL(new Blob([bytes], { type: (result.document && result.document.contentType) || 'application/octet-stream' }));
            } catch (e) { console.warn('Could not build document blob:', e); }
            console.log('Showing document viewer...');
            showDocumentViewer(result.document, result.content, blobUrl);
            showToast('Document accessed successfully', 'success');
        } else {
            throw new Error('Failed to retrieve document');
        }
        
    } catch (error) {
        console.error('Document view error:', error);
        if (error.message.includes('User rejected')) {
            showToast('MetaMask signature was cancelled', 'error');
        } else {
            showToast(error.message || 'Failed to access document', 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Show document viewer modal
 * @param {Object} document - Document metadata
 * @param {string} content - Base64 encoded document content
 * @param {string} downloadUrl - IPFS download URL
 */
function showDocumentViewer(doc, content, downloadUrl) {
    console.log('showDocumentViewer called with:', doc, downloadUrl);
    
    // Remove any existing modal first
    // Note: 'document' here now correctly refers to the global document object
    const existingModal = document.getElementById('document-viewer-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'document-viewer-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden';
    
    // Set modal content HTML
    modalContent.innerHTML = `
        <div class="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
                <h3 class="text-xl font-bold text-slate-900">${doc.name || 'Document'}</h3>
                <p class="text-sm text-slate-600 mt-1">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                        ${doc.verificationStatus || 'Verified'}
                    </span>
                    Uploaded: ${doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : 'N/A'}
                </p>
            </div>
            <button onclick="closeDocumentViewer()" class="text-slate-400 hover:text-slate-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        
        <div class="p-6 border-b border-slate-200 bg-slate-50">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <span class="font-medium text-slate-700">Document Type:</span>
                    <p class="text-slate-900">${doc.docType || 'N/A'}</p>
                </div>
                <div>
                    <span class="font-medium text-slate-700">Document Number:</span>
                    <p class="text-slate-900">${doc.docNumber || 'N/A'}</p>
                </div>
                <div>
                    <span class="font-medium text-slate-700">File Size:</span>
                    <p class="text-slate-900">${doc.size ? formatFileSize(doc.size) : 'N/A'}</p>
                </div>
            </div>
            
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="font-medium text-slate-700">IPFS Hash:</span>
                    <p class="text-slate-900 font-mono text-xs break-all">${doc.ipfsHash || 'N/A'}</p>
                </div>
                <div>
                    <span class="font-medium text-slate-700">Blockchain Tx:</span>
                    <p class="text-slate-900 font-mono text-xs break-all">${doc.transactionHash || 'N/A'}</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 max-h-96 overflow-y-auto">
            <div class="text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h4 class="text-lg font-semibold text-slate-900 mb-2">Document Ready for Download</h4>
                <p class="text-slate-600 mb-6">This document has been verified and is stored securely on IPFS blockchain storage.</p>
                
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                        onclick="downloadDocument('${downloadUrl}', '${doc.name || 'document'}')"
                        class="btn-primary inline-flex items-center px-6 py-3 text-white font-medium rounded-lg transition-colors"
                    >
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Download Document
                    </button>
                    
                    <button 
                        onclick="openInNewTab('${downloadUrl}')"
                        class="inline-flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                    >
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        Open in New Tab
                    </button>
                </div>
            </div>
        </div>
        
        <div class="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <div class="text-sm text-slate-600">
                <span class="inline-flex items-center">
                    <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Verified & Secured by Blockchain
                </span>
            </div>
            <button 
                onclick="closeDocumentViewer()" 
                class="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
                Close
            </button>
        </div>
    `;
    
    // Append content to modal
    modal.appendChild(modalContent);
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    console.log('Modal created and added to DOM');
}

/**
 * Close document viewer modal
 */
function closeDocumentViewer() {
    const modal = document.getElementById('document-viewer-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

/**
 * Download document from IPFS
 * @param {string} downloadUrl - IPFS URL
 * @param {string} filename - Document filename
 */
async function downloadDocument(downloadUrl, filename) {
    try {
        console.log('Downloading document:', downloadUrl, filename);
        showToast('Starting download...', 'info');
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'document';
        link.target = '_blank';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Download started successfully', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download document', 'error');
    }
}

/**
 * Open document in new tab
 * @param {string} url - IPFS URL
 */
function openInNewTab(url) {
    try {
        console.log('Opening in new tab:', url);
        window.open(url, '_blank');
        showToast('Document opened in new tab', 'success');
    } catch (error) {
        console.error('Open in new tab error:', error);
        showToast('Failed to open document', 'error');
    }
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Toggle auto refresh
 */
function toggleAutoRefresh() {
    // Implementation for auto-refresh toggle
    const toggle = document.getElementById('auto-refresh-toggle');
    if (toggle) {
        const isActive = toggle.classList.contains('bg-brand-600');
        if (isActive) {
            toggle.classList.remove('bg-brand-600');
            toggle.classList.add('bg-slate-300');
            toggle.querySelector('span').classList.remove('translate-x-6');
            toggle.querySelector('span').classList.add('translate-x-1');
        } else {
            toggle.classList.add('bg-brand-600');
            toggle.classList.remove('bg-slate-300');
            toggle.querySelector('span').classList.add('translate-x-6');
            toggle.querySelector('span').classList.remove('translate-x-1');
        }
    }
}

// --- EVENT LISTENERS ---

// Test function availability
console.log('Functions available:', {
    viewDocument: typeof viewDocument,
    showDocumentViewer: typeof showDocumentViewer,
    closeDocumentViewer: typeof closeDocumentViewer,
    downloadDocument: typeof downloadDocument,
    openInNewTab: typeof openInNewTab
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Populate country codes
    populateCountryCodes();

    // Check authentication status
    checkAuthStatus();
    
    // Setup form event listeners
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
    }

    const signinMetaMaskBtn = document.getElementById('signin-metamask-btn');
    if (signinMetaMaskBtn) {
        signinMetaMaskBtn.addEventListener('click', handleSigninWallet);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        // Add password strength listener
        const passwordInput = document.getElementById('signup-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => checkPasswordStrength(e.target.value));
        }
    }
    
    // Setup responsive sidebar
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        }
    });
});

// Export functions for global access
window.showPage = showPage;
window.showAuth = showAuth;
window.switchAuthTab = switchAuthTab;
window.toggleSidebar = toggleSidebar;
window.showDashboardSection = showDashboardSection;
window.handleLogout = handleLogout;

// ==========================================
// SHARE DOCUMENT FEATURE
// ==========================================

const IITS = [
    'IIT Kharagpur', 'IIT Bombay', 'IIT Madras', 'IIT Kanpur', 'IIT Delhi', 
    'IIT Guwahati', 'IIT Roorkee', 'IIT Ropar', 'IIT Bhubaneswar', 'IIT Gandhinagar', 
    'IIT Hyderabad', 'IIT Jodhpur', 'IIT Patna', 'IIT Indore', 'IIT Mandi', 
    'IIT (BHU) Varanasi', 'IIT (ISM) Dhanbad', 'IIT Palakkad', 'IIT Tirupati', 
    'IIT Jammu', 'IIT Bhilai', 'IIT Goa', 'IIT Dharwad'
];

const NITS = [
    'NIT Tiruchirappalli (Trichy)', 'NIT Karnataka (Surathkal)', 'NIT Rourkela', 'NIT Warangal', 
    'NIT Calicut', 'NIT Nagpur (VNIT)', 'NIT Silchar', 'NIT Jaipur (MNIT)', 'NIT Durgapur', 
    'NIT Delhi', 'NIT Jamshedpur', 'NIT Kurukshetra', 'NIT Allahabad (MNNIT)', 'NIT Agartala', 
    'NIT Raipur', 'NIT Bhopal (MANIT)', 'NIT Srinagar', 'NIT Jalandhar (Dr. B.R. Ambedkar)', 
    'NIT Patna', 'NIT Goa', 'NIT Puducherry', 'NIT Uttarakhand', 'NIT Mizoram', 'NIT Meghalaya', 
    'NIT Manipur', 'NIT Nagaland', 'NIT Arunachal Pradesh', 'NIT Sikkim', 'NIT Andhra Pradesh', 
    'NIT Hamirpur', 'IIEST Shibpur'
];

const IIITS = [
    'IIIT Allahabad', 'IIIT Gwalior (ABV-IIITM)', 'IIIT Jabalpur (IIITDM)', 'IIIT Kancheepuram (IIITDM)', 
    'IIIT Hyderabad', 'IIIT Bangalore', 'IIIT Guwahati', 'IIIT Vadodara', 'IIIT Kota', 
    'IIIT Tiruchirappalli', 'IIIT Una', 'IIIT Sonepat', 'IIIT Kalyani', 'IIIT Lucknow', 
    'IIIT Dharwad', 'IIIT Kurnool (IIITDM)', 'IIIT Kottayam', 'IIIT Manipur', 'IIIT Nagpur', 
    'IIIT Pune', 'IIIT Ranchi', 'IIIT Surat', 'IIIT Bhopal', 'IIIT Bhagalpur', 'IIIT Agartala', 
    'IIIT Raichur'
];

function getShareDocumentHTML() {
    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        📤 Share Document
                    </h1>
                    <p class="text-slate-600 mt-1">
                        Temporarily share your verified documents with institutes (48-hour access)
                    </p>
                </div>
            </div>

            <!-- Active Shares Section -->
            <div id="active-shares-container" class="space-y-4 hidden">
                <h3 class="text-lg font-semibold text-slate-800">Active Shares</h3>
                <div id="active-shares-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </div>

            <!-- Categories Tabs -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="flex border-b border-slate-100">
                    <button onclick="switchShareTab('iits')" id="tab-iits" class="flex-1 px-6 py-4 text-sm font-medium text-brand-600 border-b-2 border-brand-600 bg-brand-50 transition-colors">
                        IITs
                    </button>
                    <button onclick="switchShareTab('nits')" id="tab-nits" class="flex-1 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        NITs
                    </button>
                    <button onclick="switchShareTab('iiits')" id="tab-iiits" class="flex-1 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        IIITs
                    </button>
                </div>
                
                <div class="p-6">
                    <div id="list-iits" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                    <div id="list-nits" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                    <div id="list-iiits" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                </div>
            </div>
        </div>

        <!-- Share Modal -->
        <div id="share-modal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                <h3 class="text-xl font-bold text-slate-800 mb-4">Grant Access</h3>
                <p class="text-slate-600 mb-6">Select a document to share with <span id="modal-institute-name" class="font-semibold text-brand-600"></span>.</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Select Document</label>
                        <select id="share-doc-select" class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                            <option value="">-- Choose a document --</option>
                        </select>
                    </div>

                    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <div class="text-amber-500">⚠️</div>
                        <p class="text-xs text-amber-700">
                            Access will be valid for <strong>48 hours</strong> only. You will need to sign a transaction to confirm.
                        </p>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button onclick="closeShareModal()" class="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                            Cancel
                        </button>
                        <button onclick="confirmShare()" class="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-lg shadow-brand-500/20 transition-all transform hover:-translate-y-0.5">
                            Give Access
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupShareDocument() {
    renderShareSections();
    updateTimers();
    setInterval(updateTimers, 1000);
    
    // Switch to first tab by default
    switchShareTab('iits'); 
}

function renderShareSections() {
    const createCard = (name) => `
        <div class="p-4 rounded-xl border border-slate-200 hover:border-brand-200 hover:shadow-md transition-all bg-white group">
            <div class="flex items-start justify-between mb-3">
                <div class="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                    🏛️
                </div>
                <button onclick="handleGiveAccess('${name}')" class="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors">
                    Give Access
                </button>
            </div>
            <h4 class="font-medium text-slate-800 text-sm">${name}</h4>
        </div>
    `;

    document.getElementById('list-iits').innerHTML = IITS.map(createCard).join('');
    document.getElementById('list-nits').innerHTML = NITS.map(createCard).join('');
    document.getElementById('list-iiits').innerHTML = IIITS.map(createCard).join('');
}

function switchShareTab(tabId) {
    // Buttons
    ['iits', 'nits', 'iiits'].forEach(id => {
        const btn = document.getElementById(`tab-${id}`);
        const list = document.getElementById(`list-${id}`);
        
        if (id === tabId) {
            btn.classList.add('text-brand-600', 'border-b-2', 'border-brand-600', 'bg-brand-50');
            btn.classList.remove('text-slate-500');
            list.classList.remove('hidden');
        } else {
            btn.classList.remove('text-brand-600', 'border-b-2', 'border-brand-600', 'bg-brand-50');
            btn.classList.add('text-slate-500');
            list.classList.add('hidden');
        }
    });
}

function handleGiveAccess(instituteName) {
    const modal = document.getElementById('share-modal');
    const nameSpan = document.getElementById('modal-institute-name');
    const select = document.getElementById('share-doc-select');

    nameSpan.textContent = instituteName;
    modal.dataset.institute = instituteName; // Store for confirm
    
    // Populate docs
    select.innerHTML = '<option value="">-- Choose a document --</option>';
    userDocuments.forEach(doc => {
        if (doc.status === 'Verified') {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.name;
            select.appendChild(opt);
        }
    });

    modal.classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

async function confirmShare() {
    const modal = document.getElementById('share-modal');
    const instituteName = modal.dataset.institute;
    const docId = document.getElementById('share-doc-select').value;
    
    if (!docId) {
        showToast('Please select a document', 'error');
        return;
    }

    if (!window.ethereum) {
        showToast('MetaMask is required', 'error');
        return;
    }

    closeShareModal();
    toggleLoading(true);

    try {
        // Simulate Transaction
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const from = accounts[0];
        
        // Mock sign just for effect (or use personal_sign)
        // We'll just assume success if we got accounts for this demo to be faster
        // Or we can do a dummy signature to look real
        
        // Creating a dummy transaction hash
        const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
        // Save to local storage
        const shares = JSON.parse(localStorage.getItem('share_active_shares') || '[]');
        const doc = userDocuments.find(d => d.id === docId);
        
        shares.push({
            institute: instituteName,
            docName: doc.name,
            docHash: doc.documentCID,
            expiry: Date.now() + (48 * 60 * 60 * 1000), // 48 hours
            txHash: mockTxHash
        });
        
        localStorage.setItem('share_active_shares', JSON.stringify(shares));
        
        // Show success screen (Overlay)
        showAccessGranted(instituteName, doc.name, mockTxHash);
        
        // Update UI
        updateTimers();
        
    } catch (error) {
        console.error(error);
        showToast('Transaction rejected', 'error');
    } finally {
        toggleLoading(false);
    }
}

function showAccessGranted(institute, docName, txHash) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 animate-fade-in';
    overlay.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
            
            <div class="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-bounce-soft">
                ✅
            </div>
            
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Access Granted!</h2>
            <p class="text-slate-600 mb-8">
                You have successfully shared <strong>${docName}</strong> with <strong>${institute}</strong>.
            </p>
            
            <div class="bg-slate-50 rounded-xl p-4 text-left space-y-3 mb-8 border border-slate-100">
                <div class="flex justify-between">
                    <span class="text-xs text-slate-500 uppercase tracking-wider">Validity</span>
                    <span class="text-sm font-semibold text-brand-600">48 Hours</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-xs text-slate-500 uppercase tracking-wider">Transaction ID</span>
                    <span class="text-xs font-mono text-slate-700" title="${txHash}">${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}</span>
                </div>
            </div>

            <button onclick="this.parentElement.parentElement.remove()" class="w-full bg-slate-900 text-white rounded-xl py-4 font-semibold hover:bg-slate-800 transition-all">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function updateTimers() {
    const list = document.getElementById('active-shares-list');
    const container = document.getElementById('active-shares-container');
    if (!list) return;

    let shares = JSON.parse(localStorage.getItem('share_active_shares') || '[]');
    const now = Date.now();
    
    // Filter expired
    const validShares = shares.filter(s => s.expiry > now);
    
    if (validShares.length !== shares.length) {
        localStorage.setItem('share_active_shares', JSON.stringify(validShares));
        shares = validShares; // Update ref
    }
    
    if (shares.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    list.innerHTML = shares.map(share => {
        const diff = share.expiry - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        return `
            <div class="bg-brand-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg shadow-brand-900/20">
                <div>
                    <div class="text-xs text-brand-300 mb-1">Shared with</div>
                    <div class="font-semibold">${share.institute}</div>
                    <div class="text-xs text-brand-200 mt-1">${share.docName}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-brand-300 mb-1">Expires in</div>
                    <div class="text-xl font-mono font-bold tracking-widest text-emerald-400">
                        ${timeString}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
window.handleGiveAccess = handleGiveAccess;
window.closeShareModal = closeShareModal;
window.confirmShare = confirmShare;
window.switchShareTab = switchShareTab;

// ==================================================================== //
// ====================== ISSUER PORTAL =============================== //
// ==================================================================== //
//
// A second, fully wallet-based portal. Issuers connect MetaMask, publish
// original documents on-chain (paying their own gas via the Remix-deployed
// DocVerifyRegistry contract), and only the issuer + receiver wallets can
// open a published document.

// Session state for the connected issuer/receiver wallet.
let issuerState = {
    wallet: null,       // checksummed-ish address from MetaMask
    signature: null,    // login signature, reused to authenticate API calls
    message: null,      // the message that was signed at login
};

let issuerCurrentSection = 'publish';
let issuerDocsCache = [];

/** Shorten an address for display: 0x1234...abcd */
function shortAddr(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Inline SVG icons (Heroicons-style) used across the Issuer Portal UI. */
const ISSUER_ICONS = {
    copy: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`,
    external: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
    eye: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`,
    shieldCheck: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
    inbox: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>`,
};

/** Build an Etherscan link for a tx hash on the configured chain. */
function issuerTxUrl(txHash) {
    const base = (window.DOCV_CONTRACT?.CHAIN_CONFIG?.blockExplorerUrls?.[0]) || 'https://sepolia.etherscan.io';
    return `${base}/tx/${txHash}`;
}

/**
 * Copy text to the clipboard and give brief visual confirmation on the button.
 * Works for the wallet badge (swaps the copy icon to a check) and inline copy
 * buttons (which carry a data-copy-label).
 */
async function copyToClipboard(text, btn) {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
            setTimeout(() => { btn.innerHTML = original; }, 1200);
        }
    } catch (err) {
        console.error('Clipboard error:', err);
        showToast('Could not copy', 'error');
    }
}

// ponytail: legacy DOCVENC1 client-side crypto deleted — dead since the server
// vault took over encryption; those docs must be re-published anyway.

/** Lightweight passphrase prompt modal. Resolves to the entered string, or null. */
function promptPassphrase(title = 'Enter passphrase') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4';
        overlay.innerHTML = `
            <div class="luxe-card w-full max-w-sm rounded-2xl p-6 animate-fade-in" role="dialog" aria-modal="true">
                <div class="flex items-center gap-2 mb-4">
                    <span class="h-9 w-9 rounded-xl bg-gold-400/10 text-gold-300 border border-gold-400/20 flex items-center justify-center">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </span>
                    <h3 class="text-lg font-bold text-white">${title}</h3>
                </div>
                <p class="text-sm text-emerald-100/55 mb-4">This document is encrypted. Enter the passphrase shared by the issuer to open it.</p>
                <input type="password" id="dv-pass-input" placeholder="Passphrase" autocomplete="off"
                    class="w-full px-4 py-3 rounded-xl luxe-input outline-none mb-4" />
                <div class="flex gap-2 justify-end">
                    <button id="dv-pass-cancel" class="px-4 py-2 text-sm font-medium text-emerald-100/60 hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                    <button id="dv-pass-ok" class="btn-gold px-4 py-2 text-sm font-semibold rounded-lg">Decrypt &amp; Open</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#dv-pass-input');
        input.focus();
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#dv-pass-cancel').onclick = () => close(null);
        overlay.querySelector('#dv-pass-ok').onclick = () => close(input.value || null);
        input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value || null); if (e.key === 'Escape') close(null); };
        overlay.onclick = (e) => { if (e.target === overlay) close(null); };
    });
}

/** A label/value row with a middle-truncated value and a copy button. */
function issuerKvRow(label, value, copyable = false) {
    const safe = String(value);
    const display = safe.length > 24 ? `${safe.slice(0, 10)}…${safe.slice(-8)}` : safe;
    return `
        <div class="flex items-center justify-between gap-3">
            <dt class="text-emerald-100/50 shrink-0">${label}</dt>
            <dd class="flex items-center gap-1.5 font-mono text-emerald-50/85 min-w-0">
                <span class="truncate" title="${safe}">${display}</span>
                ${copyable ? `<button type="button" onclick="copyToClipboard('${safe}', this)" class="shrink-0 text-emerald-100/40 hover:text-gold-300 transition-colors" title="Copy ${label}" aria-label="Copy ${label}">${ISSUER_ICONS.copy}</button>` : ''}
            </dd>
        </div>`;
}

/** Entry point from the landing page. */
function showIssuerPortal() {
    if (typeof window.ethereum === 'undefined') {
        showToast('MetaMask is required for the Issuer Portal. Please install the MetaMask extension.', 'error');
        return;
    }
    // If already logged in this session, jump straight to the dashboard.
    if (issuerState.wallet) {
        showPage('issuerDashboard');
        showIssuerSection('publish');
    } else {
        const err = document.getElementById('issuer-auth-error');
        if (err) err.classList.add('hidden');
        showPage('issuerAuthPage');
    }
}

function showIssuerAuthError(msg) {
    const err = document.getElementById('issuer-auth-error');
    if (err) {
        err.textContent = msg;
        err.classList.remove('hidden');
    }
    showToast(msg, 'error');
}

/** Ensure MetaMask is on the Sepolia network, switching/adding if needed. */
async function ensureSepoliaNetwork() {
    const { CHAIN_CONFIG } = window.DOCV_CONTRACT;
    const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChain === CHAIN_CONFIG.chainIdHex) return true;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainIdHex }],
        });
        return true;
    } catch (switchError) {
        // 4902 = chain not added to MetaMask yet
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: CHAIN_CONFIG.chainIdHex,
                    chainName: CHAIN_CONFIG.chainName,
                    rpcUrls: CHAIN_CONFIG.rpcUrls,
                    nativeCurrency: CHAIN_CONFIG.nativeCurrency,
                    blockExplorerUrls: CHAIN_CONFIG.blockExplorerUrls,
                }],
            });
            return true;
        }
        throw switchError;
    }
}

/** Connect MetaMask + sign a login message to enter the issuer dashboard. */
async function issuerConnectAndLogin() {
    if (typeof window.ethereum === 'undefined') {
        showIssuerAuthError('MetaMask is required. Please install the MetaMask extension.');
        return;
    }

    try {
        toggleLoading(true);

        await ensureSepoliaNetwork();

        // Force MetaMask's account picker so the issuer chooses which account to
        // sign in with (otherwise it silently uses the active account).
        try {
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            });
        } catch (permErr) {
            console.warn('Account picker not shown:', permErr.message);
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const wallet = accounts[0];

        // NOTE: keep this single-line (no \n). The message is later sent as a
        // multipart/form-data field during upload, and browsers normalise line
        // breaks in form fields to \r\n — which would change the signed bytes
        // and break signature recovery on the server.
        const message = `DocVerify Issuer Portal | Wallet: ${wallet} | Signed at: ${new Date().toISOString()}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, wallet],
        });

        issuerState = { wallet, signature, message };

        // Update header label
        const label = document.getElementById('issuer-wallet-label');
        if (label) label.textContent = shortAddr(wallet);

        showPage('issuerDashboard');
        showIssuerSection('publish');
        showToast(`Connected as ${shortAddr(wallet)}`, 'success');

        // React to account/network changes while signed in.
        if (!window.__issuerListenersAttached) {
            window.ethereum.on('accountsChanged', () => {
                if (issuerState.wallet) {
                    showToast('Wallet account changed. Please sign in again.', 'info');
                    issuerLogout();
                }
            });
            window.ethereum.on('chainChanged', () => {
                if (issuerState.wallet) {
                    showToast('Network changed. Please sign in again.', 'info');
                    issuerLogout();
                }
            });
            window.__issuerListenersAttached = true;
        }
    } catch (error) {
        console.error('Issuer login error:', error);
        if (error.code === 4001 || (error.message && error.message.includes('User rejected'))) {
            showIssuerAuthError('Connection/signature was cancelled in MetaMask.');
        } else {
            showIssuerAuthError(error.message || 'Failed to connect MetaMask.');
        }
    } finally {
        toggleLoading(false);
    }
}

function issuerLogout() {
    issuerState = { wallet: null, signature: null, message: null };
    showPage('guestPage');
}

/** Auth fields sent with every protected issuer API call. */
function issuerAuthPayload() {
    return {
        walletAddress: issuerState.wallet,
        signature: issuerState.signature,
        message: issuerState.message,
    };
}

function showIssuerSection(section) {
    issuerCurrentSection = section;

    document.querySelectorAll('.issuer-tab').forEach(btn => {
        btn.classList.remove('border-gold-400', 'text-gold-200');
        btn.classList.add('border-transparent', 'text-emerald-100/55');
    });
    const activeTab = document.getElementById(`issuer-tab-${section}`);
    if (activeTab) {
        activeTab.classList.add('border-gold-400', 'text-gold-200');
        activeTab.classList.remove('border-transparent', 'text-emerald-100/55');
    }

    if (section === 'publish') {
        renderIssuerPublish();
    } else if (section === 'documents') {
        renderIssuerDocuments();
        loadIssuerDocuments();
    }
}

function renderIssuerPublish() {
    const contractSet = !!(window.DOCV_CONTRACT && window.DOCV_CONTRACT.CONTRACT_ADDRESS);
    const content = document.getElementById('issuer-content');
    const inputCls = "w-full px-4 py-3 rounded-xl luxe-input text-sm outline-none";
    const labelCls = "block text-[11px] font-semibold text-emerald-100/60 uppercase tracking-[0.15em] mb-2";
    content.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">
            ${!contractSet ? `
            <div class="flex gap-3 bg-amber-400/10 border border-amber-400/25 rounded-xl p-4 text-sm text-amber-200">
                <svg class="w-5 h-5 shrink-0 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"></path></svg>
                <div>
                    <p class="font-semibold mb-1 text-amber-100">Contract address not configured</p>
                    <p>Deploy <code class="bg-amber-400/15 px-1 rounded">DocVerifyRegistry.sol</code> in Remix and paste its address into
                    <code class="bg-amber-400/15 px-1 rounded">frontend/contract.js</code>. Publishing is disabled until then.</p>
                </div>
            </div>` : ''}

            <div class="luxe-card rounded-3xl overflow-hidden">
                <div class="px-6 sm:px-8 py-7 border-b border-white/10 relative">
                    <span class="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold-300 to-gold-600"></span>
                    <h3 class="text-xl sm:text-2xl font-display font-bold text-white">Publish an <span class="gold-text">Original Document</span></h3>
                    <p class="text-emerald-100/55 mt-1.5 text-sm">
                        The fingerprint is recorded on-chain and bound to your wallet (sender)
                        and the receiver. You'll confirm the transaction in MetaMask and pay the gas.
                    </p>
                </div>

                <form id="issuer-publish-form" class="p-6 sm:p-8 space-y-5" novalidate>
                    <div>
                        <label for="iss-receiver" class="${labelCls}">Receiver Wallet Address <span class="text-gold-300">*</span></label>
                        <input id="iss-receiver" type="text" name="receiverWallet" placeholder="0x…" required autocomplete="off"
                            class="${inputCls} font-mono" />
                        <p class="text-xs text-emerald-100/40 mt-1.5 ml-1">Only this wallet (and yours) will be able to open the document.</p>
                    </div>

                    <div>
                        <label for="iss-receiver-email" class="${labelCls}">Recipient Email <span class="text-emerald-100/30 normal-case tracking-normal">(so it appears in their User Portal)</span></label>
                        <input id="iss-receiver-email" type="email" name="receiverEmail" placeholder="recipient@example.com" autocomplete="off"
                            class="${inputCls}" />
                        <p class="text-xs text-emerald-100/40 mt-1.5 ml-1">The recipient will see this document under "Received" when they log into the User Portal with this email. They're also notified by email.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="iss-doctype" class="${labelCls}">Document Type <span class="text-gold-300">*</span></label>
                            <input id="iss-doctype" type="text" name="docType" placeholder="e.g. Degree Certificate" required class="${inputCls}" />
                        </div>
                        <div>
                            <label for="iss-docnum" class="${labelCls}">Document Number <span class="text-gold-300">*</span></label>
                            <input id="iss-docnum" type="text" name="docNumber" placeholder="e.g. EC-2026-001" required class="${inputCls}" />
                        </div>
                    </div>

                    <div>
                        <label class="${labelCls}">Document File <span class="text-gold-300">*</span></label>
                        <label for="iss-file" class="group flex flex-col items-center justify-center gap-2 px-4 py-8 luxe-card-soft rounded-xl border-dashed cursor-pointer hover:border-gold-400/50 transition-colors text-center">
                            <svg class="w-8 h-8 text-emerald-100/30 group-hover:text-gold-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 13l3-3m0 0l3 3m-3-3v9"></path></svg>
                            <span id="iss-file-label" class="text-sm text-emerald-100/50"><span class="font-semibold text-gold-300">Click to choose a file</span> or drag it here</span>
                            <input id="iss-file" type="file" name="document" required class="sr-only" />
                        </label>
                    </div>

                    <!-- Encryption (end-to-end) -->
                    <div class="rounded-xl luxe-card-soft p-4">
                        <div class="flex items-center gap-1.5 text-sm font-semibold text-white">
                            <svg class="w-4 h-4 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Always encrypted (AES-256)
                        </div>
                        <p class="text-xs text-emerald-100/45 mt-0.5 mb-3">Every document is encrypted with the server master key before it touches IPFS — storage only ever holds ciphertext.</p>
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input id="iss-encrypt-toggle" type="checkbox"
                                class="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-gold-500 focus:ring-gold-400" />
                            <span>
                                <span class="text-sm font-semibold text-white">Add a passphrase <span class="text-gold-300">(optional)</span></span>
                                <span class="block text-xs text-emerald-100/45 mt-0.5">Require the receiver to enter a passphrase (shared out-of-band) to open it. Leave unchecked to let them open it on our site without one.</span>
                            </span>
                        </label>
                        <div id="iss-passphrase-fields" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4" style="display:none">
                            <div>
                                <label for="iss-passphrase" class="${labelCls}">Passphrase</label>
                                <input id="iss-passphrase" type="password" name="passphrase" autocomplete="new-password" placeholder="Choose a strong passphrase" class="${inputCls}" />
                            </div>
                            <div>
                                <label for="iss-passphrase2" class="${labelCls}">Confirm passphrase</label>
                                <input id="iss-passphrase2" type="password" autocomplete="new-password" placeholder="Repeat passphrase" class="${inputCls}" />
                            </div>
                            <p class="sm:col-span-2 text-xs text-amber-300/80">⚠ If you lose this passphrase, the document cannot be recovered.</p>
                        </div>
                    </div>

                    <button type="submit" ${contractSet ? '' : 'disabled'}
                        class="btn-gold w-full inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed font-bold py-3.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/40">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Publish On-Chain
                    </button>
                </form>

                <div id="issuer-publish-result" class="hidden px-6 sm:px-8 pb-8"></div>
            </div>
        </div>
    `;

    const form = document.getElementById('issuer-publish-form');
    if (form) form.addEventListener('submit', handleIssuerPublish);

    // Reflect the chosen file name in the drop-zone label.
    const fileInput = document.getElementById('iss-file');
    const fileLabel = document.getElementById('iss-file-label');
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length) {
                fileLabel.innerHTML = `<span class="font-semibold text-gold-200">${fileInput.files[0].name}</span>`;
            } else {
                fileLabel.innerHTML = `<span class="font-semibold text-gold-300">Click to choose a file</span> or drag it here`;
            }
        });
    }

    // Toggle the passphrase fields with the "Encrypt file" checkbox.
    const encToggle = document.getElementById('iss-encrypt-toggle');
    const passFields = document.getElementById('iss-passphrase-fields');
    if (encToggle && passFields) {
        encToggle.addEventListener('change', () => {
            passFields.style.display = encToggle.checked ? '' : 'none';
        });
    }
}

async function handleIssuerPublish(e) {
    e.preventDefault();

    const { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG } = window.DOCV_CONTRACT;
    if (!CONTRACT_ADDRESS) {
        showToast('Contract address not configured in contract.js', 'error');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    const receiverWallet = (formData.get('receiverWallet') || '').trim();
    const receiverEmail = (formData.get('receiverEmail') || '').trim();
    const docType = formData.get('docType');
    const docNumber = formData.get('docNumber');
    const file = formData.get('document');

    if (!window.ethers || !window.ethers.utils.isAddress(receiverWallet)) {
        showToast('Please enter a valid receiver wallet address.', 'error');
        return;
    }
    if (receiverWallet.toLowerCase() === issuerState.wallet.toLowerCase()) {
        showToast('Receiver wallet must be different from your own wallet.', 'error');
        return;
    }
    if (!file || !file.size) {
        showToast('Please choose a document file.', 'error');
        return;
    }

    // The document is ALWAYS encrypted before storage. Ticking the box adds an
    // extra passphrase that only the receiver knows (optional).
    const usePassphrase = document.getElementById('iss-encrypt-toggle')?.checked;
    const passphrase = document.getElementById('iss-passphrase')?.value || '';
    const passphrase2 = document.getElementById('iss-passphrase2')?.value || '';
    if (usePassphrase) {
        if (passphrase.length < 6) {
            showToast('Passphrase must be at least 6 characters (or leave it unchecked).', 'error');
            return;
        }
        if (passphrase !== passphrase2) {
            showToast('Passphrases do not match.', 'error');
            return;
        }
    }

    const resultDiv = document.getElementById('issuer-publish-result');

    try {
        toggleLoading(true);
        await ensureSepoliaNetwork();

        // --- 1. Upload the PLAINTEXT file to the backend over HTTPS. The server
        //     ALWAYS encrypts it (master key, plus your passphrase if set) before
        //     pinning to IPFS, so storage only ever holds ciphertext. ---
        const uploadData = new FormData();
        uploadData.append('document', file);
        if (usePassphrase) uploadData.append('passphrase', passphrase);
        uploadData.append('walletAddress', issuerState.wallet);
        uploadData.append('signature', issuerState.signature);
        uploadData.append('message', issuerState.message);

        const uploadResp = await fetch(`${API_BASE_URL}/issuer/upload`, {
            method: 'POST',
            body: uploadData,
        });
        const uploadJson = await uploadResp.json();
        if (!uploadResp.ok) {
            throw new Error(uploadJson.message || 'IPFS upload failed.');
        }
        const { docId, documentCID, fileHash, sha256, pHash, watermarked, encrypted, passphraseProtected, mimeType, fileName } = uploadJson;

        // --- 2. Publish on-chain via the issuer's MetaMask (issuer pays gas) ---
        const provider = new window.ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        showToast('Confirm the transaction in MetaMask…', 'info');
        const tx = await contract.issueDocument(
            docId, fileHash, receiverWallet, documentCID, docType, docNumber
        );

        showToast('Publishing on-chain… waiting for confirmation.', 'info');
        const receipt = await tx.wait();
        const transactionHash = receipt.transactionHash;

        // --- 3. Mirror the record in the backend for listing/metadata ---
        const recordResp = await fetch(`${API_BASE_URL}/issuer/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                docId, fileHash, documentCID, receiverWallet, receiverEmail,
                docType, docNumber, transactionHash, encrypted, passphraseProtected,
                sha256, pHash, watermarked, mimeType, fileName,
                ...issuerAuthPayload(),
            }),
        });
        const recordJson = await recordResp.json();
        if (!recordResp.ok) {
            throw new Error(recordJson.message || 'Failed to record the published document.');
        }

        const explorer = issuerTxUrl(transactionHash);
        resultDiv.className = 'px-6 sm:px-8 pb-8';
        resultDiv.innerHTML = `
            <div class="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-5 animate-fade-in">
                <div class="flex items-center gap-2 mb-3">
                    <span class="h-7 w-7 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </span>
                    <p class="font-semibold text-emerald-200">Document published on-chain!</p>
                </div>
                <dl class="text-sm space-y-2 text-emerald-50/80">
                    ${issuerKvRow('Receiver', receiverWallet, true)}
                    ${issuerKvRow('File hash', fileHash, true)}
                    ${issuerKvRow('IPFS CID', documentCID, true)}
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-emerald-100/50">Transaction</dt>
                        <dd>
                            <a href="${explorer}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-gold-300 hover:text-gold-200 font-medium">
                                ${shortAddr(transactionHash)} ${ISSUER_ICONS.external}
                            </a>
                        </dd>
                    </div>
                </dl>
            </div>
        `;
        resultDiv.classList.remove('hidden');
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        form.reset();
        showToast('Document published successfully!', 'success');
        issuerDocsCache = []; // force refresh next time
    } catch (error) {
        console.error('Issuer publish error:', error);
        let msg = error.message || 'Failed to publish document.';
        if (error.code === 4001) msg = 'Transaction was rejected in MetaMask.';
        showToast(msg, 'error');
    } finally {
        toggleLoading(false);
    }
}

let issuerDocFilter = 'all';

function renderIssuerDocuments() {
    const content = document.getElementById('issuer-content');
    content.innerHTML = `
        <div class="max-w-4xl mx-auto animate-fade-in">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h3 class="text-xl sm:text-2xl font-display font-bold text-white">My <span class="gold-text">Documents</span></h3>
                    <p class="text-emerald-100/55 text-sm">Issued or received as <span class="font-mono text-gold-200/90">${shortAddr(issuerState.wallet)}</span></p>
                </div>
                <button onclick="loadIssuerDocuments()" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gold-200 bg-gold-400/10 border border-gold-400/25 hover:bg-gold-400/20 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Refresh
                </button>
            </div>

            <div id="issuer-docs-filters" class="hidden flex-wrap gap-2 mb-5"></div>

            <div id="issuer-docs-list">
                ${issuerDocsSkeleton()}
            </div>
        </div>
    `;
}

/** Skeleton placeholders shown while documents load. */
function issuerDocsSkeleton() {
    const card = `
        <div class="luxe-card rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between gap-4">
                <div class="space-y-2 w-full">
                    <div class="h-4 luxe-shimmer rounded w-1/2"></div>
                    <div class="h-3 luxe-shimmer rounded w-1/3"></div>
                    <div class="h-3 luxe-shimmer rounded w-1/4"></div>
                </div>
                <div class="h-9 w-28 luxe-shimmer rounded-xl shrink-0"></div>
            </div>
        </div>`;
    return card + card;
}

async function loadIssuerDocuments() {
    const list = document.getElementById('issuer-docs-list');
    if (!list) return;
    list.innerHTML = issuerDocsSkeleton();

    try {
        const resp = await fetch(`${API_BASE_URL}/issuer/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issuerAuthPayload()),
        });
        const docs = await resp.json();
        if (!resp.ok) {
            throw new Error(docs.message || 'Failed to load documents.');
        }
        issuerDocsCache = docs;
        renderIssuerDocFilters();
        renderIssuerDocsList();
    } catch (error) {
        console.error('Load issuer documents error:', error);
        // Fallback: read directly from the on-chain contract so the portal still
        // works even if the backend/Mongo mirror is unavailable.
        const recovered = await loadIssuerDocumentsFromChain();
        if (recovered) {
            showToast('Loaded from blockchain (server unavailable).', 'info');
            return;
        }
        list.innerHTML = `
            <div class="rounded-xl border border-red-400/25 bg-red-500/10 p-5 text-center">
                <p class="text-red-200 text-sm mb-3">${error.message}</p>
                <button onclick="loadIssuerDocuments()" class="px-4 py-2 text-sm font-medium text-red-100 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors">Retry</button>
            </div>`;
    }
}

/**
 * Source-of-truth fallback: read the connected wallet's issued + received docs
 * straight from the DocVerifyRegistry contract. Returns true on success.
 * (No transactionHash is stored on-chain, so tx links are omitted here.)
 */
async function loadIssuerDocumentsFromChain() {
    const { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG } = window.DOCV_CONTRACT || {};
    if (!CONTRACT_ADDRESS || !window.ethers) return false;

    try {
        const provider = new window.ethers.providers.JsonRpcProvider(CHAIN_CONFIG.rpcUrls[0]);
        const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const wallet = issuerState.wallet;

        const [issuedIds, receivedIds] = await Promise.all([
            contract.getIssuedDocs(wallet),
            contract.getReceivedDocs(wallet),
        ]);

        const build = async (docId, role) => {
            const d = await contract.getDocument(docId);
            return {
                docId,
                fileHash: d.fileHash,
                issuerWallet: d.issuer,
                receiverWallet: d.receiver,
                documentCID: d.ipfsCID,
                docType: d.docType,
                docNumber: d.docNumber,
                transactionHash: null,
                issuedAt: new Date(Number(d.issuedAt) * 1000).toISOString(),
                role,
            };
        };

        const docs = await Promise.all([
            ...issuedIds.map(id => build(id, 'issued')),
            ...receivedIds.map(id => build(id, 'received')),
        ]);
        docs.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

        issuerDocsCache = docs;
        renderIssuerDocFilters();
        renderIssuerDocsList();
        return true;
    } catch (err) {
        console.error('Chain fallback failed:', err);
        return false;
    }
}

/** Filter chips: All / Issued / Received with live counts. */
function renderIssuerDocFilters() {
    const bar = document.getElementById('issuer-docs-filters');
    if (!bar) return;
    const total = issuerDocsCache.length;
    const issued = issuerDocsCache.filter(d => d.role === 'issued').length;
    const received = total - issued;
    if (!total) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    const chip = (key, label, count) => {
        const active = issuerDocFilter === key;
        return `<button onclick="setIssuerDocFilter('${key}')"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40 ${active ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-[#1a1205] shadow-[0_8px_20px_-8px_rgba(245,158,11,0.6)]' : 'bg-white/5 text-emerald-100/70 border border-white/10 hover:bg-white/10'}">
            ${label}<span class="${active ? 'text-[#1a1205]/70' : 'text-emerald-100/40'}">${count}</span>
        </button>`;
    };
    bar.innerHTML = chip('all', 'All', total) + chip('issued', 'Issued', issued) + chip('received', 'Received', received);
}

function setIssuerDocFilter(filter) {
    issuerDocFilter = filter;
    renderIssuerDocFilters();
    renderIssuerDocsList();
}

function renderIssuerDocsList() {
    const list = document.getElementById('issuer-docs-list');
    if (!list) return;

    const docs = issuerDocsCache.filter(d =>
        issuerDocFilter === 'all' ? true : d.role === issuerDocFilter);

    if (!issuerDocsCache.length) {
        list.innerHTML = `
            <div class="luxe-card rounded-2xl p-12 text-center">
                <div class="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/5 text-emerald-100/30 flex items-center justify-center">
                    ${ISSUER_ICONS.inbox}
                </div>
                <h4 class="font-semibold text-white">No documents yet</h4>
                <p class="text-emerald-100/50 text-sm mt-1 mb-4">Publish your first document to see it here.</p>
                <button onclick="showIssuerSection('publish')" class="btn-gold inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Publish a Document
                </button>
            </div>`;
        return;
    }

    if (!docs.length) {
        list.innerHTML = `<div class="luxe-card rounded-2xl p-10 text-center text-emerald-100/50 text-sm">No ${issuerDocFilter} documents.</div>`;
        return;
    }

    list.innerHTML = docs.map(doc => {
        const isIssued = doc.role === 'issued';
        const counterpartyLabel = isIssued ? 'To' : 'From';
        const counterparty = isIssued ? doc.receiverWallet : doc.issuerWallet;
        const badge = isIssued
            ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-400/15 text-sky-300 border border-sky-400/20"><span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>Issued</span>'
            : '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Received</span>';
        const date = doc.issuedAt ? new Date(doc.issuedAt).toLocaleString() : '';
        const txLink = doc.transactionHash
            ? `<a href="${issuerTxUrl(doc.transactionHash)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-emerald-100/45 hover:text-gold-300 transition-colors">View tx ${ISSUER_ICONS.external}</a>`
            : '';
        return `
            <div class="luxe-card luxe-hover rounded-2xl p-5 mb-4">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div class="min-w-0 space-y-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="font-semibold text-white truncate">${doc.docType || 'Document'}${doc.docNumber ? ` — ${doc.docNumber}` : ''}</h4>
                            ${badge}
                            ${doc.encrypted ? `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gold-400/10 text-gold-200 border border-gold-400/20" title="End-to-end encrypted"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>Encrypted</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs text-emerald-100/55">
                            <span>${counterpartyLabel}</span>
                            <span class="font-mono text-emerald-50/80">${shortAddr(counterparty)}</span>
                            <button type="button" onclick="copyToClipboard('${counterparty}', this)" class="text-emerald-100/40 hover:text-gold-300 transition-colors" title="Copy address" aria-label="Copy address">${ISSUER_ICONS.copy}</button>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-emerald-100/35">
                            <span>${date}</span>
                            ${txLink}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="verifyIssuerDocument('${doc.docId}')"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-emerald-100/80 border border-white/10 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40"
                            title="Verify this record against the blockchain">
                            ${ISSUER_ICONS.shieldCheck}
                            <span class="hidden sm:inline">Verify</span>
                        </button>
                        <button onclick="openShareModal('${doc.docId}', 'issuer')"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-emerald-100/80 border border-white/10 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40"
                            title="Create a temporary, encrypted share link">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                            <span class="hidden sm:inline">Share</span>
                        </button>
                        <button onclick="viewIssuerDocument('${doc.docId}')"
                            class="btn-emerald-glass inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50">
                            ${ISSUER_ICONS.eye}
                            View
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

/**
 * Verify a document record against the on-chain contract: reads getDocument()
 * and checks the file hash + issuer/receiver match the mirrored record.
 */
async function verifyIssuerDocument(docId) {
    const { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG } = window.DOCV_CONTRACT || {};
    if (!CONTRACT_ADDRESS) {
        showToast('Contract address not configured.', 'error');
        return;
    }
    const local = issuerDocsCache.find(d => d.docId === docId);
    try {
        toggleLoading(true);
        // Read-only via a JSON-RPC provider (no wallet popup needed).
        const provider = new window.ethers.providers.JsonRpcProvider(CHAIN_CONFIG.rpcUrls[0]);
        const contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const onChain = await contract.getDocument(docId);

        const hashMatch = local && onChain.fileHash.toLowerCase() === local.fileHash.toLowerCase();
        const issuerMatch = local && onChain.issuer.toLowerCase() === local.issuerWallet.toLowerCase();
        const receiverMatch = local && onChain.receiver.toLowerCase() === local.receiverWallet.toLowerCase();

        if (hashMatch && issuerMatch && receiverMatch) {
            showToast('✓ Verified on-chain — record matches the blockchain.', 'success');
        } else {
            showToast('⚠ On-chain record does not fully match the stored data.', 'error');
            console.warn('Verify mismatch', { onChain, local });
        }
    } catch (error) {
        console.error('On-chain verify error:', error);
        showToast('Could not read the record from the blockchain.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * POST to a view endpoint; if the server replies 428 (passphrase required for a
 * site-gated vault doc), prompt for it on our site and retry. The server does
 * the decryption — the file can only be opened here. Returns { blob, document }.
 */
async function siteGatedFetch(url, basePayload) {
    const post = (payload) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    let resp = await post(basePayload);
    let data = await resp.json().catch(() => ({}));

    if (resp.status === 428 && data.needsPassphrase) {
        toggleLoading(false);
        const passphrase = await promptPassphrase('Enter passphrase to open');
        if (passphrase === null) return null; // cancelled
        toggleLoading(true);
        resp = await post({ ...basePayload, passphrase });
        data = await resp.json().catch(() => ({}));
        if (resp.status === 401 && data.needsPassphrase) {
            showToast('Wrong passphrase.', 'error');
            return null;
        }
    }
    if (!resp.ok) throw new Error(data.message || 'Failed to open document.');

    const { contentType } = data.document;
    const byteChars = atob(data.content);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return { blob: new Blob([bytes], { type: contentType }), document: data.document };
}

async function viewIssuerDocument(docId) {
    try {
        toggleLoading(true);
        const res = await siteGatedFetch(`${API_BASE_URL}/issuer/documents/${docId}/view`, issuerAuthPayload());
        if (!res) return;
        window.open(URL.createObjectURL(res.blob), '_blank');
        showToast(`Opened ${res.document.docType || ''} ${res.document.docNumber || ''}`.trim(), 'success');
    } catch (error) {
        console.error('View issuer document error:', error);
        showToast(error.message || 'Failed to open document.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Expose issuer-portal handlers for inline onclick attributes.
window.showIssuerPortal = showIssuerPortal;
window.issuerConnectAndLogin = issuerConnectAndLogin;
window.issuerLogout = issuerLogout;
window.showIssuerSection = showIssuerSection;
window.loadIssuerDocuments = loadIssuerDocuments;
window.viewIssuerDocument = viewIssuerDocument;
window.verifyIssuerDocument = verifyIssuerDocument;
window.setIssuerDocFilter = setIssuerDocFilter;
window.copyToClipboard = copyToClipboard;

/** Copy the connected issuer wallet (closure over module-scope issuerState). */
function copyIssuerWallet(btn) { copyToClipboard(issuerState.wallet, btn); }
window.copyIssuerWallet = copyIssuerWallet;

// ==================================================================== //
// ============ USER PORTAL — 5-LAYER AUTHENTICITY CHECK ============== //
// ==================================================================== //

function getAuthenticityCheckHTML() {
    return `
        <div class="max-w-3xl mx-auto space-y-6">
            <div class="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
                <h1 class="text-2xl font-bold mb-1">🛡️ 4-Layer Anti-Copy Check</h1>
                <p class="text-brand-100 text-sm">Upload a document to test it against the registered original. Every check runs on our own servers — your document is never sent to any third party.</p>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 sm:p-8">
                <form id="authenticity-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Document File</label>
                        <label for="auth-file" class="group flex flex-col items-center justify-center gap-2 px-4 py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition-colors text-center">
                            <svg class="w-8 h-8 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 13l3-3m0 0l3 3m-3-3v9"></path></svg>
                            <span id="auth-file-label" class="text-sm text-slate-500"><span class="font-semibold text-brand-600">Choose a file</span> to check (image or PDF)</span>
                            <input id="auth-file" type="file" name="document" required class="sr-only" />
                        </label>
                    </div>
                    <button type="submit" class="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Run 4-Layer Check
                    </button>
                </form>
                <div id="authenticity-result" class="hidden mt-6"></div>
            </div>
        </div>`;
}

function setupAuthenticityCheck() {
    const form = document.getElementById('authenticity-form');
    const fileInput = document.getElementById('auth-file');
    const fileLabel = document.getElementById('auth-file-label');
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', () => {
            fileLabel.innerHTML = fileInput.files?.length
                ? `<span class="font-semibold text-brand-700">${fileInput.files[0].name}</span>`
                : `<span class="font-semibold text-brand-600">Choose a file</span> to check (image or PDF)`;
        });
    }
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = fileInput.files?.[0];
            if (!file) { showToast('Please choose a file.', 'error'); return; }
            try {
                toggleLoading(true);
                const fd = new FormData();
                fd.append('document', file);
                const resp = await fetch(`${API_BASE_URL}/security/check`, {
                    method: 'POST', body: fd, credentials: 'include',
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.message || 'Check failed.');
                renderSecurityResult(data);
            } catch (err) {
                console.error('Authenticity check error:', err);
                showToast(err.message || 'Check failed.', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }
}

function renderSecurityResult(data) {
    const el = document.getElementById('authenticity-result');
    if (!el) return;
    const L = data.layers || {};

    const verdictColor = data.verified ? 'emerald' : 'red';
    const verdictIcon = data.verified
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';

    // tri-state pill: true=pass, false=fail, null=n/a
    const pill = (state, passText, failText, naText = 'N/A') => {
        if (state === true) return `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">${passText}</span>`;
        if (state === false) return `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-600">${failText}</span>`;
        return `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">${naText}</span>`;
    };

    const row = (num, name, detail, pillHtml) => `
        <div class="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
            <div class="flex items-center gap-3 min-w-0">
                <span class="shrink-0 h-7 w-7 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center">L${num}</span>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800">${name}</p>
                    <p class="text-xs text-slate-500 truncate">${detail}</p>
                </div>
            </div>
            ${pillHtml}
        </div>`;

    const phDist = L.layer3_phash?.distance;
    el.innerHTML = `
        <div class="rounded-xl border ${data.verified ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'} p-5 mb-4">
            <div class="flex items-center gap-3">
                <span class="h-10 w-10 rounded-full bg-${verdictColor}-100 text-${verdictColor}-600 flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${verdictIcon}</svg>
                </span>
                <div>
                    <p class="text-lg font-bold text-${verdictColor}-700">${data.verdict}</p>
                    <p class="text-sm text-slate-600">Security score: <b>${data.securityScore}%</b>${data.matched ? ` · matched a registered ${data.matchType} record` : ' · no matching registered original found'}</p>
                </div>
            </div>
            ${(data.reasons && data.reasons.length) ? `<ul class="mt-3 space-y-1 text-sm text-${verdictColor}-700 list-disc list-inside">${data.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
        </div>

        <div class="bg-white rounded-xl border border-slate-200">
            <div class="px-4">
                ${row(1, 'SHA-256 Exact Hash', L.layer1_sha256?.expected ? 'Compared against the registered file hash' : 'No registered hash to compare', pill(L.layer1_sha256?.match, 'Match', 'No match'))}
                ${row(2, 'Invisible Watermark', data.watermarkServiceConfigured ? 'DWT-DCT steganographic watermark' : 'Watermark service not running', pill(L.layer2_watermark?.intact, 'Intact', 'Broken', data.watermarkServiceConfigured ? 'N/A' : 'Off'))}
                ${row(3, 'Perceptual Hash (pHash)', phDist !== null && phDist !== undefined ? `Hamming distance: ${phDist}` : 'Image fingerprint (images only)', pill(L.layer3_phash?.identical ? true : (L.layer3_phash?.similar === false ? false : (L.layer3_phash?.similar ?? null)), L.layer3_phash?.identical ? 'Identical' : 'Similar', 'Different'))}
                ${row(4, 'Blockchain Record', 'Immutable on-chain proof (Sepolia)', pill(L.layer5_blockchain?.registered, 'Registered', 'Not found'))}
            </div>
        </div>`;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================================================================== //
// ============ USER PORTAL — RECEIVED DOCUMENTS ===================== //
// ==================================================================== //

function getReceivedDocumentsHTML() {
    return `
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold mb-1">📥 Received Documents</h1>
                    <p class="text-brand-100 text-sm">Documents issued to you by organisations through the Issuer Portal.</p>
                </div>
                <button onclick="loadReceivedDocuments()" class="px-4 py-2 text-sm font-medium bg-white/15 hover:bg-white/25 rounded-xl transition-colors">↻ Refresh</button>
            </div>
            <div id="shared-with-me-section" class="hidden">
                <h2 class="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">🔗 Shared with me <span class="font-normal text-slate-400 normal-case">(temporary)</span></h2>
                <div id="shared-with-me-list" class="mb-6"></div>
            </div>
            <div id="received-docs-list">
                <div class="flex items-center justify-center h-40"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
            </div>
        </div>`;
}

// Registered-user shares addressed to the logged-in user (Phase 4 audience).
async function loadSharedWithMe() {
    const section = document.getElementById('shared-with-me-section');
    const list = document.getElementById('shared-with-me-list');
    if (!section || !list) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/shares/received`, { credentials: 'include' });
        const shares = await resp.json();
        if (!resp.ok || !Array.isArray(shares) || !shares.length) { section.classList.add('hidden'); return; }
        section.classList.remove('hidden');
        list.innerHTML = shares.map(s => {
            const gateBadge = s.gate === 'otp' ? 'Email code' : s.gate === 'password' ? 'Password' : '';
            return `
                <div class="bg-white rounded-2xl border border-emerald-200/70 shadow-sm hover:shadow-md transition-shadow p-5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="min-w-0 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="font-semibold text-slate-800 truncate">${s.docType || 'Document'}${s.docNumber ? ` — ${s.docNumber}` : ''}</h4>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">Shared</span>
                            ${gateBadge ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">${gateBadge}</span>` : ''}
                        </div>
                        <p class="text-xs text-slate-500 font-mono">From: ${s.ownerWallet ? s.ownerWallet.slice(0,6) + '...' + s.ownerWallet.slice(-4) : '—'}</p>
                        <p class="text-xs text-slate-400">Expires ${new Date(s.expiresAt).toLocaleString()}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="openSharedWithMe('${s.shareId}', '${s.gate}')"
                            class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors">
                            🔓 View
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Shared-with-me error:', err);
        section.classList.add('hidden');
    }
}

// Open a registered-user share from inside the portal (session-authenticated).
async function openSharedWithMe(shareId, gate) {
    try {
        toggleLoading(true);
        const extra = {};
        if (gate === 'password') {
            const pw = await promptPassphrase('Enter the share password');
            if (pw === null) return;
            extra.password = pw;
        }
        // (Email-code gate, if ever set on a user share, is handled on retry below.)
        const post = (body) => fetch(`${API_BASE_URL}/shares/${shareId}/open`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(body),
        });
        let resp = await post(extra);
        let data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            if (resp.status === 401 && data.needsLogin) throw new Error('Please sign in as the recipient to open this document.');
            throw new Error(data.message || 'Failed to open the shared document.');
        }
        const byteChars = atob(data.content);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.document.contentType || 'application/octet-stream' });
        window.open(URL.createObjectURL(blob), '_blank');
        showToast('Shared document opened.', 'success');
    } catch (err) {
        console.error('Open shared-with-me error:', err);
        showToast(err.message || 'Failed to open document.', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function loadReceivedDocuments() {
    const list = document.getElementById('received-docs-list');
    if (!list) return;
    loadSharedWithMe(); // registered-user shares (Phase 4) — independent, non-blocking
    try {
        const resp = await fetch(`${API_BASE_URL}/received-documents`, { credentials: 'include' });
        const docs = await resp.json();
        if (!resp.ok) throw new Error(docs.message || 'Failed to load.');

        if (!docs.length) {
            list.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-200/70 p-12 text-center">
                    <div class="text-5xl mb-3 opacity-30">📭</div>
                    <h4 class="font-semibold text-slate-700">No documents received yet</h4>
                    <p class="text-slate-500 text-sm mt-1">When an issuer publishes a document to your email or wallet, it will appear here.</p>
                </div>`;
            return;
        }

        list.innerHTML = docs.map(d => {
            const date = d.issuedAt ? new Date(d.issuedAt).toLocaleString() : '';
            return `
                <div class="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow p-5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="min-w-0 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="font-semibold text-slate-800 truncate">${d.docType || 'Document'}${d.docNumber ? ` — ${d.docNumber}` : ''}</h4>
                            ${d.encrypted ? '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">🔒 Encrypted</span>' : ''}
                            ${d.watermarked ? '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">Watermarked</span>' : ''}
                        </div>
                        <p class="text-xs text-slate-500 font-mono">From: ${d.issuerWallet.slice(0,6)}...${d.issuerWallet.slice(-4)}</p>
                        <p class="text-xs text-slate-400">${date}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="downloadReceivedDocument('${d.docId}', ${d.encrypted ? 'true' : 'false'})"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                            title="Download the original to run the Authenticity Check">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download
                        </button>
                        <button onclick="openShareModal('${d.docId}', 'received')"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                            title="Create a temporary, encrypted share link">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                            Share
                        </button>
                        <button onclick="viewReceivedDocument('${d.docId}', ${d.encrypted ? 'true' : 'false'})"
                            class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors">
                            🔓 View
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Received docs error:', err);
        list.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">${err.message}</div>`;
    }
}

/**
 * Shared: MetaMask-sign, then fetch a received document. Encrypted docs are
 * decrypted on the server after you enter the passphrase here (site-gated).
 * Returns { blob, document } or null.
 */
async function fetchReceivedDoc(docId) {
    if (typeof window.ethereum === 'undefined') {
        showToast('MetaMask is required to open received documents.', 'error');
        return null;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];
    const message = `Open received document: ${docId}`;
    const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, walletAddress] });

    return await siteGatedFetch(`${API_BASE_URL}/received-documents/${docId}/view`, { walletAddress, signature, message });
}

async function viewReceivedDocument(docId, encrypted) {
    try {
        toggleLoading(true);
        const res = await fetchReceivedDoc(docId);
        if (!res) return;
        window.open(URL.createObjectURL(res.blob), '_blank');
        showToast('Document opened.', 'success');
    } catch (err) {
        console.error('View received document error:', err);
        if (err.message && err.message.includes('User rejected')) showToast('Signature cancelled.', 'error');
        else if (err.name === 'OperationError') showToast('Wrong passphrase or corrupted file.', 'error');
        else showToast(err.message || 'Failed to open document.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Download the original received file so the user can re-upload it to the
 * 5-layer Authenticity Check.
 */
async function downloadReceivedDocument(docId, encrypted) {
    try {
        toggleLoading(true);
        const res = await fetchReceivedDoc(docId);
        if (!res) return;
        const { blob, document: meta } = res;
        // Prefer the original filename; else build one from the mime type.
        let filename = meta.fileName;
        if (!filename) {
            const ext = (blob.type && blob.type.split('/')[1]) ? blob.type.split('/')[1].split('+')[0] : 'bin';
            filename = `${(meta.docType || 'document').replace(/\s+/g, '_')}_${meta.docNumber || meta.docId.slice(0, 8)}.${ext}`;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Original downloaded — upload it to Authenticity Check to verify.', 'success');
    } catch (err) {
        console.error('Download received document error:', err);
        if (err.message && err.message.includes('User rejected')) showToast('Signature cancelled.', 'error');
        else if (err.name === 'OperationError') showToast('Wrong passphrase or corrupted file.', 'error');
        else showToast(err.message || 'Failed to download document.', 'error');
    } finally {
        toggleLoading(false);
    }
}

window.getAuthenticityCheckHTML = getAuthenticityCheckHTML;
window.setupAuthenticityCheck = setupAuthenticityCheck;
window.getReceivedDocumentsHTML = getReceivedDocumentsHTML;
window.loadReceivedDocuments = loadReceivedDocuments;
window.viewReceivedDocument = viewReceivedDocument;
window.downloadReceivedDocument = downloadReceivedDocument;

// ==================================================================== //
// ================= SECURE DOCUMENT SHARING (modal) ================== //
// ==================================================================== //
//
// `context` is 'issuer' (My Documents, wallet-signature auth) or 'received'
// (Received Documents, session auth). The modal lets the owner pick an expiry,
// then returns a private /share/:id#t=<token> link. The document is re-encrypted
// server-side into a per-share copy; only our server can open it, only until it
// expires or is revoked.

const SHARE_EXPIRY_PRESETS = [
    { label: '1 hour', ms: 60 * 60 * 1000 },
    { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
    { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
];

const SHARE_GATES = [
    { key: 'none', label: 'No extra step' },
    { key: 'otp', label: 'Email code' },
    { key: 'password', label: 'Password' },
];

const SHARE_TIERS = [
    {
        key: 'server',
        label: 'Protected',
        note: "Encrypted; our server decrypts only at view time so it can watermark and keep it view-only. Best for control + audit.",
    },
    {
        key: 'zk',
        label: 'Zero-knowledge',
        note: "Encrypted in your browser — the key lives only inside the link, so even our server can never read it. Maximum privacy (no server watermark).",
    },
];

const SHARE_AUDIENCES = [
    { key: 'link', label: 'Anyone with link' },
    { key: 'user', label: 'Registered user' },
];

// Encrypt a blob in the browser with a fresh AES-256-GCM key (zero-knowledge).
// Returns the URL-safe key (never sent to the server), the iv, and ciphertext.
async function zkEncryptBlob(blob) {
    const keyRaw = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM' }, false, ['encrypt']);
    const data = new Uint8Array(await blob.arrayBuffer());
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
    return { keyB64: bytesToB64url(keyRaw), ivB64: bytesToB64(iv), ciphertext: ct };
}

function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}
function bytesToB64url(bytes) {
    return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Fetch a document's PLAINTEXT (the owner unlocks it once, like viewing). Used
// to build a zero-knowledge share. Returns { blob, document } or null.
async function getDocPlaintextBlob(docId, context) {
    if (context === 'issuer') {
        return await siteGatedFetch(`${API_BASE_URL}/issuer/documents/${docId}/view`, issuerAuthPayload());
    }
    return await fetchReceivedDoc(docId);
}

// Build a zero-knowledge share: encrypt in-browser, upload ciphertext only, then
// append the key to the link #fragment locally (the server never sees it).
async function createZkShare(docId, context, opts) {
    const res = await getDocPlaintextBlob(docId, context);
    if (!res) return null; // cancelled (passphrase/signature)
    if (await blobIsStillEncrypted(res.blob)) {
        throw new Error('This document uses an older encryption format and must be re-published before it can be shared.');
    }
    const { keyB64, ivB64, ciphertext } = await zkEncryptBlob(res.blob);

    const fd = new FormData();
    fd.append('document', new Blob([ciphertext], { type: 'application/octet-stream' }), 'enc.bin');
    fd.append('docId', docId);
    fd.append('ivB64', ivB64);
    if (opts.expiresAt) fd.append('expiresAt', opts.expiresAt);
    else fd.append('expiresInMs', String(opts.expiresInMs));
    if (opts.maxViews) fd.append('maxViews', String(opts.maxViews));
    fd.append('gate', opts.gate || 'none');
    if (opts.recipientEmail) fd.append('recipientEmail', opts.recipientEmail);
    if (opts.password) fd.append('password', opts.password);
    if (context === 'issuer') {
        const a = issuerAuthPayload();
        fd.append('walletAddress', a.walletAddress);
        fd.append('signature', a.signature);
        fd.append('message', a.message);
    }

    const resp = await fetch(`${API_BASE_URL}/shares/zk`, { method: 'POST', credentials: 'include', body: fd });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Failed to create the share link.');
    // Append the decryption key to the fragment — this stays in the browser/link only.
    data.shareUrl = data.shareUrl + (data.shareUrl.includes('#') ? '&' : '#') + 'k=' + keyB64;
    return data;
}

// Attach the right auth to a share request for the given portal context.
function shareAuthFor(context, body) {
    if (context === 'issuer') return { ...body, ...issuerAuthPayload() };
    return body; // 'received' relies on the logged-in session
}

// True if a blob still carries one of our encryption magic headers (i.e. the
// document couldn't actually be decrypted for sharing).
async function blobIsStillEncrypted(blob) {
    try {
        const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        const magic = String.fromCharCode(...head);
        return magic === 'DOCVENC1' || magic === 'DVSITE01';
    } catch { return false; }
}

// Create a server-gated (Protected) share. The browser first obtains the
// document's DECRYPTED bytes — the exact same path the View button uses (which
// prompts MetaMask / a passphrase as needed) — then uploads that plaintext. The
// server re-encrypts a share copy it can reopen at view time (to watermark).
async function createServerShare(docId, context, opts) {
    const res = await getDocPlaintextBlob(docId, context);
    if (!res) return null; // cancelled (passphrase / MetaMask signature)
    if (await blobIsStillEncrypted(res.blob)) {
        throw new Error('This document uses an older encryption format and must be re-published before it can be shared.');
    }

    const fname = (res.document && res.document.fileName) || 'document';
    const realMime = res.blob.type || (res.document && res.document.contentType) || '';
    const fd = new FormData();
    // Upload as opaque bytes so it always passes the server's upload filter; the
    // true type travels in the mimeType field and is re-confirmed by sniffing.
    fd.append('document', new Blob([res.blob], { type: 'application/octet-stream' }), fname);
    fd.append('docId', docId);
    fd.append('mimeType', realMime);
    fd.append('fileName', fname);
    if (opts.expiresAt) fd.append('expiresAt', opts.expiresAt);
    else fd.append('expiresInMs', String(opts.expiresInMs));
    if (opts.maxViews) fd.append('maxViews', String(opts.maxViews));
    fd.append('gate', opts.gate || 'none');
    if (opts.recipientEmail) fd.append('recipientEmail', opts.recipientEmail);
    if (opts.password) fd.append('password', opts.password);
    fd.append('audience', opts.audience || 'link');
    if (opts.recipientWallet) fd.append('recipientWallet', opts.recipientWallet);
    if (context === 'issuer') {
        const a = issuerAuthPayload();
        fd.append('walletAddress', a.walletAddress);
        fd.append('signature', a.signature);
        fd.append('message', a.message);
    }

    const resp = await fetch(`${API_BASE_URL}/shares`, { method: 'POST', credentials: 'include', body: fd });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Failed to create the share link.');
    return data;
}

async function postRevokeShare(shareId, context) {
    const resp = await fetch(`${API_BASE_URL}/shares/${shareId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shareAuthFor(context, {})),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Failed to revoke the share.');
    return data;
}

async function postListShares(docId, context) {
    const resp = await fetch(`${API_BASE_URL}/shares/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shareAuthFor(context, { docId })),
    });
    const data = await resp.json().catch(() => []);
    if (!resp.ok) throw new Error(data.message || 'Failed to list shares.');
    return data;
}

async function postShareAudit(shareId, context) {
    const resp = await fetch(`${API_BASE_URL}/shares/${shareId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shareAuthFor(context, {})),
    });
    const data = await resp.json().catch(() => []);
    if (!resp.ok) throw new Error(data.message || 'Failed to load activity.');
    return data;
}

function openShareModal(docId, context = 'issuer') {
    let expiryMs = SHARE_EXPIRY_PRESETS[1].ms; // default 24 hours
    let customMode = false;
    let gate = 'none';
    let tier = 'server';
    let audience = 'link';

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-4';
    overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 border border-white/10 shadow-2xl p-6" role="dialog" aria-modal="true">
            <div class="flex items-center gap-2.5 mb-1">
                <span class="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </span>
                <h3 class="text-lg font-bold">Share securely</h3>
            </div>
            <p class="text-sm text-slate-400 mb-5">Create a private link that expires automatically. The document stays encrypted and can be opened only through this link.</p>

            <div id="share-form">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Share with</label>
                <div id="share-audience-chips" class="flex flex-wrap gap-2 mb-3"></div>
                <input id="share-recipient-user" type="text" placeholder="Recipient's email or wallet address" class="hidden w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50 mb-4" />

                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Link expires in</label>
                <div id="share-expiry-chips" class="flex flex-wrap gap-2 mb-3"></div>
                <input id="share-custom-dt" type="datetime-local" class="hidden w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50 mb-3" />

                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Encryption</label>
                <div id="share-tier-chips" class="flex flex-wrap gap-2 mb-2"></div>
                <p id="share-tier-note" class="text-xs text-slate-500 mb-1"></p>

                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Protect with</label>
                <div id="share-gate-chips" class="flex flex-wrap gap-2 mb-3"></div>
                <input id="share-recipient-email" type="email" placeholder="Recipient's email (they'll get a code)" class="hidden w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50 mb-3" />
                <input id="share-password" type="text" placeholder="Set a password (tell the recipient privately)" class="hidden w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50 mb-3" />

                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Max opens <span class="normal-case text-slate-500">(optional)</span></label>
                <input id="share-max-views" type="number" min="1" placeholder="Unlimited" class="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/50 mb-5" />

                <div class="flex gap-2 justify-end">
                    <button id="share-cancel" class="px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                    <button id="share-create" class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold rounded-lg transition-colors">Create secure share</button>
                </div>

                <div class="mt-4 pt-3 border-t border-white/10">
                    <button id="share-manage-toggle" type="button" class="text-sm text-emerald-300 hover:text-emerald-200 font-medium">Manage existing links ▾</button>
                    <div id="share-manage-list" class="hidden mt-3 space-y-2 max-h-60 overflow-auto"></div>
                </div>
            </div>

            <div id="share-result" class="hidden">
                <div class="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 mb-4 flex items-start gap-2">
                    <svg class="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <p class="text-sm text-emerald-100"><span id="share-success-title">Link created.</span> <span id="share-expiry-note" class="text-emerald-200/80"></span></p>
                </div>
                <div id="share-link-block">
                    <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Private link</label>
                    <div class="flex gap-2 mb-4">
                        <input id="share-url" readonly class="flex-1 rounded-lg bg-slate-800 border border-white/10 px-3 py-2.5 text-sm font-mono text-emerald-200 outline-none" />
                        <button id="share-copy" class="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-100 text-sm font-semibold rounded-lg transition-colors">Copy</button>
                    </div>
                </div>
                <p id="share-help-text" class="text-xs text-slate-500 mb-4"></p>
                <div class="flex gap-2 justify-between">
                    <button id="share-revoke" class="px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10 border border-red-400/20 rounded-lg transition-colors">Revoke now</button>
                    <button id="share-done" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-100 text-sm font-semibold rounded-lg transition-colors">Done</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    const chipsBar = overlay.querySelector('#share-expiry-chips');
    const customDt = overlay.querySelector('#share-custom-dt');
    const gateChips = overlay.querySelector('#share-gate-chips');
    const emailInput = overlay.querySelector('#share-recipient-email');
    const pwInput = overlay.querySelector('#share-password');
    const tierChips = overlay.querySelector('#share-tier-chips');
    const tierNote = overlay.querySelector('#share-tier-note');
    const audienceChips = overlay.querySelector('#share-audience-chips');
    const recipientUserInput = overlay.querySelector('#share-recipient-user');

    function renderAudienceChips() {
        audienceChips.innerHTML = SHARE_AUDIENCES.map(a =>
            `<button type="button" data-key="${a.key}" class="share-aud-chip px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${audience === a.key ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}">${a.label}</button>`
        ).join('');
        recipientUserInput.classList.toggle('hidden', audience !== 'user');
        audienceChips.querySelectorAll('.share-aud-chip').forEach(btn => {
            btn.onclick = () => {
                audience = btn.dataset.key;
                if (audience === 'user') tier = 'server'; // zk needs link delivery
                renderAudienceChips();
                renderTierChips();
            };
        });
    }

    function renderTierChips() {
        tierChips.innerHTML = SHARE_TIERS.map(t => {
            const disabled = audience === 'user' && t.key === 'zk';
            const active = tier === t.key;
            const cls = active ? 'bg-emerald-500 text-slate-950'
                : disabled ? 'bg-white/5 text-slate-600 border border-white/10 cursor-not-allowed'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10';
            return `<button type="button" data-key="${t.key}" ${disabled ? 'disabled' : ''} class="share-tier-chip px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${cls}">${t.label}</button>`;
        }).join('');
        tierNote.textContent = audience === 'user'
            ? "Registered-user shares use the Protected tier — the recipient opens it inside their own account."
            : (SHARE_TIERS.find(t => t.key === tier) || {}).note || '';
        tierChips.querySelectorAll('.share-tier-chip:not([disabled])').forEach(btn => {
            btn.onclick = () => { tier = btn.dataset.key; renderTierChips(); };
        });
    }
    renderAudienceChips();
    renderTierChips();

    function renderGateChips() {
        gateChips.innerHTML = SHARE_GATES.map(g =>
            `<button type="button" data-key="${g.key}" class="share-gate-chip px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${gate === g.key ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}">${g.label}</button>`
        ).join('');
        gateChips.querySelectorAll('.share-gate-chip').forEach(btn => {
            btn.onclick = () => {
                gate = btn.dataset.key;
                emailInput.classList.toggle('hidden', gate !== 'otp');
                pwInput.classList.toggle('hidden', gate !== 'password');
                renderGateChips();
            };
        });
    }
    renderGateChips();

    function renderChips() {
        const mk = (label, active) =>
            `<button type="button" data-label="${label}" class="share-chip px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}">${label}</button>`;
        chipsBar.innerHTML =
            SHARE_EXPIRY_PRESETS.map(p => mk(p.label, !customMode && expiryMs === p.ms)).join('') +
            mk('Custom', customMode);
        chipsBar.querySelectorAll('.share-chip').forEach(btn => {
            btn.onclick = () => {
                const label = btn.dataset.label;
                if (label === 'Custom') {
                    customMode = true;
                    customDt.classList.remove('hidden');
                } else {
                    customMode = false;
                    customDt.classList.add('hidden');
                    expiryMs = SHARE_EXPIRY_PRESETS.find(p => p.label === label).ms;
                }
                renderChips();
            };
        });
    }
    renderChips();

    overlay.querySelector('#share-cancel').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    // --- Manage existing links for this document (list / activity / revoke) ---
    const manageToggle = overlay.querySelector('#share-manage-toggle');
    const manageList = overlay.querySelector('#share-manage-list');
    let manageLoaded = false;

    function shareStatus(s) {
        if (s.revoked) return { label: 'Revoked', cls: 'bg-red-500/15 text-red-300' };
        if (new Date(s.expiresAt) <= new Date()) return { label: 'Expired', cls: 'bg-slate-500/20 text-slate-400' };
        if (s.maxViews > 0 && s.viewCount >= s.maxViews) return { label: 'Used up', cls: 'bg-slate-500/20 text-slate-400' };
        return { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-300' };
    }
    function renderShareRow(s) {
        const st = shareStatus(s);
        const who = s.audience === 'user' ? (s.recipientEmail || s.recipientWallet || 'registered user') : 'Anyone with link';
        const gateLabel = s.gate === 'otp' ? 'Email code' : s.gate === 'password' ? 'Password' : 'No gate';
        const tierLabel = s.tier === 'zk' ? 'Zero-knowledge' : 'Protected';
        const views = `${s.viewCount}${s.maxViews > 0 ? '/' + s.maxViews : ''} opens`;
        const canRevoke = st.label === 'Active';
        return `
            <div class="rounded-lg border border-white/10 bg-white/5 p-3 text-xs" data-share="${s.shareId}">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${st.cls}">${st.label}</span>
                    <span class="text-slate-400">${views}</span>
                </div>
                <p class="text-slate-300 truncate">${who} · ${tierLabel} · ${gateLabel}</p>
                <p class="text-slate-500">Expires ${new Date(s.expiresAt).toLocaleString()}</p>
                <div class="flex items-center gap-3 mt-2">
                    <button type="button" class="share-activity-btn text-emerald-300 hover:text-emerald-200 font-medium" data-share="${s.shareId}">Activity</button>
                    ${canRevoke ? `<button type="button" class="share-revoke-btn text-red-300 hover:text-red-200 font-medium" data-share="${s.shareId}">Revoke</button>` : ''}
                </div>
                <div class="share-activity hidden mt-2 border-t border-white/10 pt-2 space-y-1"></div>
            </div>`;
    }
    function wireManageRows() {
        manageList.querySelectorAll('.share-revoke-btn').forEach(btn => {
            btn.onclick = async () => {
                btn.disabled = true; btn.textContent = 'Revoking…';
                try { await postRevokeShare(btn.dataset.share, context); showToast('Share revoked.', 'success'); await loadManage(); }
                catch (e) { showToast(e.message || 'Failed to revoke.', 'error'); btn.disabled = false; btn.textContent = 'Revoke'; }
            };
        });
        manageList.querySelectorAll('.share-activity-btn').forEach(btn => {
            btn.onclick = async () => {
                const box = btn.closest('[data-share]').querySelector('.share-activity');
                if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
                box.classList.remove('hidden');
                box.innerHTML = '<p class="text-slate-500">Loading…</p>';
                try {
                    const logs = await postShareAudit(btn.dataset.share, context);
                    box.innerHTML = logs.length
                        ? logs.map(l => `<p class="text-slate-400"><span class="text-slate-300">${l.event}</span>${l.detail ? ' · ' + l.detail : ''} · ${new Date(l.at).toLocaleString()}${l.ip ? ' · ' + l.ip : ''}</p>`).join('')
                        : '<p class="text-slate-500">No activity yet.</p>';
                } catch (e) { box.innerHTML = `<p class="text-red-400">${e.message}</p>`; }
            };
        });
    }
    async function loadManage() {
        manageList.innerHTML = '<p class="text-xs text-slate-500">Loading…</p>';
        try {
            const shares = await postListShares(docId, context);
            manageLoaded = true;
            manageList.innerHTML = shares.length
                ? shares.map(renderShareRow).join('')
                : '<p class="text-xs text-slate-500">No share links yet for this document.</p>';
            wireManageRows();
        } catch (e) {
            manageList.innerHTML = `<p class="text-xs text-red-400">${e.message}</p>`;
        }
    }
    manageToggle.onclick = async () => {
        const willShow = manageList.classList.contains('hidden');
        manageList.classList.toggle('hidden', !willShow);
        manageToggle.textContent = willShow ? 'Manage existing links ▴' : 'Manage existing links ▾';
        if (willShow && !manageLoaded) await loadManage();
    };

    overlay.querySelector('#share-create').onclick = async () => {
        const payload = { docId };
        if (customMode) {
            if (!customDt.value) { showToast('Pick a custom expiry date/time.', 'error'); return; }
            const when = new Date(customDt.value);
            if (isNaN(when.getTime()) || when.getTime() <= Date.now()) { showToast('Choose a future date/time.', 'error'); return; }
            payload.expiresAt = when.toISOString();
        } else {
            payload.expiresInMs = expiryMs;
        }
        const maxViews = parseInt(overlay.querySelector('#share-max-views').value, 10);
        if (Number.isFinite(maxViews) && maxViews > 0) payload.maxViews = maxViews;

        payload.gate = gate;
        if (gate === 'otp') {
            const email = emailInput.value.trim();
            if (!/^\S+@\S+\.\S+$/.test(email)) { showToast("Enter the recipient's email for the code gate.", 'error'); return; }
            payload.recipientEmail = email;
        } else if (gate === 'password') {
            const pw = pwInput.value;
            if (!pw || pw.length < 4) { showToast('Set a password of at least 4 characters.', 'error'); return; }
            payload.password = pw;
        }

        payload.audience = audience;
        if (audience === 'user') {
            const v = recipientUserInput.value.trim();
            if (/^0x[a-fA-F0-9]{40}$/.test(v)) payload.recipientWallet = v;
            else if (/^\S+@\S+\.\S+$/.test(v)) payload.recipientEmail = v;
            else { showToast('Enter the recipient\'s valid email or 0x wallet address.', 'error'); return; }
        }
        // Zero-knowledge needs link delivery (the key rides in the link), so a
        // registered-user share always uses the Protected tier.
        const effectiveTier = audience === 'user' ? 'server' : tier;

        try {
            toggleLoading(true);
            let data;
            if (effectiveTier === 'zk') {
                data = await createZkShare(docId, context, {
                    expiresInMs: payload.expiresInMs,
                    expiresAt: payload.expiresAt,
                    maxViews: payload.maxViews,
                    gate,
                    recipientEmail: payload.recipientEmail,
                    password: payload.password,
                });
            } else {
                data = await createServerShare(docId, context, {
                    expiresInMs: payload.expiresInMs,
                    expiresAt: payload.expiresAt,
                    maxViews: payload.maxViews,
                    gate,
                    recipientEmail: payload.recipientEmail,
                    password: payload.password,
                    audience: payload.audience,
                    recipientWallet: payload.recipientWallet,
                });
            }
            if (!data) return; // cancelled (e.g. passphrase prompt / signature)

            const isUser = data.audience === 'user';
            overlay.querySelector('#share-form').classList.add('hidden');
            overlay.querySelector('#share-result').classList.remove('hidden');
            overlay.querySelector('#share-link-block').classList.toggle('hidden', isUser);
            overlay.querySelector('#share-success-title').textContent = isUser ? 'Shared.' : 'Link created.';
            overlay.querySelector('#share-expiry-note').textContent =
                data.expiresAt ? `Expires ${new Date(data.expiresAt).toLocaleString()}.` : '';

            let helpText;
            if (isUser) {
                helpText = `Shared with ${data.recipient}. They'll see it under "Shared with me" when they sign in to DocVerify${data.gate !== 'none' ? ' (an extra verification step still applies)' : ''}. Revoke anytime below.`;
            } else {
                const gateText = data.gate === 'otp'
                    ? "The recipient must enter a one-time code emailed to them — a leaked link alone won't open it."
                    : data.gate === 'password'
                    ? "The recipient must enter the password you set — share it through a separate, trusted channel."
                    : "Anyone with this link can view the document until it expires. Send it through a channel you trust.";
                const zkText = data.tier === 'zk'
                    ? " This is a zero-knowledge link: the key is inside the link itself, so keep the full link private — even we can't recover the document without it."
                    : "";
                helpText = gateText + zkText + " Revoke anytime below.";
            }
            overlay.querySelector('#share-help-text').textContent = helpText;

            if (!isUser) {
                overlay.querySelector('#share-url').value = data.shareUrl;
                overlay.querySelector('#share-copy').onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(data.shareUrl);
                        showToast('Link copied to clipboard.', 'success');
                    } catch {
                        overlay.querySelector('#share-url').select();
                        document.execCommand('copy');
                        showToast('Link copied.', 'success');
                    }
                };
            }
            overlay.querySelector('#share-done').onclick = close;
            overlay.querySelector('#share-revoke').onclick = async () => {
                try {
                    toggleLoading(true);
                    await postRevokeShare(data.shareId, context);
                    showToast('Share revoked — the link no longer works.', 'success');
                    close();
                } catch (err) {
                    showToast(err.message || 'Failed to revoke.', 'error');
                } finally {
                    toggleLoading(false);
                }
            };
        } catch (err) {
            console.error('Create share error:', err);
            showToast(err.message || 'Failed to create the share link.', 'error');
        } finally {
            toggleLoading(false);
        }
    };
}

window.openShareModal = openShareModal;
window.loadSharedWithMe = loadSharedWithMe;
window.openSharedWithMe = openSharedWithMe;