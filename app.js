(function () {
  "use strict";

  const STORAGE_KEY = "nckuCreditMapStateV1";

  const COURSE_CATEGORIES = ["水利必修", "通識", "自由選修", "跨域", "其他"];
  const COURSE_STATUSES = ["已修", "已抵免", "已認列", "未修", "候選", "重修"];
  const GPA_RISKS = ["低", "中", "高"];
  const COURSE_PRIORITIES = ["立即", "今年", "先補先修", "明年", "畢業前", "低", "已完成"];
  const COURSE_OFFERING_CADENCES = ["上學期", "下學期", "每學期", "不固定"];
  const DELAY_RISKS = ["低", "中", "高"];
  const SUMMER_PREP_PRIORITIES = ["A", "B", "C", "不讀"];
  const FORMAL_SCHEDULE_DECISIONS = ["是", "備選", "否"];
  const COURSE_DECISION_STATUSES = [
    "已完成",
    "115-1 優先",
    "115-1 備選",
    "115-2 預備",
    "先修未滿",
    "畢業前處理",
    "待問系辦",
  ];
  const completedStatuses = new Set(["已修", "已抵免", "已認列"]);

  function makeDefaultCourse(id, course) {
    return {
      id,
      courseName: course.courseName,
      credits: course.credits,
      category: course.category,
      status: course.status || "未修",
      semester: course.semester || "待排",
      grade: "",
      isRequired: course.isRequired ?? true,
      isBlocking: course.isBlocking ?? true,
      gpaRisk: course.gpaRisk || "中",
      retakeNeeded: false,
      note: course.note || "",
      suggestedYear: course.suggestedYear || "",
      offeredSemester: course.offeredSemester || "",
      planSemester: course.planSemester || "",
      priority: course.priority || "",
      prerequisites: course.prerequisites || "",
      schedule: course.schedule || "",
      teacher: course.teacher || "",
      planningRank: course.planningRank || 999,
      offeringCadence: course.offeringCadence || inferOfferingCadence(course.offeredSemester),
      delayRisk: course.delayRisk || inferDelayRisk(course),
      decisionStatus: course.decisionStatus || inferDecisionStatus(course),
      summerPrepPriority: course.summerPrepPriority || inferSummerPrepPriority(course),
      conflictWith: course.conflictWith || "",
      formalScheduleDecision: course.formalScheduleDecision || inferFormalScheduleDecision(course),
    };
  }

  const DEFAULT_REQUIREMENTS = {
    totalRequiredCredits: 135,
    majorRequiredCredits: 76,
    generalCredits: 28,
    electiveCredits: 31,
    crossDomainCredits: 0,
  };

  const CORE_GENERAL_REQUIRED_COURSES = [
    {
      courseName: "外國語言（英文）",
      credits: 4,
      category: "通識",
      gpaRisk: "低",
      note: "114 檢核表核心必修：語文課程之外國語言。",
    },
    {
      courseName: "大學國文（一）",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-1",
      gpaRisk: "低",
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "已抵免",
      priority: "已完成",
      schedule: "115-1 開課：[3]7~8",
      note: "你提供的 0113-1 抵(或承)通識紀錄；對應基礎國文需求。",
    },
    {
      courseName: "大學國文（二）",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-2",
      gpaRisk: "低",
      suggestedYear: "大一下",
      offeredSemester: "下",
      planSemester: "已抵免",
      priority: "已完成",
      note: "你提供的 0113-2 抵(或承)通識紀錄；對應基礎國文需求。",
    },
    {
      courseName: "踏溯台南",
      credits: 1,
      category: "通識",
      gpaRisk: "低",
      planSemester: "115-1 若有名額可補",
      priority: "今年",
      planningRank: 900,
      offeringCadence: "不固定",
      delayRisk: "低",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "不讀",
      formalScheduleDecision: "備選",
      note: "114 檢核表核心必修。",
    },
    {
      courseName: "應用物理與實驗",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-1",
      gpaRisk: "低",
      note: "你提供的 0113-1 抵(或承)通識紀錄；自然與工程科學。",
    },
    {
      courseName: "性別與社會",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-1",
      gpaRisk: "低",
      note: "你提供的 0113-1 抵(或承)通識紀錄；科際整合。",
    },
    {
      courseName: "哲學概論",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-1",
      gpaRisk: "低",
      note: "你提供的 0113-1 抵(或承)通識紀錄；人文學。",
    },
    {
      courseName: "法學緒論",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-2",
      gpaRisk: "低",
      note: "你提供的 0113-2 抵(或承)通識紀錄；社會科學。",
    },
    {
      courseName: "運動與健康",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-2",
      gpaRisk: "低",
      note: "你提供的 0113-2 抵(或承)通識紀錄；生命科學與健康。",
    },
    {
      courseName: "應用化學與實驗",
      credits: 2,
      category: "通識",
      status: "已抵免",
      semester: "113-2",
      gpaRisk: "低",
      note: "你提供的 0113-2 抵(或承)通識紀錄；自然與工程科學。檢核表註記自然與工程科學至多承認 1 門，請之後向系辦人工確認。",
    },
    {
      courseName: "領域通識（剩餘缺口）",
      credits: 6,
      category: "通識",
      gpaRisk: "低",
      note: "依目前輸入已抵免領域通識 12 學分，暫以剩餘 6 學分追蹤；自然與工程科學至多承認 1 門需人工確認。",
    },
    {
      courseName: "融合通識",
      credits: 1,
      category: "通識",
      gpaRisk: "低",
      planSemester: "115-1 若有合適課可補",
      priority: "今年",
      planningRank: 920,
      offeringCadence: "不固定",
      delayRisk: "低",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "不讀",
      formalScheduleDecision: "備選",
      note: "至少 1 學分，至多 15 學分；含通識領袖論壇、巡迴講座、專題講座、生活實踐等。",
    },
    {
      courseName: "體育（必修四學期）",
      credits: 0,
      category: "通識",
      gpaRisk: "低",
      suggestedYear: "大一至大二",
      offeredSemester: "上 / 下",
      planSemester: "尚缺 1 學期",
      priority: "今年",
      planningRank: 880,
      offeringCadence: "每學期",
      delayRisk: "中",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "不讀",
      formalScheduleDecision: "備選",
      note: "你已提供體育（一）、體育（二）、體育（三）抵免；檢核表需四學期，暫列尚未完成。",
    },
  ];

  const PROFESSIONAL_REQUIRED_COURSES = [
    {
      courseName: "工程圖學",
      credits: 2,
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "今年",
      teacher: "賴悅仁",
      schedule: "[5]5；實習 [5]6~8，水利系館 2 樓電腦教室",
      planningRank: 30,
      offeringCadence: "上學期",
      delayRisk: "中",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "B",
      conflictWith: "防洪排水工程設計",
      formalScheduleDecision: "備選",
    },
    {
      courseName: "微積分（一）",
      credits: 3,
      status: "已抵免",
      semester: "114-1",
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "已抵免",
      priority: "已完成",
      schedule: "115-1 開課：[2]5~6、[5]3；實習 [5]4",
    },
    {
      courseName: "微積分（二）",
      credits: 3,
      suggestedYear: "大一下",
      offeredSemester: "下",
      planSemester: "115-2 預估",
      priority: "明年",
      offeringCadence: "下學期",
      delayRisk: "高",
      decisionStatus: "115-2 預備",
      summerPrepPriority: "A",
      formalScheduleDecision: "否",
    },
    {
      courseName: "普通物理學（一）",
      credits: 3,
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "立即",
      teacher: "管培辰",
      schedule: "[1]8、[4]5~6，理學教學大樓 36173",
      planningRank: 10,
      offeringCadence: "上學期",
      delayRisk: "高",
      decisionStatus: "115-1 優先",
      summerPrepPriority: "A",
      conflictWith: "工程地質學",
      formalScheduleDecision: "是",
    },
    {
      courseName: "普通物理學（二）",
      credits: 3,
      suggestedYear: "大一下",
      offeredSemester: "下",
      planSemester: "115-2 預估",
      priority: "明年",
    },
    {
      courseName: "普通物理學實驗（一）",
      credits: 1,
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "立即",
      teacher: "游輝樟",
      schedule: "[3]1~3，理化大樓普物實驗室",
      planningRank: 20,
      offeringCadence: "上學期",
      delayRisk: "高",
      decisionStatus: "115-1 優先",
      summerPrepPriority: "A",
      conflictWith: "水資源工程（一）",
      formalScheduleDecision: "是",
    },
    {
      courseName: "普通物理學實驗（二）",
      credits: 1,
      suggestedYear: "大一下",
      offeredSemester: "下",
      planSemester: "115-2 預估",
      priority: "明年",
    },
    { courseName: "水文學", credits: 3, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    {
      courseName: "工程力學",
      credits: 3,
      suggestedYear: "大一下 / 大二",
      offeredSemester: "下",
      planSemester: "115-2 預估",
      priority: "明年",
      offeringCadence: "下學期",
      delayRisk: "高",
      decisionStatus: "115-2 預備",
      summerPrepPriority: "B",
      formalScheduleDecision: "否",
    },
    { courseName: "結構學（一）", credits: 3, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    {
      courseName: "海洋物理學",
      credits: 2,
      status: "已抵免",
      semester: "114-1",
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "已抵免",
      priority: "已完成",
      teacher: "董東璟",
      schedule: "115-1 開課：[4]3~4，水利系館 4620",
    },
    {
      courseName: "工程地質學",
      credits: 2,
      suggestedYear: "大二上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "今年",
      teacher: "郭玉樹",
      schedule: "[1]7~8，水利系館 4622",
      planningRank: 70,
      offeringCadence: "上學期",
      delayRisk: "中",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "C",
      conflictWith: "普通物理學（一）、水利及海洋工程概論",
      formalScheduleDecision: "備選",
    },
    {
      courseName: "工程數學（一）",
      credits: 3,
      status: "已抵免",
      semester: "114-1",
      suggestedYear: "大二上",
      offeredSemester: "上",
      planSemester: "已抵免",
      priority: "已完成",
      prerequisites: "課表列先修：微積分（二）45 分以上；你已抵免本課，仍建議向系辦確認銜接。",
      schedule: "115-1 開課：[1]2~3、[3]2，水利系館 4622",
    },
    { courseName: "工程數學（二）", credits: 3, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    {
      courseName: "流體力學（一）",
      credits: 3,
      suggestedYear: "大二上",
      offeredSemester: "上",
      planSemester: "115-1 開課但先修未滿",
      priority: "先補先修",
      prerequisites: "普通物理學（一）45 分以上",
      teacher: "戴義欽",
      schedule: "[2]2、[5]3~4，水利系館 4622",
      decisionStatus: "先修未滿",
      summerPrepPriority: "C",
      formalScheduleDecision: "否",
    },
    { courseName: "流體力學（二）", credits: 3, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年", prerequisites: "流體力學（一）" },
    {
      courseName: "流體力學實驗",
      credits: 2,
      suggestedYear: "大三上",
      offeredSemester: "上",
      planSemester: "115-1 開課但先修未滿",
      priority: "先補先修",
      prerequisites: "流體力學（一）45 分以上",
      teacher: "賴悅仁",
      schedule: "一組：[1]5~7；二組：[3]5~7，水利系館 4624",
    },
    { courseName: "測量學", credits: 2, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    { courseName: "測量學實習", credits: 1, suggestedYear: "大二下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    {
      courseName: "水資源工程（一）",
      credits: 3,
      suggestedYear: "大二上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "今年",
      teacher: "陳憲宗",
      schedule: "[2]8、[3]3~4，水利系館 4622",
      planningRank: 80,
      offeringCadence: "上學期",
      delayRisk: "中",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "C",
      conflictWith: "普通物理學實驗（一）",
      formalScheduleDecision: "備選",
    },
    {
      courseName: "材料力學",
      credits: 2,
      suggestedYear: "大二上",
      offeredSemester: "上",
      planSemester: "115-1 開課但先修未滿",
      priority: "先補先修",
      prerequisites: "工程力學 60 分以上",
      teacher: "羅偉誠",
      schedule: "[4]5~6，水利系館 4622",
    },
    {
      courseName: "明渠水力學",
      credits: 3,
      suggestedYear: "大三上",
      offeredSemester: "上",
      planSemester: "115-1 開課但先修未滿",
      priority: "先補先修",
      prerequisites: "流體力學（一）50 分以上",
      teacher: "詹錢登",
      schedule: "[4]2~4，水利系館 4625",
    },
    {
      courseName: "波浪力學",
      credits: 3,
      suggestedYear: "大三上",
      offeredSemester: "上",
      planSemester: "115-1 開課但先修未滿",
      priority: "先補先修",
      prerequisites: "流體力學（一）50 分以上",
      teacher: "吳昀達",
      schedule: "[2]6、[3]3~4，水利系館 4625",
    },
    { courseName: "海岸海洋工程（一）", credits: 3, suggestedYear: "大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    { courseName: "工程統計學", credits: 3, suggestedYear: "大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    { courseName: "土壤力學", credits: 3, suggestedYear: "大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    { courseName: "土壤力學實驗", credits: 1, suggestedYear: "大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年", prerequisites: "土壤力學" },
    { courseName: "鋼筋混凝土學", credits: 2, suggestedYear: "大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "明年" },
    { courseName: "專題研究（一）", credits: 1, suggestedYear: "大四上 / 大三下", offeredSemester: "下", planSemester: "115-2 預估", priority: "畢業前" },
    {
      courseName: "專題研究（二）",
      credits: 1,
      suggestedYear: "大四上",
      offeredSemester: "上",
      planSemester: "115-1 開課但不建議先修",
      priority: "畢業前",
      teacher: "羅偉誠",
      schedule: "[4]N，水利系館 4627",
      decisionStatus: "畢業前處理",
      summerPrepPriority: "不讀",
      formalScheduleDecision: "否",
    },
  ];

  const DESIGN_REQUIRED_COURSE_NAMES = ["防洪排水工程設計", "水資源工程設計", "海洋工程設計", "海岸工程設計"];
  const DESIGN_REQUIRED_CREDITS = 4;
  const REQUIRED_ELECTIVE_COURSE_NAME = "水利及海洋工程概論";
  const REQUIRED_ELECTIVE_CREDITS = 1;
  const CONFLICT_MATRIX = [
    {
      courseA: "普通物理學（一）",
      timeA: "一 8",
      courseB: "工程地質學",
      timeB: "一 7-8",
      conclusion: "不能同修",
    },
    {
      courseA: "普通物理學實驗（一）",
      timeA: "三 1-3",
      courseB: "水資源工程（一）",
      timeB: "三 3-4",
      conclusion: "不能同修",
    },
    {
      courseA: "工程圖學",
      timeA: "五 5-8",
      courseB: "防洪排水工程設計",
      timeB: "五 6-8",
      conclusion: "不同修",
    },
    {
      courseA: "水利及海洋工程概論",
      timeA: "一 7",
      courseB: "工程地質學",
      timeB: "一 7-8",
      conclusion: "不能同修",
    },
    {
      courseA: "水利及海洋工程概論",
      timeA: "一 7",
      courseB: "海洋工程設計",
      timeB: "一 6-8",
      conclusion: "不能同修",
    },
  ];
  const SUMMER_PREP_PLAN = [
    {
      courseName: "普通物理學（一）",
      likelihood: "高",
      reason: "基礎課，後面流力會卡。",
      prepGoal: "力學、向量、牛頓定律、能量。",
      weeklyLoad: "每週 3 次",
    },
    {
      courseName: "普通物理學實驗（一）",
      likelihood: "高",
      reason: "搭配普物。",
      prepGoal: "了解誤差、作圖、實驗報告格式。",
      weeklyLoad: "每週 1 次",
    },
    {
      courseName: "工程圖學",
      likelihood: "中高",
      reason: "115-1 可修。",
      prepGoal: "熟悉製圖、投影、基本 CAD。",
      weeklyLoad: "每週 1-2 次",
    },
    {
      courseName: "工程地質學",
      likelihood: "中",
      reason: "會衝堂，未必修。",
      prepGoal: "只看基本名詞，不深讀。",
      weeklyLoad: "每週 0-1 次",
    },
    {
      courseName: "水資源工程（一）",
      likelihood: "中",
      reason: "會衝普物實驗。",
      prepGoal: "只了解水文循環、流量基本概念。",
      weeklyLoad: "每週 0-1 次",
    },
    {
      courseName: "微積分（二）",
      likelihood: "高但 115-2",
      reason: "之後會卡數學基礎。",
      prepGoal: "積分技巧、級數、向量微積分。",
      weeklyLoad: "每週 2-3 次",
    },
    {
      courseName: "工程力學",
      likelihood: "中高但 115-2",
      reason: "後面材料力學會卡。",
      prepGoal: "靜力平衡、力矩、自由體圖。",
      weeklyLoad: "每週 1-2 次",
    },
  ];

  const DEFAULT_COURSES = [
    ...CORE_GENERAL_REQUIRED_COURSES.map((course, index) => makeDefaultCourse(`core-${index + 1}`, course)),
    ...PROFESSIONAL_REQUIRED_COURSES.map((course, index) =>
      makeDefaultCourse(`professional-${index + 1}`, {
        ...course,
        category: "水利必修",
        note: "114 檢核表專業必修；第一次修課須為本系所開課程。",
      }),
    ),
    ...DESIGN_REQUIRED_COURSE_NAMES.map((courseName, index) =>
      makeDefaultCourse(`design-${index + 1}`, {
        courseName,
        credits: 2,
        category: "水利必修",
        isRequired: false,
        isBlocking: false,
        suggestedYear: "大四",
        offeredSemester: courseName === "海洋工程設計" || courseName === "防洪排水工程設計" ? "上" : "下 / 不確定",
        planSemester:
          courseName === "海洋工程設計" || courseName === "防洪排水工程設計" ? "115-1 可修" : "115-2 預估",
        priority: "畢業前",
        teacher: courseName === "海洋工程設計" ? "楊瑞源" : courseName === "防洪排水工程設計" ? "張駿暉" : "",
        schedule:
          courseName === "海洋工程設計"
            ? "[1]6；實習 [1]7~8，水利系館 4627"
            : courseName === "防洪排水工程設計"
              ? "[5]6；實習 [5]7~8，水利系館 4627"
              : "",
        offeringCadence:
          courseName === "海洋工程設計" || courseName === "防洪排水工程設計" ? "上學期" : "不固定",
        delayRisk: "低",
        decisionStatus: "畢業前處理",
        summerPrepPriority: "不讀",
        conflictWith:
          courseName === "海洋工程設計"
            ? "水利及海洋工程概論"
            : courseName === "防洪排水工程設計"
              ? "工程圖學"
              : "",
        formalScheduleDecision: "否",
        note: "設計必修任選二科，共需 4 學分；若超過二科，額外課程請改列選修。",
      }),
    ),
    makeDefaultCourse("required-elective-1", {
      courseName: REQUIRED_ELECTIVE_COURSE_NAME,
      credits: REQUIRED_ELECTIVE_CREDITS,
      category: "水利必修",
      gpaRisk: "低",
      suggestedYear: "大一上",
      offeredSemester: "上",
      planSemester: "115-1 可修",
      priority: "今年",
      teacher: "孫建平",
      schedule: "[1]7，水利系館 4620",
      planningRank: 40,
      offeringCadence: "上學期",
      delayRisk: "中",
      decisionStatus: "115-1 備選",
      summerPrepPriority: "不讀",
      conflictWith: "工程地質學、海洋工程設計",
      formalScheduleDecision: "備選",
      note: "114 檢核表必選修；須有修課紀錄。",
    }),
    makeDefaultCourse("threshold-english", {
      courseName: "英語畢業門檻",
      credits: 0,
      category: "其他",
      gpaRisk: "低",
      note: "符合基本門檻標準 B2，或完成「補強英文」課程；0 學分但會卡畢業。",
    }),
  ];

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toCredits(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function toBoolean(value) {
    return value === true || value === "true" || value === "on" || value === 1 || value === "1";
  }

  function inferOfferingCadence(offeredSemester) {
    const value = String(offeredSemester || "").trim();
    if (value.includes("上") && value.includes("下")) return "每學期";
    if (value.includes("上")) return "上學期";
    if (value.includes("下")) return "下學期";
    return "不固定";
  }

  function inferDelayRisk(course) {
    const source = course || {};
    if (source.delayRisk && DELAY_RISKS.includes(source.delayRisk)) return source.delayRisk;
    if (source.priority === "立即" || source.priority === "先補先修" || source.isBlocking === true) return "高";
    if (source.priority === "今年" || source.priority === "明年" || source.isRequired !== false) return "中";
    return "低";
  }

  function inferDecisionStatus(course) {
    const source = course || {};
    if (source.decisionStatus && COURSE_DECISION_STATUSES.includes(source.decisionStatus)) return source.decisionStatus;
    if (completedStatuses.has(source.status)) return "已完成";
    if (source.priority === "立即") return "115-1 優先";
    if (source.priority === "今年" && source.planSemester === "115-1 可修") return "115-1 備選";
    if (source.priority === "先補先修") return "先修未滿";
    if (source.priority === "明年" || String(source.planSemester || "").includes("115-2")) return "115-2 預備";
    if (source.priority === "畢業前") return "畢業前處理";
    return "待問系辦";
  }

  function inferSummerPrepPriority(course) {
    const source = course || {};
    if (source.summerPrepPriority && SUMMER_PREP_PRIORITIES.includes(source.summerPrepPriority)) {
      return source.summerPrepPriority;
    }
    if (source.priority === "立即") return "A";
    if (source.priority === "今年" || source.priority === "明年") return "B";
    if (source.priority === "先補先修") return "C";
    return "不讀";
  }

  function inferFormalScheduleDecision(course) {
    const source = course || {};
    if (source.formalScheduleDecision && FORMAL_SCHEDULE_DECISIONS.includes(source.formalScheduleDecision)) {
      return source.formalScheduleDecision;
    }
    if (source.priority === "立即") return "是";
    if (source.priority === "今年" && source.planSemester === "115-1 可修") return "備選";
    return "否";
  }

  function normalizeRequirements(requirements) {
    const source = requirements || {};
    return {
      totalRequiredCredits: toCredits(source.totalRequiredCredits ?? DEFAULT_REQUIREMENTS.totalRequiredCredits),
      majorRequiredCredits: toCredits(source.majorRequiredCredits ?? DEFAULT_REQUIREMENTS.majorRequiredCredits),
      generalCredits: toCredits(source.generalCredits ?? DEFAULT_REQUIREMENTS.generalCredits),
      electiveCredits: toCredits(source.electiveCredits ?? DEFAULT_REQUIREMENTS.electiveCredits),
      crossDomainCredits: toCredits(source.crossDomainCredits ?? DEFAULT_REQUIREMENTS.crossDomainCredits),
    };
  }

  function normalizeCourse(course) {
    const source = course || {};
    return {
      id: String(source.id || createId()),
      courseName: String(source.courseName || "").trim(),
      credits: toCredits(source.credits),
      category: COURSE_CATEGORIES.includes(source.category) ? source.category : "其他",
      status: COURSE_STATUSES.includes(source.status) ? source.status : "未修",
      semester: String(source.semester || "").trim(),
      grade: String(source.grade || "").trim(),
      isRequired: toBoolean(source.isRequired),
      isBlocking: toBoolean(source.isBlocking),
      gpaRisk: GPA_RISKS.includes(source.gpaRisk) ? source.gpaRisk : "低",
      retakeNeeded: toBoolean(source.retakeNeeded),
      note: String(source.note || "").trim(),
      suggestedYear: String(source.suggestedYear || "").trim(),
      offeredSemester: String(source.offeredSemester || "").trim(),
      planSemester: String(source.planSemester || "").trim(),
      priority: COURSE_PRIORITIES.includes(source.priority) ? source.priority : "",
      prerequisites: String(source.prerequisites || "").trim(),
      schedule: String(source.schedule || "").trim(),
      teacher: String(source.teacher || "").trim(),
      planningRank: toCredits(source.planningRank) || 999,
      offeringCadence: COURSE_OFFERING_CADENCES.includes(source.offeringCadence)
        ? source.offeringCadence
        : inferOfferingCadence(source.offeredSemester),
      delayRisk: DELAY_RISKS.includes(source.delayRisk) ? source.delayRisk : inferDelayRisk(source),
      decisionStatus: COURSE_DECISION_STATUSES.includes(source.decisionStatus)
        ? source.decisionStatus
        : inferDecisionStatus(source),
      summerPrepPriority: SUMMER_PREP_PRIORITIES.includes(source.summerPrepPriority)
        ? source.summerPrepPriority
        : inferSummerPrepPriority(source),
      conflictWith: String(source.conflictWith || "").trim(),
      formalScheduleDecision: FORMAL_SCHEDULE_DECISIONS.includes(source.formalScheduleDecision)
        ? source.formalScheduleDecision
        : inferFormalScheduleDecision(source),
    };
  }

  function cloneDefaultCourses() {
    return DEFAULT_COURSES.map((course) => normalizeCourse(course));
  }

  function isCompletedCourse(course) {
    return completedStatuses.has(course.status);
  }

  function sumCredits(courses) {
    return courses.reduce((total, course) => total + toCredits(course.credits), 0);
  }

  function completedCreditsForCategory(courses, category) {
    return sumCredits(courses.filter((course) => isCompletedCourse(course) && course.category === category));
  }

  function completedCreditsForCourseNames(courses, courseNames) {
    const names = new Set(courseNames);
    return sumCredits(courses.filter((course) => isCompletedCourse(course) && names.has(course.courseName)));
  }

  function yesNo(value) {
    return value ? "是" : "否";
  }

  function displayValue(value) {
    if (typeof value === "boolean") return yesNo(value);
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  }

  function getCourseTableSummary(course) {
    const normalized = normalizeCourse(course);
    return {
      courseName: normalized.courseName,
      credits: normalized.credits,
      category: normalized.category,
      status: normalized.status,
      decisionStatus: normalized.decisionStatus,
      gpaRisk: normalized.gpaRisk,
      delayRisk: normalized.delayRisk,
      formalScheduleDecision: normalized.formalScheduleDecision,
      hasConflict: normalized.conflictWith ? "有" : "-",
    };
  }

  function getCourseDetailRows(course) {
    const normalized = normalizeCourse(course);
    return [
      ["學期", displayValue(normalized.semester)],
      ["成績", displayValue(normalized.grade)],
      ["必修", yesNo(normalized.isRequired)],
      ["卡畢業", yesNo(normalized.isBlocking)],
      ["重修", yesNo(normalized.retakeNeeded)],
      ["建議修課時間", displayValue(normalized.suggestedYear)],
      ["開課節奏", displayValue(normalized.offeringCadence)],
      ["預計/可修學期", displayValue(normalized.planSemester)],
      ["優先順序", displayValue(normalized.priority)],
      ["暑假預習優先度", displayValue(normalized.summerPrepPriority)],
      ["先修限制", displayValue(normalized.prerequisites)],
      ["上課時間", displayValue(normalized.schedule)],
      ["教師", displayValue(normalized.teacher)],
      ["衝堂對象", displayValue(normalized.conflictWith)],
      ["備註", displayValue(normalized.note)],
    ];
  }

  function calculateSpecialRuleGaps(courses) {
    const normalizedCourses = courses.map(normalizeCourse);
    const designCompletedCredits = Math.min(
      completedCreditsForCourseNames(normalizedCourses, DESIGN_REQUIRED_COURSE_NAMES),
      DESIGN_REQUIRED_CREDITS,
    );
    const requiredElectiveCompletedCredits = Math.min(
      completedCreditsForCourseNames(normalizedCourses, [REQUIRED_ELECTIVE_COURSE_NAME]),
      REQUIRED_ELECTIVE_CREDITS,
    );
    const gaps = [];

    if (designCompletedCredits < DESIGN_REQUIRED_CREDITS) {
      gaps.push({
        label: "設計必修（任選二科）",
        completedCredits: designCompletedCredits,
        requiredCredits: DESIGN_REQUIRED_CREDITS,
        remainingCredits: DESIGN_REQUIRED_CREDITS - designCompletedCredits,
        note: DESIGN_REQUIRED_COURSE_NAMES.join("、"),
      });
    }

    if (requiredElectiveCompletedCredits < REQUIRED_ELECTIVE_CREDITS) {
      gaps.push({
        label: `必選修：${REQUIRED_ELECTIVE_COURSE_NAME}`,
        completedCredits: requiredElectiveCompletedCredits,
        requiredCredits: REQUIRED_ELECTIVE_CREDITS,
        remainingCredits: REQUIRED_ELECTIVE_CREDITS - requiredElectiveCompletedCredits,
        note: "須有修課紀錄。",
      });
    }

    return gaps;
  }

  function isCurrentTermCourse(course) {
    return course.planSemester === "115-1 可修";
  }

  function sortByPlanningRank(courses) {
    return [...courses].sort((a, b) => {
      if (a.planningRank !== b.planningRank) return a.planningRank - b.planningRank;
      return a.courseName.localeCompare(b.courseName, "zh-Hant");
    });
  }

  function calculatePlanningAnalysis(courses) {
    const normalizedCourses = courses.map(normalizeCourse);
    return {
      currentTermPriority: sortByPlanningRank(
        normalizedCourses.filter(
          (course) =>
            !isCompletedCourse(course) &&
            isCurrentTermCourse(course) &&
            (course.priority === "立即" || course.priority === "今年"),
        ),
      ),
      prerequisiteBlocked: sortByPlanningRank(
        normalizedCourses.filter((course) => !isCompletedCourse(course) && course.priority === "先補先修"),
      ),
      completedPlanningItems: sortByPlanningRank(
        normalizedCourses.filter((course) => isCompletedCourse(course) && course.priority === "已完成"),
      ),
    };
  }

  function calculateCandidateCourses1151(courses) {
    const decisionStatuses = new Set(["115-1 優先", "115-1 備選", "待問系辦"]);
    return sortByPlanningRank(
      courses
        .map(normalizeCourse)
        .filter(
          (course) =>
            !isCompletedCourse(course) &&
            decisionStatuses.has(course.decisionStatus) &&
            course.formalScheduleDecision !== "否",
        ),
    );
  }

  function calculateSummerPrepPlan(courses) {
    const normalizedCourses = courses.map(normalizeCourse);
    const courseByName = new Map(normalizedCourses.map((course) => [course.courseName, course]));
    return SUMMER_PREP_PLAN.filter((item) => courseByName.has(item.courseName)).map((item) => ({
      ...item,
      course: courseByName.get(item.courseName),
    }));
  }

  function calculateDashboard(courses, requirements) {
    const normalizedRequirements = normalizeRequirements(requirements);
    const normalizedCourses = courses.map(normalizeCourse);
    const completedCourses = normalizedCourses.filter(isCompletedCourse);
    const completedCredits = sumCredits(completedCourses);

    return {
      totalRequiredCredits: normalizedRequirements.totalRequiredCredits,
      completedCredits,
      remainingCredits: Math.max(normalizedRequirements.totalRequiredCredits - completedCredits, 0),
      majorRequiredCompletedCredits: completedCreditsForCategory(normalizedCourses, "水利必修"),
      generalCompletedCredits: completedCreditsForCategory(normalizedCourses, "通識"),
      electiveCompletedCredits: completedCreditsForCategory(normalizedCourses, "自由選修"),
      crossDomainCompletedCredits: completedCreditsForCategory(normalizedCourses, "跨域"),
      highRiskCount: normalizedCourses.filter((course) => course.gpaRisk === "高").length,
      blockingCount: normalizedCourses.filter((course) => course.isBlocking).length,
    };
  }

  function calculateGapAnalysis(courses, requirements) {
    const normalizedRequirements = normalizeRequirements(requirements);
    const normalizedCourses = courses.map(normalizeCourse);
    const completedCredits = sumCredits(normalizedCourses.filter(isCompletedCourse));

    const categoryRemainingCredits = {
      水利必修: Math.max(
        normalizedRequirements.majorRequiredCredits - completedCreditsForCategory(normalizedCourses, "水利必修"),
        0,
      ),
      通識: Math.max(normalizedRequirements.generalCredits - completedCreditsForCategory(normalizedCourses, "通識"), 0),
      自由選修: Math.max(
        normalizedRequirements.electiveCredits - completedCreditsForCategory(normalizedCourses, "自由選修"),
        0,
      ),
      跨域: Math.max(
        normalizedRequirements.crossDomainCredits - completedCreditsForCategory(normalizedCourses, "跨域"),
        0,
      ),
    };

    return {
      totalRemainingCredits: Math.max(normalizedRequirements.totalRequiredCredits - completedCredits, 0),
      categoryRemainingCredits,
      unfinishedRequiredCourses: normalizedCourses.filter((course) => course.isRequired && !isCompletedCourse(course)),
      highRiskCourses: normalizedCourses.filter((course) => course.gpaRisk === "高"),
      blockingCourses: normalizedCourses.filter((course) => course.isBlocking),
      septemberCandidateCourses: normalizedCourses.filter(
        (course) =>
          course.status === "候選" ||
          course.decisionStatus === "115-1 優先" ||
          course.decisionStatus === "115-1 備選",
      ),
      specialRuleGaps: calculateSpecialRuleGaps(normalizedCourses),
    };
  }

  function categoryRequiredCredits(requirements, category) {
    if (category === "水利必修") return requirements.majorRequiredCredits;
    if (category === "通識") return requirements.generalCredits;
    if (category === "自由選修") return requirements.electiveCredits;
    if (category === "跨域") return requirements.crossDomainCredits;
    return 0;
  }

  function makeGapCourseItem(course) {
    const normalized = normalizeCourse(course);
    return {
      title: normalized.courseName,
      credits: normalized.credits,
      status: normalized.status,
      decisionStatus: normalized.decisionStatus,
      meta: [normalized.category, `${normalized.credits} 學分`, normalized.planSemester || normalized.semester]
        .filter(Boolean)
        .join("｜"),
      tone: badgeTone(normalized.gpaRisk === "高" || normalized.delayRisk === "高" ? "高" : normalized.decisionStatus),
    };
  }

  function makeSpecialRuleItem(gap) {
    return {
      title: gap.label,
      credits: gap.remainingCredits,
      status: "缺口",
      decisionStatus: "待問系辦",
      meta: `尚缺 ${gap.remainingCredits} 學分｜${gap.note}`,
      tone: "warning",
    };
  }

  function buildGapAnalysisViewModel(courses, requirements) {
    const normalizedRequirements = normalizeRequirements(requirements);
    const normalizedCourses = courses.map(normalizeCourse);
    const dashboard = calculateDashboard(normalizedCourses, normalizedRequirements);
    const gaps = calculateGapAnalysis(normalizedCourses, normalizedRequirements);
    const planning = calculatePlanningAnalysis(normalizedCourses);
    const categories = ["水利必修", "通識", "自由選修", "跨域"];

    return {
      summaryCards: [
        {
          label: "畢業總缺口",
          value: dashboard.remainingCredits,
          unit: "學分",
          detail: `已完成 ${dashboard.completedCredits} / ${dashboard.totalRequiredCredits} 學分`,
          tone: dashboard.remainingCredits > 0 ? "warning" : "success",
        },
        {
          label: "水利必修缺口",
          value: gaps.categoryRemainingCredits["水利必修"],
          unit: "學分",
          detail: `已完成 ${dashboard.majorRequiredCompletedCredits} / ${normalizedRequirements.majorRequiredCredits} 學分`,
          tone: gaps.categoryRemainingCredits["水利必修"] > 0 ? "danger" : "success",
        },
        {
          label: "通識缺口",
          value: gaps.categoryRemainingCredits["通識"],
          unit: "學分",
          detail: `已完成 ${dashboard.generalCompletedCredits} / ${normalizedRequirements.generalCredits} 學分`,
          tone: gaps.categoryRemainingCredits["通識"] > 0 ? "warning" : "success",
        },
        {
          label: "卡關 / 高風險",
          value: dashboard.blockingCount + dashboard.highRiskCount,
          unit: "項",
          detail: `卡關 ${dashboard.blockingCount}｜高風險 ${dashboard.highRiskCount}`,
          tone: dashboard.blockingCount + dashboard.highRiskCount > 0 ? "danger" : "success",
        },
      ],
      categoryRows: categories.map((category) => {
        const requiredCredits = categoryRequiredCredits(normalizedRequirements, category);
        const completedCredits = completedCreditsForCategory(normalizedCourses, category);
        const remainingCredits = gaps.categoryRemainingCredits[category];
        return {
          category,
          completedCredits,
          requiredCredits,
          remainingCredits,
          progressPercent: requiredCredits > 0 ? Math.min(Math.round((completedCredits / requiredCredits) * 100), 100) : 0,
        };
      }),
      actionSections: [
        {
          title: "尚未修完的必修",
          emptyText: "目前沒有尚未完成的必修。",
          items: gaps.unfinishedRequiredCourses.map(makeGapCourseItem),
        },
        {
          title: "GPA 高風險課",
          emptyText: "目前沒有 GPA 高風險課。",
          items: gaps.highRiskCourses.map(makeGapCourseItem),
        },
        {
          title: "卡畢業課",
          emptyText: "目前沒有標記卡畢業課。",
          items: gaps.blockingCourses.map(makeGapCourseItem),
        },
        {
          title: "115-1 候選課",
          emptyText: "目前沒有 115-1 候選課。",
          items: gaps.septemberCandidateCourses.map(makeGapCourseItem),
        },
        {
          title: "特殊規則缺口",
          emptyText: "設計必修與必選修規則目前沒有缺口。",
          items: gaps.specialRuleGaps.map(makeSpecialRuleItem),
        },
        {
          title: "先修未滿",
          emptyText: "目前沒有因先修限制而暫緩的 115-1 課。",
          items: planning.prerequisiteBlocked.map(makeGapCourseItem),
        },
      ],
    };
  }

  function applyFilters(courses, filters) {
    const activeFilters = filters || {};
    return courses.map(normalizeCourse).filter((course) => {
      if (activeFilters.category && course.category !== activeFilters.category) return false;
      if (activeFilters.status && course.status !== activeFilters.status) return false;
      if (activeFilters.decisionStatus && course.decisionStatus !== activeFilters.decisionStatus) return false;
      if (activeFilters.gpaRisk && course.gpaRisk !== activeFilters.gpaRisk) return false;
      if (activeFilters.isBlocking && String(course.isBlocking) !== activeFilters.isBlocking) return false;
      if (activeFilters.isRequired && String(course.isRequired) !== activeFilters.isRequired) return false;
      return true;
    });
  }

  function csvEscape(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportCoursesToCsv(courses) {
    const columns = [
      ["課名", "courseName"],
      ["學分", "credits"],
      ["類別", "category"],
      ["狀態", "status"],
      ["學期", "semester"],
      ["成績", "grade"],
      ["必修", "isRequired"],
      ["卡畢業", "isBlocking"],
      ["GPA 風險", "gpaRisk"],
      ["重修", "retakeNeeded"],
      ["建議修課時間", "suggestedYear"],
      ["開課節奏", "offeringCadence"],
      ["延後風險", "delayRisk"],
      ["決策狀態", "decisionStatus"],
      ["暑假預習優先度", "summerPrepPriority"],
      ["衝堂對象", "conflictWith"],
      ["是否放入正式課表", "formalScheduleDecision"],
      ["預計/可修學期", "planSemester"],
      ["優先順序", "priority"],
      ["先修限制", "prerequisites"],
      ["上課時間", "schedule"],
      ["教師", "teacher"],
      ["備註", "note"],
    ];
    const rows = [columns.map(([label]) => label).join(",")];
    courses.map(normalizeCourse).forEach((course) => {
      rows.push(
        columns
          .map(([, key]) => {
            const value = typeof course[key] === "boolean" ? (course[key] ? "是" : "否") : course[key];
            return csvEscape(value);
          })
          .join(","),
      );
    });
    return `\uFEFF${rows.join("\n")}`;
  }

  function serializeBackup(courses, requirements) {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        requirements: normalizeRequirements(requirements),
        courses: courses.map(normalizeCourse),
      },
      null,
      2,
    );
  }

  function parseBackupPayload(payload) {
    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!parsed || !Array.isArray(parsed.courses)) {
      throw new Error("JSON 需要包含 courses 陣列。");
    }
    return {
      requirements: normalizeRequirements(parsed.requirements),
      courses: parsed.courses.map(normalizeCourse),
    };
  }

  const logic = {
    COURSE_CATEGORIES,
    COURSE_STATUSES,
    GPA_RISKS,
    COURSE_PRIORITIES,
    COURSE_OFFERING_CADENCES,
    DELAY_RISKS,
    SUMMER_PREP_PRIORITIES,
    FORMAL_SCHEDULE_DECISIONS,
    COURSE_DECISION_STATUSES,
    DEFAULT_REQUIREMENTS,
    DEFAULT_COURSES,
    CONFLICT_MATRIX,
    SUMMER_PREP_PLAN,
    CORE_GENERAL_REQUIRED_COURSES,
    PROFESSIONAL_REQUIRED_COURSES,
    DESIGN_REQUIRED_COURSE_NAMES,
    completedStatuses,
    normalizeCourse,
    normalizeRequirements,
    calculateDashboard,
    calculateGapAnalysis,
    buildGapAnalysisViewModel,
    calculateSpecialRuleGaps,
    calculatePlanningAnalysis,
    calculateCandidateCourses1151,
    calculateSummerPrepPlan,
    getCourseTableSummary,
    getCourseDetailRows,
    applyFilters,
    exportCoursesToCsv,
    serializeBackup,
    parseBackupPayload,
  };

  globalThis.CreditMapLogic = logic;

  if (typeof document === "undefined") {
    return;
  }

  let courses = [];
  let requirements = normalizeRequirements(DEFAULT_REQUIREMENTS);
  let editingCourseId = null;

  const elements = {};

  function getStorage() {
    try {
      return globalThis.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function loadState() {
    const storage = getStorage();
    if (!storage) {
      courses = cloneDefaultCourses();
      requirements = normalizeRequirements(DEFAULT_REQUIREMENTS);
      return;
    }

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      courses = cloneDefaultCourses();
      requirements = normalizeRequirements(DEFAULT_REQUIREMENTS);
      saveState();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      courses = Array.isArray(parsed.courses) ? parsed.courses.map(normalizeCourse) : cloneDefaultCourses();
      requirements = normalizeRequirements(parsed.requirements);
    } catch (error) {
      courses = cloneDefaultCourses();
      requirements = normalizeRequirements(DEFAULT_REQUIREMENTS);
      saveState();
    }
  }

  function saveState() {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        requirements: normalizeRequirements(requirements),
        courses: courses.map(normalizeCourse),
      }),
    );
  }

  function optionList(options, includeAllLabel) {
    const allOption = includeAllLabel ? `<option value="">${includeAllLabel}</option>` : "";
    return `${allOption}${options.map((option) => `<option value="${option}">${option}</option>`).join("")}`;
  }

  function cacheElements() {
    elements.requirementsForm = document.querySelector("#requirementsForm");
    elements.requirementsStatus = document.querySelector("#requirementsStatus");
    elements.dashboard = document.querySelector("#dashboard");
    elements.courseForm = document.querySelector("#courseForm");
    elements.courseFormMode = document.querySelector("#courseFormMode");
    elements.courseSubmitButton = document.querySelector("#courseSubmitButton");
    elements.cancelEditButton = document.querySelector("#cancelEditButton");
    elements.filtersForm = document.querySelector("#filtersForm");
    elements.courseTableBody = document.querySelector("#courseTableBody");
    elements.visibleCount = document.querySelector("#visibleCount");
    elements.totalCount = document.querySelector("#totalCount");
    elements.gapSummary = document.querySelector("#gapSummary");
    elements.categoryGapRows = document.querySelector("#categoryGapRows");
    elements.gapActionSections = document.querySelector("#gapActionSections");
    elements.candidate1151TableBody = document.querySelector("#candidate1151TableBody");
    elements.conflictMatrixTableBody = document.querySelector("#conflictMatrixTableBody");
    elements.summerPrepTableBody = document.querySelector("#summerPrepTableBody");
    elements.exportJsonButton = document.querySelector("#exportJsonButton");
    elements.exportCsvButton = document.querySelector("#exportCsvButton");
    elements.resetOfficialDefaultsButton = document.querySelector("#resetOfficialDefaultsButton");
    elements.importJsonInput = document.querySelector("#importJsonInput");
    elements.importExportStatus = document.querySelector("#importExportStatus");
  }

  function hydrateSelects() {
    elements.courseForm.elements.category.innerHTML = optionList(COURSE_CATEGORIES);
    elements.courseForm.elements.status.innerHTML = optionList(COURSE_STATUSES);
    elements.courseForm.elements.gpaRisk.innerHTML = optionList(GPA_RISKS);
    elements.courseForm.elements.priority.innerHTML = optionList(COURSE_PRIORITIES, "未設定");
    elements.courseForm.elements.offeringCadence.innerHTML = optionList(COURSE_OFFERING_CADENCES);
    elements.courseForm.elements.delayRisk.innerHTML = optionList(DELAY_RISKS);
    elements.courseForm.elements.decisionStatus.innerHTML = optionList(COURSE_DECISION_STATUSES);
    elements.courseForm.elements.summerPrepPriority.innerHTML = optionList(SUMMER_PREP_PRIORITIES);
    elements.courseForm.elements.formalScheduleDecision.innerHTML = optionList(FORMAL_SCHEDULE_DECISIONS);
    elements.filtersForm.elements.category.innerHTML = optionList(COURSE_CATEGORIES, "全部");
    elements.filtersForm.elements.status.innerHTML = optionList(COURSE_STATUSES, "全部");
    elements.filtersForm.elements.decisionStatus.innerHTML = optionList(COURSE_DECISION_STATUSES, "全部");
    elements.filtersForm.elements.gpaRisk.innerHTML = optionList(GPA_RISKS, "全部");
  }

  function setRequirementsFormValues() {
    Object.entries(requirements).forEach(([key, value]) => {
      if (elements.requirementsForm.elements[key]) {
        elements.requirementsForm.elements[key].value = value;
      }
    });
  }

  function readRequirementsForm() {
    const data = new FormData(elements.requirementsForm);
    return normalizeRequirements(Object.fromEntries(data.entries()));
  }

  function readCourseForm() {
    const form = elements.courseForm;
    return normalizeCourse({
      id: form.elements.id.value || undefined,
      courseName: form.elements.courseName.value,
      credits: form.elements.credits.value,
      category: form.elements.category.value,
      status: form.elements.status.value,
      semester: form.elements.semester.value,
      grade: form.elements.grade.value,
      isRequired: form.elements.isRequired.checked,
      isBlocking: form.elements.isBlocking.checked,
      gpaRisk: form.elements.gpaRisk.value,
      retakeNeeded: form.elements.retakeNeeded.checked,
      note: form.elements.note.value,
      suggestedYear: form.elements.suggestedYear.value,
      offeredSemester: form.elements.offeredSemester.value,
      planSemester: form.elements.planSemester.value,
      priority: form.elements.priority.value,
      offeringCadence: form.elements.offeringCadence.value,
      delayRisk: form.elements.delayRisk.value,
      decisionStatus: form.elements.decisionStatus.value,
      summerPrepPriority: form.elements.summerPrepPriority.value,
      conflictWith: form.elements.conflictWith.value,
      formalScheduleDecision: form.elements.formalScheduleDecision.value,
      prerequisites: form.elements.prerequisites.value,
      schedule: form.elements.schedule.value,
      teacher: form.elements.teacher.value,
    });
  }

  function fillCourseForm(course) {
    const normalized = normalizeCourse(course);
    const form = elements.courseForm;
    form.elements.id.value = normalized.id;
    form.elements.courseName.value = normalized.courseName;
    form.elements.credits.value = normalized.credits;
    form.elements.category.value = normalized.category;
    form.elements.status.value = normalized.status;
    form.elements.semester.value = normalized.semester;
    form.elements.grade.value = normalized.grade;
    form.elements.isRequired.checked = normalized.isRequired;
    form.elements.isBlocking.checked = normalized.isBlocking;
    form.elements.gpaRisk.value = normalized.gpaRisk;
    form.elements.retakeNeeded.checked = normalized.retakeNeeded;
    form.elements.note.value = normalized.note;
    form.elements.suggestedYear.value = normalized.suggestedYear;
    form.elements.offeredSemester.value = normalized.offeredSemester;
    form.elements.planSemester.value = normalized.planSemester;
    form.elements.priority.value = normalized.priority;
    form.elements.offeringCadence.value = normalized.offeringCadence;
    form.elements.delayRisk.value = normalized.delayRisk;
    form.elements.decisionStatus.value = normalized.decisionStatus;
    form.elements.summerPrepPriority.value = normalized.summerPrepPriority;
    form.elements.conflictWith.value = normalized.conflictWith;
    form.elements.formalScheduleDecision.value = normalized.formalScheduleDecision;
    form.elements.prerequisites.value = normalized.prerequisites;
    form.elements.schedule.value = normalized.schedule;
    form.elements.teacher.value = normalized.teacher;
    editingCourseId = normalized.id;
    elements.courseFormMode.textContent = `目前模式：編輯「${normalized.courseName}」`;
    elements.courseSubmitButton.textContent = "儲存修改";
    elements.cancelEditButton.hidden = false;
    form.elements.courseName.focus();
  }

  function resetCourseForm() {
    elements.courseForm.reset();
    elements.courseForm.elements.id.value = "";
    elements.courseForm.elements.credits.value = "3";
    elements.courseForm.elements.category.value = "水利必修";
    elements.courseForm.elements.status.value = "未修";
    elements.courseForm.elements.gpaRisk.value = "低";
    elements.courseForm.elements.priority.value = "";
    elements.courseForm.elements.offeringCadence.value = "不固定";
    elements.courseForm.elements.delayRisk.value = "低";
    elements.courseForm.elements.decisionStatus.value = "待問系辦";
    elements.courseForm.elements.summerPrepPriority.value = "不讀";
    elements.courseForm.elements.conflictWith.value = "";
    elements.courseForm.elements.formalScheduleDecision.value = "否";
    editingCourseId = null;
    elements.courseFormMode.textContent = "目前模式：新增課程";
    elements.courseSubmitButton.textContent = "新增課程";
    elements.cancelEditButton.hidden = true;
  }

  function readFilters() {
    return Object.fromEntries(new FormData(elements.filtersForm).entries());
  }

  function setFilters(filters) {
    const next = {
      category: "",
      status: "",
      decisionStatus: "",
      gpaRisk: "",
      isBlocking: "",
      isRequired: "",
      ...filters,
    };
    Object.entries(next).forEach(([key, value]) => {
      elements.filtersForm.elements[key].value = value;
    });
    render();
  }

  function renderDashboard() {
    const dashboard = calculateDashboard(courses, requirements);
    const metrics = [
      ["畢業總學分需求", dashboard.totalRequiredCredits],
      ["已完成學分", dashboard.completedCredits],
      ["尚缺學分", dashboard.remainingCredits, "warning"],
      ["水利必修已完成學分", dashboard.majorRequiredCompletedCredits],
      ["通識已完成學分", dashboard.generalCompletedCredits],
      ["自由選修已完成學分", dashboard.electiveCompletedCredits],
      ["跨域課程已完成學分", dashboard.crossDomainCompletedCredits],
      ["高風險課程數量", dashboard.highRiskCount, "danger"],
      ["卡關課程數量", dashboard.blockingCount, "danger"],
    ];

    elements.dashboard.replaceChildren(
      ...metrics.map(([label, value, tone]) => {
        const card = document.createElement("div");
        card.className = `metric ${tone || ""}`.trim();
        const title = document.createElement("strong");
        title.textContent = label;
        const number = document.createElement("span");
        number.textContent = value;
        card.append(title, number);
        return card;
      }),
    );
  }

  function booleanText(value) {
    return yesNo(value);
  }

  function badgeTone(value) {
    if (value === "高" || value === "有" || value === "先修未滿") return "danger";
    if (value === "中" || value === "備選" || value === "115-1 備選" || value === "115-2 預備") return "warning";
    if (value === "低" || value === "已完成" || value === "是" || value === "115-1 優先") return "success";
    if (value === "待問系辦" || value === "否") return "muted";
    return "";
  }

  function appendTextCell(row, value, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = value || "-";
    row.append(cell);
  }

  function appendBadgeCell(row, value) {
    const cell = document.createElement("td");
    if (!value || value === "-") {
      cell.textContent = "-";
      row.append(cell);
      return;
    }
    const badge = document.createElement("span");
    badge.className = `badge ${badgeTone(value)}`.trim();
    badge.textContent = value;
    cell.append(badge);
    row.append(cell);
  }

  function renderCourseTable() {
    const filteredCourses = applyFilters(courses, readFilters());
    elements.visibleCount.textContent = filteredCourses.length;
    elements.totalCount.textContent = courses.length;
    elements.courseTableBody.replaceChildren();

    if (filteredCourses.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = "目前沒有符合篩選條件的課程。";
      row.append(cell);
      elements.courseTableBody.append(row);
      return;
    }

    filteredCourses.forEach((course) => {
      const row = document.createElement("tr");
      row.className = "course-summary-row";
      const summary = getCourseTableSummary(course);
      appendTextCell(row, summary.courseName, "course-name-cell");
      appendTextCell(row, summary.credits);
      appendTextCell(row, summary.category);
      appendBadgeCell(row, summary.status);
      appendBadgeCell(row, summary.decisionStatus);
      appendBadgeCell(row, summary.gpaRisk);
      appendBadgeCell(row, summary.delayRisk);
      appendBadgeCell(row, summary.formalScheduleDecision);
      appendBadgeCell(row, summary.hasConflict);

      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className = "secondary";
      detailButton.dataset.action = "toggle-details";
      detailButton.dataset.id = course.id;
      detailButton.setAttribute("aria-expanded", "false");
      detailButton.textContent = "詳情";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.dataset.id = course.id;
      editButton.textContent = "編輯";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = course.id;
      deleteButton.textContent = "刪除";
      actions.append(detailButton, editButton, deleteButton);
      actionsCell.append(actions);
      row.append(actionsCell);

      elements.courseTableBody.append(row);

      const detailRow = document.createElement("tr");
      detailRow.className = "course-detail-row";
      detailRow.dataset.detailsFor = course.id;
      detailRow.hidden = true;
      const detailCell = document.createElement("td");
      detailCell.colSpan = 10;
      const detailGrid = document.createElement("dl");
      detailGrid.className = "detail-grid";
      getCourseDetailRows(course).forEach(([label, value]) => {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        detailGrid.append(item);
      });
      detailCell.append(detailGrid);
      detailRow.append(detailCell);
      elements.courseTableBody.append(detailRow);
    });
  }

  function renderCourseList(target, list, emptyText) {
    target.replaceChildren();
    if (list.length === 0) {
      const item = document.createElement("li");
      item.textContent = emptyText;
      target.append(item);
      return;
    }
    list.forEach((course) => {
      const item = document.createElement("li");
      const parts = [
        `${course.credits} 學分`,
        course.status || "未標示",
        course.decisionStatus,
        course.semester || "未排學期",
        course.planSemester,
        course.priority ? `優先：${course.priority}` : "",
      ].filter(Boolean);
      item.textContent = `${course.courseName}（${parts.join("｜")}）`;
      target.append(item);
    });
  }

  function renderTableRows(tableBody, rows, columns, emptyText) {
    tableBody.replaceChildren();
    if (rows.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = columns.length;
      cell.textContent = emptyText;
      row.append(cell);
      tableBody.append(row);
      return;
    }

    rows.forEach((item) => {
      const row = document.createElement("tr");
      columns.forEach((column) => {
        const cell = document.createElement("td");
        const value = typeof column.value === "function" ? column.value(item) : item[column.value];
        cell.textContent = value || "-";
        row.append(cell);
      });
      tableBody.append(row);
    });
  }

  function renderCandidate1151Table() {
    renderTableRows(
      elements.candidate1151TableBody,
      calculateCandidateCourses1151(courses),
      [
        { value: "courseName" },
        { value: "credits" },
        { value: "decisionStatus" },
        { value: "planSemester" },
        { value: "schedule" },
        { value: "conflictWith" },
        { value: "formalScheduleDecision" },
      ],
      "目前沒有 115-1 候選課。",
    );
  }

  function renderConflictMatrixTable() {
    renderTableRows(
      elements.conflictMatrixTableBody,
      CONFLICT_MATRIX,
      [
        { value: "courseA" },
        { value: "timeA" },
        { value: "courseB" },
        { value: "timeB" },
        { value: "conclusion" },
      ],
      "目前沒有衝堂紀錄。",
    );
  }

  function renderSummerPrepTable() {
    renderTableRows(
      elements.summerPrepTableBody,
      calculateSummerPrepPlan(courses),
      [
        { value: "courseName" },
        { value: "likelihood" },
        { value: "reason" },
        { value: "prepGoal" },
        { value: "weeklyLoad" },
      ],
      "目前沒有暑假預習項目。",
    );
  }

  function renderGapAnalysis() {
    const view = buildGapAnalysisViewModel(courses, requirements);
    elements.gapSummary.replaceChildren(
      ...view.summaryCards.map((card) => {
        const node = document.createElement("div");
        node.className = `gap-summary-item ${card.tone}`.trim();
        const label = document.createElement("span");
        label.textContent = card.label;
        const value = document.createElement("strong");
        value.textContent = card.value;
        const unit = document.createElement("small");
        unit.textContent = card.unit;
        const detail = document.createElement("p");
        detail.textContent = card.detail;
        node.append(label, value, unit, detail);
        return node;
      }),
    );

    elements.categoryGapRows.replaceChildren(
      ...view.categoryRows.map((row) => {
        const item = document.createElement("div");
        item.className = "gap-progress-row";
        const header = document.createElement("div");
        header.className = "gap-progress-header";
        const category = document.createElement("strong");
        category.textContent = row.category;
        const numbers = document.createElement("span");
        numbers.textContent = `已完成 ${row.completedCredits} / ${row.requiredCredits}，尚缺 ${row.remainingCredits}`;
        header.append(category, numbers);

        const track = document.createElement("div");
        track.className = "progress-track";
        const bar = document.createElement("span");
        bar.style.width = `${row.progressPercent}%`;
        track.append(bar);

        item.append(header, track);
        return item;
      }),
    );

    elements.gapActionSections.replaceChildren(
      ...view.actionSections.map((section) => {
        const panel = document.createElement("section");
        panel.className = "gap-action-section";
        const heading = document.createElement("div");
        heading.className = "gap-action-heading";
        const title = document.createElement("h4");
        title.textContent = section.title;
        const count = document.createElement("span");
        count.className = "badge";
        count.textContent = `${section.items.length} 項`;
        heading.append(title, count);
        panel.append(heading);

        if (section.items.length === 0) {
          const empty = document.createElement("p");
          empty.className = "gap-empty";
          empty.textContent = section.emptyText;
          panel.append(empty);
          return panel;
        }

        const list = document.createElement("div");
        list.className = "gap-item-list";
        section.items.forEach((item) => {
          const row = document.createElement("div");
          row.className = "gap-item";
          const content = document.createElement("div");
          const name = document.createElement("strong");
          name.textContent = item.title;
          const meta = document.createElement("span");
          meta.textContent = item.meta;
          content.append(name, meta);

          const status = document.createElement("span");
          status.className = `badge ${item.tone || ""}`.trim();
          status.textContent = item.status || item.decisionStatus || "待處理";
          row.append(content, status);
          list.append(row);
        });
        panel.append(list);
        return panel;
      }),
    );
  }

  function render() {
    setRequirementsFormValues();
    renderDashboard();
    renderCourseTable();
    renderCandidate1151Table();
    renderConflictMatrixTable();
    renderSummerPrepTable();
    renderGapAnalysis();
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    elements.requirementsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      requirements = readRequirementsForm();
      saveState();
      render();
      elements.requirementsStatus.textContent = "學分需求已儲存。";
    });

    elements.courseForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextCourse = readCourseForm();
      if (!nextCourse.courseName) return;

      if (editingCourseId) {
        courses = courses.map((course) => (course.id === editingCourseId ? nextCourse : course));
      } else {
        courses = [...courses, { ...nextCourse, id: createId() }];
      }
      saveState();
      resetCourseForm();
      render();
    });

    elements.cancelEditButton.addEventListener("click", resetCourseForm);

    elements.filtersForm.addEventListener("change", render);

    document.querySelector(".quick-filters").addEventListener("click", (event) => {
      const preset = event.target.dataset.preset;
      if (!preset) return;
      if (preset === "unfinished-required") setFilters({ status: "未修", isRequired: "true" });
      if (preset === "high-risk") setFilters({ gpaRisk: "高" });
      if (preset === "candidate") setFilters({ decisionStatus: "115-1 優先" });
      if (preset === "backup-candidate") setFilters({ decisionStatus: "115-1 備選" });
      if (preset === "prerequisite-blocked") setFilters({ decisionStatus: "先修未滿" });
      if (preset === "blocking") setFilters({ isBlocking: "true" });
      if (preset === "reset") setFilters({});
    });

    elements.courseTableBody.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      const id = event.target.dataset.id;
      if (!action || !id) return;
      const targetCourse = courses.find((course) => course.id === id);
      if (!targetCourse) return;

      if (action === "toggle-details") {
        const detailRow = [...elements.courseTableBody.querySelectorAll(".course-detail-row")].find(
          (row) => row.dataset.detailsFor === id,
        );
        if (!detailRow) return;
        const isOpen = !detailRow.hidden;
        detailRow.hidden = isOpen;
        event.target.setAttribute("aria-expanded", String(!isOpen));
        event.target.textContent = isOpen ? "詳情" : "收合";
        return;
      }

      if (action === "edit") {
        fillCourseForm(targetCourse);
        window.scrollTo({ top: elements.courseForm.offsetTop - 20, behavior: "smooth" });
      }

      if (action === "delete" && window.confirm(`確定刪除「${targetCourse.courseName}」？`)) {
        courses = courses.filter((course) => course.id !== id);
        saveState();
        if (editingCourseId === id) resetCourseForm();
        render();
      }
    });

    elements.exportJsonButton.addEventListener("click", () => {
      downloadText("ncku-credit-map-backup.json", serializeBackup(courses, requirements), "application/json;charset=utf-8");
      elements.importExportStatus.textContent = "已匯出 JSON 備份。";
    });

    elements.exportCsvButton.addEventListener("click", () => {
      downloadText("ncku-credit-map-courses.csv", exportCoursesToCsv(courses), "text/csv;charset=utf-8");
      elements.importExportStatus.textContent = "已匯出 CSV。";
    });

    elements.resetOfficialDefaultsButton.addEventListener("click", () => {
      if (!window.confirm("確定要用 114 學年度檢核表預設資料取代目前資料？建議先匯出 JSON 備份。")) {
        return;
      }
      courses = cloneDefaultCourses();
      requirements = normalizeRequirements(DEFAULT_REQUIREMENTS);
      saveState();
      resetCourseForm();
      setFilters({});
      elements.importExportStatus.textContent = "已載入 114 學年度檢核表預設資料。";
    });

    elements.importJsonInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          const imported = parseBackupPayload(reader.result);
          courses = imported.courses;
          requirements = imported.requirements;
          saveState();
          resetCourseForm();
          render();
          elements.importExportStatus.textContent = `已匯入 ${courses.length} 門課程。`;
        } catch (error) {
          elements.importExportStatus.textContent = `匯入失敗：${error.message}`;
        } finally {
          event.target.value = "";
        }
      });
      reader.readAsText(file, "utf-8");
    });
  }

  function init() {
    cacheElements();
    hydrateSelects();
    loadState();
    resetCourseForm();
    bindEvents();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
