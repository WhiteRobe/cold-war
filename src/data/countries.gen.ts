// 由 scripts/gen-data.ts 生成，请勿手改。数据来源：tomjefferys/twilight-struggle-rs、mihaild/DeepStruggle（MIT）。
import type { CountryDef } from './types';

export const COUNTRY_LIST: CountryDef[] = [
 {
  "id": "canada",
  "name": "Canada",
  "zh": "加拿大",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 4,
  "bg": false,
  "adj": [
   "uk",
   "usa"
  ],
  "pos": [
   180,
   145
  ],
  "start": [
   2,
   0
  ]
 },
 {
  "id": "uk",
  "name": "UK",
  "zh": "英国",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 5,
  "bg": false,
  "adj": [
   "benelux",
   "canada",
   "france",
   "norway"
  ],
  "pos": [
   345,
   115
  ],
  "start": [
   5,
   0
  ]
 },
 {
  "id": "norway",
  "name": "Norway",
  "zh": "挪威",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 4,
  "bg": false,
  "adj": [
   "sweden",
   "uk"
  ],
  "pos": [
   405,
   52
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "sweden",
  "name": "Sweden",
  "zh": "瑞典",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 4,
  "bg": false,
  "adj": [
   "denmark",
   "finland",
   "norway"
  ],
  "pos": [
   460,
   72
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "denmark",
  "name": "Denmark",
  "zh": "丹麦",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "sweden",
   "westGermany"
  ],
  "pos": [
   410,
   85
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "finland",
  "name": "Finland",
  "zh": "芬兰",
  "region": "europe",
  "sub": [
   "westernEurope",
   "easternEurope"
  ],
  "stability": 4,
  "bg": false,
  "adj": [
   "sweden",
   "ussr"
  ],
  "pos": [
   515,
   52
  ],
  "start": [
   0,
   1
  ]
 },
 {
  "id": "benelux",
  "name": "Benelux",
  "zh": "比荷卢联盟",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "uk",
   "westGermany"
  ],
  "pos": [
   370,
   148
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "westGermany",
  "name": "West Germany",
  "zh": "西德",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 4,
  "bg": true,
  "adj": [
   "austria",
   "benelux",
   "denmark",
   "eastGermany",
   "france"
  ],
  "pos": [
   425,
   148
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "france",
  "name": "France",
  "zh": "法国",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 3,
  "bg": true,
  "adj": [
   "algeria",
   "italy",
   "spainPortugal",
   "uk",
   "westGermany"
  ],
  "pos": [
   375,
   192
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "spainPortugal",
  "name": "Spain/Portugal",
  "zh": "西班牙/葡萄牙",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "france",
   "italy",
   "morocco"
  ],
  "pos": [
   345,
   235
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "italy",
  "name": "Italy",
  "zh": "意大利",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 2,
  "bg": true,
  "adj": [
   "austria",
   "france",
   "greece",
   "spainPortugal",
   "yugoslavia"
  ],
  "pos": [
   435,
   210
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "greece",
  "name": "Greece",
  "zh": "希腊",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "bulgaria",
   "italy",
   "turkey",
   "yugoslavia"
  ],
  "pos": [
   490,
   248
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "turkey",
  "name": "Turkey",
  "zh": "土耳其",
  "region": "europe",
  "sub": [
   "westernEurope"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "bulgaria",
   "greece",
   "romania",
   "syria"
  ],
  "pos": [
   565,
   218
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "austria",
  "name": "Austria",
  "zh": "奥地利",
  "region": "europe",
  "sub": [
   "westernEurope",
   "easternEurope"
  ],
  "stability": 4,
  "bg": false,
  "adj": [
   "eastGermany",
   "hungary",
   "italy",
   "westGermany"
  ],
  "pos": [
   445,
   180
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "eastGermany",
  "name": "East Germany",
  "zh": "东德",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": true,
  "adj": [
   "austria",
   "czechoslovakia",
   "poland",
   "westGermany"
  ],
  "pos": [
   445,
   115
  ],
  "start": [
   0,
   3
  ]
 },
 {
  "id": "poland",
  "name": "Poland",
  "zh": "波兰",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": true,
  "adj": [
   "czechoslovakia",
   "eastGermany",
   "ussr"
  ],
  "pos": [
   490,
   115
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "czechoslovakia",
  "name": "Czechoslovakia",
  "zh": "捷克斯洛伐克",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "eastGermany",
   "hungary",
   "poland"
  ],
  "pos": [
   485,
   148
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "hungary",
  "name": "Hungary",
  "zh": "匈牙利",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "austria",
   "czechoslovakia",
   "romania",
   "yugoslavia"
  ],
  "pos": [
   485,
   180
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "yugoslavia",
  "name": "Yugoslavia",
  "zh": "南斯拉夫",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "greece",
   "hungary",
   "italy",
   "romania"
  ],
  "pos": [
   475,
   210
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "romania",
  "name": "Romania",
  "zh": "罗马尼亚",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "hungary",
   "turkey",
   "yugoslavia",
   "ussr"
  ],
  "pos": [
   530,
   180
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "bulgaria",
  "name": "Bulgaria",
  "zh": "保加利亚",
  "region": "europe",
  "sub": [
   "easternEurope"
  ],
  "stability": 3,
  "bg": false,
  "adj": [
   "greece",
   "turkey"
  ],
  "pos": [
   525,
   210
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "lebanon",
  "name": "Lebanon",
  "zh": "黎巴嫩",
  "region": "middleEast",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "israel",
   "jordan",
   "syria"
  ],
  "pos": [
   550,
   252
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "syria",
  "name": "Syria",
  "zh": "叙利亚",
  "region": "middleEast",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "israel",
   "lebanon",
   "turkey"
  ],
  "pos": [
   590,
   252
  ],
  "start": [
   0,
   1
  ]
 },
 {
  "id": "israel",
  "name": "Israel",
  "zh": "以色列",
  "region": "middleEast",
  "sub": [],
  "stability": 4,
  "bg": true,
  "adj": [
   "egypt",
   "jordan",
   "lebanon",
   "syria"
  ],
  "pos": [
   542,
   285
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "iraq",
  "name": "Iraq",
  "zh": "伊拉克",
  "region": "middleEast",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "gulfStates",
   "iran",
   "jordan",
   "saudiArabia"
  ],
  "pos": [
   590,
   285
  ],
  "start": [
   0,
   1
  ]
 },
 {
  "id": "iran",
  "name": "Iran",
  "zh": "伊朗",
  "region": "middleEast",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "afghanistan",
   "iraq",
   "pakistan"
  ],
  "pos": [
   635,
   285
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "jordan",
  "name": "Jordan",
  "zh": "约旦",
  "region": "middleEast",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "iraq",
   "israel",
   "lebanon",
   "saudiArabia"
  ],
  "pos": [
   560,
   318
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "gulfStates",
  "name": "Gulf States",
  "zh": "海湾国家",
  "region": "middleEast",
  "sub": [],
  "stability": 3,
  "bg": false,
  "adj": [
   "iraq",
   "saudiArabia"
  ],
  "pos": [
   605,
   318
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "saudiArabia",
  "name": "Saudi Arabia",
  "zh": "沙特阿拉伯",
  "region": "middleEast",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "gulfStates",
   "iraq",
   "jordan"
  ],
  "pos": [
   600,
   350
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "egypt",
  "name": "Egypt",
  "zh": "埃及",
  "region": "middleEast",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "israel",
   "libya",
   "sudan"
  ],
  "pos": [
   515,
   318
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "libya",
  "name": "Libya",
  "zh": "利比亚",
  "region": "middleEast",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "egypt",
   "tunisia"
  ],
  "pos": [
   470,
   318
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "afghanistan",
  "name": "Afghanistan",
  "zh": "阿富汗",
  "region": "asia",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "iran",
   "pakistan",
   "ussr"
  ],
  "pos": [
   675,
   262
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "pakistan",
  "name": "Pakistan",
  "zh": "巴基斯坦",
  "region": "asia",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "afghanistan",
   "india",
   "iran"
  ],
  "pos": [
   675,
   305
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "india",
  "name": "India",
  "zh": "印度",
  "region": "asia",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "burma",
   "pakistan"
  ],
  "pos": [
   725,
   325
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "burma",
  "name": "Burma",
  "zh": "缅甸",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "india",
   "laosCambodia"
  ],
  "pos": [
   780,
   335
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "laosCambodia",
  "name": "Laos/Cambodia",
  "zh": "老挝/柬埔寨",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 1,
  "bg": false,
  "adj": [
   "burma",
   "thailand",
   "vietnam"
  ],
  "pos": [
   820,
   338
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "thailand",
  "name": "Thailand",
  "zh": "泰国",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 2,
  "bg": true,
  "adj": [
   "laosCambodia",
   "malaysia",
   "vietnam"
  ],
  "pos": [
   800,
   380
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "vietnam",
  "name": "Vietnam",
  "zh": "越南",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 1,
  "bg": false,
  "adj": [
   "laosCambodia",
   "thailand"
  ],
  "pos": [
   845,
   380
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "malaysia",
  "name": "Malaysia",
  "zh": "马来西亚",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "australia",
   "indonesia",
   "thailand"
  ],
  "pos": [
   820,
   430
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "indonesia",
  "name": "Indonesia",
  "zh": "印度尼西亚",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 1,
  "bg": false,
  "adj": [
   "malaysia",
   "philippines"
  ],
  "pos": [
   890,
   465
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "philippines",
  "name": "Philippines",
  "zh": "菲律宾",
  "region": "asia",
  "sub": [
   "southeastAsia"
  ],
  "stability": 2,
  "bg": false,
  "adj": [
   "indonesia",
   "japan"
  ],
  "pos": [
   910,
   375
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "australia",
  "name": "Australia",
  "zh": "澳大利亚",
  "region": "asia",
  "sub": [],
  "stability": 4,
  "bg": false,
  "adj": [
   "malaysia"
  ],
  "pos": [
   890,
   520
  ],
  "start": [
   4,
   0
  ]
 },
 {
  "id": "taiwan",
  "name": "Taiwan",
  "zh": "台湾",
  "region": "asia",
  "sub": [],
  "stability": 3,
  "bg": false,
  "adj": [
   "japan",
   "southKorea"
  ],
  "pos": [
   895,
   328
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "northKorea",
  "name": "North Korea",
  "zh": "朝鲜",
  "region": "asia",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "southKorea",
   "ussr"
  ],
  "pos": [
   905,
   218
  ],
  "start": [
   0,
   3
  ]
 },
 {
  "id": "southKorea",
  "name": "South Korea",
  "zh": "韩国",
  "region": "asia",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "japan",
   "northKorea",
   "taiwan"
  ],
  "pos": [
   905,
   250
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "japan",
  "name": "Japan",
  "zh": "日本",
  "region": "asia",
  "sub": [],
  "stability": 4,
  "bg": true,
  "adj": [
   "philippines",
   "southKorea",
   "taiwan",
   "usa"
  ],
  "pos": [
   945,
   280
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "morocco",
  "name": "Morocco",
  "zh": "摩洛哥",
  "region": "africa",
  "sub": [],
  "stability": 3,
  "bg": false,
  "adj": [
   "algeria",
   "spainPortugal",
   "westAfricanStates"
  ],
  "pos": [
   355,
   288
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "algeria",
  "name": "Algeria",
  "zh": "阿尔及利亚",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "france",
   "morocco",
   "saharanStates",
   "tunisia"
  ],
  "pos": [
   405,
   278
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "tunisia",
  "name": "Tunisia",
  "zh": "突尼斯",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "algeria",
   "libya"
  ],
  "pos": [
   445,
   270
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "westAfricanStates",
  "name": "West African States",
  "zh": "西非国家",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "ivoryCoast",
   "morocco"
  ],
  "pos": [
   350,
   340
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "saharanStates",
  "name": "Saharan States",
  "zh": "撒哈拉诸国",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "algeria",
   "nigeria"
  ],
  "pos": [
   430,
   340
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "sudan",
  "name": "Sudan",
  "zh": "苏丹",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "egypt",
   "ethiopia"
  ],
  "pos": [
   520,
   355
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "ivoryCoast",
  "name": "Ivory Coast",
  "zh": "科特迪瓦",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "nigeria",
   "westAfricanStates"
  ],
  "pos": [
   380,
   390
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "nigeria",
  "name": "Nigeria",
  "zh": "尼日利亚",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": true,
  "adj": [
   "cameroon",
   "ivoryCoast",
   "saharanStates"
  ],
  "pos": [
   435,
   390
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "ethiopia",
  "name": "Ethiopia",
  "zh": "埃塞俄比亚",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "somalia",
   "sudan"
  ],
  "pos": [
   550,
   390
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "somalia",
  "name": "Somalia",
  "zh": "索马里",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "ethiopia",
   "kenya"
  ],
  "pos": [
   600,
   398
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "cameroon",
  "name": "Cameroon",
  "zh": "喀麦隆",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "nigeria",
   "zaire"
  ],
  "pos": [
   455,
   428
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "zaire",
  "name": "Zaire",
  "zh": "扎伊尔",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": true,
  "adj": [
   "angola",
   "cameroon",
   "zimbabwe"
  ],
  "pos": [
   505,
   440
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "kenya",
  "name": "Kenya",
  "zh": "肯尼亚",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "seAfricanStates",
   "somalia"
  ],
  "pos": [
   555,
   430
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "angola",
  "name": "Angola",
  "zh": "安哥拉",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": true,
  "adj": [
   "botswana",
   "southAfrica",
   "zaire"
  ],
  "pos": [
   465,
   482
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "zimbabwe",
  "name": "Zimbabwe",
  "zh": "津巴布韦",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "botswana",
   "seAfricanStates",
   "zaire"
  ],
  "pos": [
   520,
   492
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "seAfricanStates",
  "name": "SE African States",
  "zh": "东南非洲诸国",
  "region": "africa",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "kenya",
   "zimbabwe"
  ],
  "pos": [
   560,
   468
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "botswana",
  "name": "Botswana",
  "zh": "博茨瓦纳",
  "region": "africa",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "angola",
   "southAfrica",
   "zimbabwe"
  ],
  "pos": [
   505,
   530
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "southAfrica",
  "name": "South Africa",
  "zh": "南非",
  "region": "africa",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "angola",
   "botswana"
  ],
  "pos": [
   485,
   570
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "mexico",
  "name": "Mexico",
  "zh": "墨西哥",
  "region": "centralAmerica",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "guatemala",
   "usa"
  ],
  "pos": [
   55,
   285
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "guatemala",
  "name": "Guatemala",
  "zh": "危地马拉",
  "region": "centralAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "elSalvador",
   "honduras",
   "mexico"
  ],
  "pos": [
   95,
   322
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "elSalvador",
  "name": "El Salvador",
  "zh": "萨尔瓦多",
  "region": "centralAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "guatemala",
   "honduras"
  ],
  "pos": [
   75,
   352
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "honduras",
  "name": "Honduras",
  "zh": "洪都拉斯",
  "region": "centralAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "costaRica",
   "elSalvador",
   "guatemala",
   "nicaragua"
  ],
  "pos": [
   125,
   352
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "costaRica",
  "name": "Costa Rica",
  "zh": "哥斯达黎加",
  "region": "centralAmerica",
  "sub": [],
  "stability": 3,
  "bg": false,
  "adj": [
   "honduras",
   "nicaragua",
   "panama"
  ],
  "pos": [
   115,
   385
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "nicaragua",
  "name": "Nicaragua",
  "zh": "尼加拉瓜",
  "region": "centralAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "costaRica",
   "cuba",
   "honduras"
  ],
  "pos": [
   165,
   352
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "panama",
  "name": "Panama",
  "zh": "巴拿马",
  "region": "centralAmerica",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "colombia",
   "costaRica"
  ],
  "pos": [
   165,
   385
  ],
  "start": [
   1,
   0
  ]
 },
 {
  "id": "cuba",
  "name": "Cuba",
  "zh": "古巴",
  "region": "centralAmerica",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "haiti",
   "nicaragua",
   "usa"
  ],
  "pos": [
   170,
   308
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "haiti",
  "name": "Haiti",
  "zh": "海地",
  "region": "centralAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "cuba",
   "dominicanRep"
  ],
  "pos": [
   210,
   340
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "dominicanRep",
  "name": "Dominican Republic",
  "zh": "多米尼加共和国",
  "region": "centralAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "haiti"
  ],
  "pos": [
   250,
   340
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "colombia",
  "name": "Colombia",
  "zh": "哥伦比亚",
  "region": "southAmerica",
  "sub": [],
  "stability": 1,
  "bg": false,
  "adj": [
   "ecuador",
   "panama",
   "venezuela"
  ],
  "pos": [
   195,
   428
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "ecuador",
  "name": "Ecuador",
  "zh": "厄瓜多尔",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "colombia",
   "peru"
  ],
  "pos": [
   145,
   435
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "peru",
  "name": "Peru",
  "zh": "秘鲁",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "bolivia",
   "chile",
   "ecuador"
  ],
  "pos": [
   168,
   472
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "venezuela",
  "name": "Venezuela",
  "zh": "委内瑞拉",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "brazil",
   "colombia"
  ],
  "pos": [
   215,
   390
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "bolivia",
  "name": "Bolivia",
  "zh": "玻利维亚",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "paraguay",
   "peru"
  ],
  "pos": [
   218,
   500
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "brazil",
  "name": "Brazil",
  "zh": "巴西",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "uruguay",
   "venezuela"
  ],
  "pos": [
   295,
   472
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "paraguay",
  "name": "Paraguay",
  "zh": "巴拉圭",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "argentina",
   "bolivia",
   "uruguay"
  ],
  "pos": [
   242,
   540
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "chile",
  "name": "Chile",
  "zh": "智利",
  "region": "southAmerica",
  "sub": [],
  "stability": 3,
  "bg": true,
  "adj": [
   "argentina",
   "peru"
  ],
  "pos": [
   192,
   540
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "argentina",
  "name": "Argentina",
  "zh": "阿根廷",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": true,
  "adj": [
   "chile",
   "paraguay",
   "uruguay"
  ],
  "pos": [
   208,
   605
  ],
  "start": [
   0,
   0
  ]
 },
 {
  "id": "uruguay",
  "name": "Uruguay",
  "zh": "乌拉圭",
  "region": "southAmerica",
  "sub": [],
  "stability": 2,
  "bg": false,
  "adj": [
   "argentina",
   "brazil",
   "paraguay"
  ],
  "pos": [
   255,
   575
  ],
  "start": [
   0,
   0
  ]
 }
];
