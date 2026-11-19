export type PublicMark = {
  id: string;
  kind: "flat" | "structure";
  name: string;
  lat: number;
  lng: number;
  acres?: number;
  note: string;
};

/** Public inshore oyster flats and near-inlet reefs within 50 miles of Charleston Harbor. */
export const PUBLIC_MARKS: PublicMark[] = [
  {
    "id": "charleston-nearshore",
    "kind": "structure",
    "name": "Charleston Nearshore Reef",
    "lat": 32.71042,
    "lng": -79.76102,
    "note": "SCDNR public reef, about 2.5 miles from the north jetty. Buoy published at 32 42.625 N, 079 45.661 W."
  },
  {
    "id": "lowcountry-anglers",
    "kind": "structure",
    "name": "Lowcountry Anglers Reef",
    "lat": 32.5727,
    "lng": -79.9183,
    "note": "SCDNR public reef off Folly Beach. Center from the published reef material."
  },
  {
    "id": "north-edisto-nearshore",
    "kind": "structure",
    "name": "North Edisto Nearshore Reef",
    "lat": 32.51733,
    "lng": -80.10002,
    "note": "SCDNR public reef, about 1.5 miles from the North Edisto inlet buoy. Published 32 31.040 N, 080 06.001 W."
  },
  {
    "id": "kiawah-reef",
    "kind": "structure",
    "name": "Kiawah Reef",
    "lat": 32.49085,
    "lng": -80.00097,
    "note": "SCDNR public reef off Kiawah. North buoy published at 32 29.451 N, 080 00.058 W."
  },
  {
    "id": "sthesSW_04075",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat",
    "lat": 32.37696,
    "lng": -80.4864,
    "acres": 7.32,
    "note": "7.32 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "awendSE_00673",
    "kind": "flat",
    "name": "Awendaw oyster flat",
    "lat": 33.01731,
    "lng": -79.51635,
    "acres": 6.47,
    "note": "6.47 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sthesNW_00086",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat 2",
    "lat": 32.46289,
    "lng": -80.47948,
    "acres": 3.87,
    "note": "3.87 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bulliNW_00874",
    "kind": "flat",
    "name": "Bulls Bay oyster flat",
    "lat": 32.96567,
    "lng": -79.60551,
    "acres": 3.86,
    "note": "3.86 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sthesNE_00208",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat 3",
    "lat": 32.48619,
    "lng": -80.38039,
    "acres": 3.8,
    "note": "3.8 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_10213",
    "kind": "flat",
    "name": "St. Helena Island oyster flat",
    "lat": 32.33773,
    "lng": -80.54213,
    "acres": 3.78,
    "note": "3.78 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "caperSW_00541",
    "kind": "flat",
    "name": "Cape Romain oyster flat",
    "lat": 33.05961,
    "lng": -79.37372,
    "acres": 3.66,
    "note": "3.66 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_08738",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 2",
    "lat": 32.32962,
    "lng": -80.52534,
    "acres": 3.42,
    "note": "3.42 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sthesSW_03871",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat 4",
    "lat": 32.38496,
    "lng": -80.47622,
    "acres": 3.23,
    "note": "3.23 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bulliSW_00363",
    "kind": "flat",
    "name": "Bulls Bay oyster flat 2",
    "lat": 32.92142,
    "lng": -79.60675,
    "acres": 3.08,
    "note": "3.08 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "awendSE_00245",
    "kind": "flat",
    "name": "Awendaw oyster flat 2",
    "lat": 33.0381,
    "lng": -79.50911,
    "acres": 2.82,
    "note": "2.82 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bulliSW_00007",
    "kind": "flat",
    "name": "Bulls Bay oyster flat 3",
    "lat": 32.92668,
    "lng": -79.59035,
    "acres": 2.81,
    "note": "2.81 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "capeiNW_05653",
    "kind": "flat",
    "name": "Capers Island oyster flat",
    "lat": 32.84862,
    "lng": -79.72948,
    "acres": 2.8,
    "note": "2.8 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bulliSW_00365",
    "kind": "flat",
    "name": "Bulls Bay oyster flat 4",
    "lat": 32.91567,
    "lng": -79.61801,
    "acres": 2.73,
    "note": "2.73 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "fripiNW_01458",
    "kind": "flat",
    "name": "Fripp Island oyster flat",
    "lat": 32.34488,
    "lng": -80.48985,
    "acres": 2.68,
    "note": "2.68 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_01170",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 3",
    "lat": 32.37088,
    "lng": -80.50296,
    "acres": 2.68,
    "note": "2.68 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "fmoulNE_01313",
    "kind": "flat",
    "name": "Copahee Sound oyster flat",
    "lat": 32.84265,
    "lng": -79.76255,
    "acres": 2.64,
    "note": "2.64 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sthesNW_00007",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat 5",
    "lat": 32.4989,
    "lng": -80.45703,
    "acres": 2.62,
    "note": "2.62 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "kiawiNW_01426",
    "kind": "flat",
    "name": "Kiawah River oyster flat",
    "lat": 32.61221,
    "lng": -80.10609,
    "acres": 2.6,
    "note": "2.6 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_01956",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 4",
    "lat": 32.36398,
    "lng": -80.53102,
    "acres": 2.56,
    "note": "2.56 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_03856",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 5",
    "lat": 32.35453,
    "lng": -80.51425,
    "acres": 2.39,
    "note": "2.39 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "caperSW_00097",
    "kind": "flat",
    "name": "Cape Romain oyster flat 2",
    "lat": 33.05232,
    "lng": -79.3484,
    "acres": 2.34,
    "note": "2.34 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpNE_10809",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 6",
    "lat": 32.31876,
    "lng": -80.54084,
    "acres": 2.3,
    "note": "2.3 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sewebSE_05141",
    "kind": "flat",
    "name": "Sewee Bay oyster flat",
    "lat": 32.92535,
    "lng": -79.65034,
    "acres": 2.25,
    "note": "2.25 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "mccleSE_00908",
    "kind": "flat",
    "name": "McClellanville oyster flat",
    "lat": 33.02371,
    "lng": -79.38956,
    "acres": 2.23,
    "note": "2.23 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "mccleSE_00334",
    "kind": "flat",
    "name": "McClellanville oyster flat 2",
    "lat": 33.03569,
    "lng": -79.40392,
    "acres": 2.18,
    "note": "2.18 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "legarSE_00388",
    "kind": "flat",
    "name": "Stono River oyster flat",
    "lat": 32.63682,
    "lng": -80.0247,
    "acres": 2.14,
    "note": "2.14 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bulliNE_00001",
    "kind": "flat",
    "name": "Bulls Bay oyster flat 5",
    "lat": 32.99777,
    "lng": -79.55138,
    "acres": 2.13,
    "note": "2.13 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sainpSE_00402",
    "kind": "flat",
    "name": "St. Helena Island oyster flat 7",
    "lat": 32.3018,
    "lng": -80.55975,
    "acres": 2.04,
    "note": "2.04 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "bennpSE_01263",
    "kind": "flat",
    "name": "Bennett's Point oyster flat",
    "lat": 32.50998,
    "lng": -80.40682,
    "acres": 2.01,
    "note": "2.01 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "sthesSW_03850",
    "kind": "flat",
    "name": "St. Helena Sound oyster flat 6",
    "lat": 32.38576,
    "lng": -80.49422,
    "acres": 2,
    "note": "2 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "awendSW_00190",
    "kind": "flat",
    "name": "Awendaw oyster flat 3",
    "lat": 33.00487,
    "lng": -79.57734,
    "acres": 1.95,
    "note": "1.95 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "capeiNW_06133",
    "kind": "flat",
    "name": "Capers Island oyster flat 2",
    "lat": 32.86039,
    "lng": -79.7375,
    "acres": 1.9,
    "note": "1.9 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "fmoulNE_01726",
    "kind": "flat",
    "name": "Copahee Sound oyster flat 2",
    "lat": 32.83263,
    "lng": -79.77516,
    "acres": 1.89,
    "note": "1.89 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "edisiNE_00616",
    "kind": "flat",
    "name": "Edisto Island oyster flat",
    "lat": 32.61626,
    "lng": -80.26991,
    "acres": 1.83,
    "note": "1.83 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "fripiNW_01972",
    "kind": "flat",
    "name": "Fripp Island oyster flat 2",
    "lat": 32.34956,
    "lng": -80.47907,
    "acres": 1.82,
    "note": "1.82 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "legarSW_00476",
    "kind": "flat",
    "name": "Stono River oyster flat 2",
    "lat": 32.62814,
    "lng": -80.07233,
    "acres": 1.78,
    "note": "1.78 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "mccleSE_00504",
    "kind": "flat",
    "name": "McClellanville oyster flat 3",
    "lat": 33.05493,
    "lng": -79.40868,
    "acres": 1.78,
    "note": "1.78 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "caperSW_00212",
    "kind": "flat",
    "name": "Cape Romain oyster flat 3",
    "lat": 33.04047,
    "lng": -79.36941,
    "acres": 1.75,
    "note": "1.75 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "capeiNW_06340",
    "kind": "flat",
    "name": "Capers Island oyster flat 3",
    "lat": 32.83127,
    "lng": -79.74635,
    "acres": 1.73,
    "note": "1.73 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "charlSW_00178",
    "kind": "flat",
    "name": "Charleston Harbor oyster flat",
    "lat": 32.76034,
    "lng": -79.94448,
    "acres": 1.36,
    "note": "1.36 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "jameiNE_02119",
    "kind": "flat",
    "name": "James Island oyster flat",
    "lat": 32.71562,
    "lng": -79.92895,
    "acres": 1.57,
    "note": "1.57 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "wadmiNW_02755",
    "kind": "flat",
    "name": "Wadmalaw River oyster flat",
    "lat": 32.70668,
    "lng": -80.19038,
    "acres": 0.98,
    "note": "0.98 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "adamrSE_03171",
    "kind": "flat",
    "name": "North Edisto River oyster flat",
    "lat": 32.63474,
    "lng": -80.25876,
    "acres": 1.3,
    "note": "1.3 acres. Public intertidal oyster reef from the SCDNR survey."
  },
  {
    "id": "rockvNW_03461",
    "kind": "flat",
    "name": "Rockville oyster flat",
    "lat": 32.57941,
    "lng": -80.22247,
    "acres": 1.09,
    "note": "1.09 acres. Public intertidal oyster reef from the SCDNR survey."
  }
];

export const PUBLIC_MARK_SOURCES = [
  { label: "SCDNR intertidal oyster reefs", href: "https://scdnr.maps.arcgis.com/apps/webappviewer/index.html?id=5bc898b455be43bea4a908491d2b3414" },
  { label: "SCDNR artificial reef map", href: "https://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/Marine_Artificial_Reefs_Map/FeatureServer" },
];
