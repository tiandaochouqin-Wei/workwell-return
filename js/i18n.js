/* ============================================================
   i18n.js — lightweight bilingual layer (English + 中文).
   Dictionary is keyed by the English string, so views can wrap
   existing literals with WW.t('...'). Missing keys fall back to
   English. Add a language by adding a map below.
   ============================================================ */
(function (WW) {
  'use strict';

  var ZH = {
    // shell / nav
    'Research prototype': '研究原型', 'Participant': '参与者', 'Researcher': '研究人员',
    'Home': '首页', 'Check-in': '打卡', 'Progress': '进度', 'Plan': '计划', 'More': '更多',
    'Goals': '目标', 'Questionnaires': '问卷', 'Surveys': '问卷', 'Reminders': '提醒',
    'Overview': '概览', 'Analytics': '分析', 'Compare': '对比', 'Engagement': '参与度',
    'Participants': '参与者', 'Study': '研究管理',
    'Skip to content': '跳到内容',
    // disclaimer
    'Not medical advice. ': '非医疗建议。',
    'A reflection & tracking tool — not a diagnosis or treatment.': '一个反思与记录工具——不提供诊断或治疗。',
    'WorkWell Return helps you reflect and track. It does not diagnose, treat, or replace advice from a healthcare professional. If you feel unwell or unsafe, contact a professional.': 'WorkWell Return 帮助你反思与记录。它不进行诊断、治疗,也不能替代专业医疗建议。如果你感到不适或不安全,请联系专业人员。',
    // common buttons / labels
    'Cancel': '取消', 'Save': '保存', 'Add': '添加', 'Delete': '删除', 'Edit': '编辑', 'Done': '完成',
    'Next →': '下一步 →', '← Back': '← 上一步', 'Check in': '去打卡', 'Save check-in': '保存打卡',
    'Range': '范围', 'From': '从', 'To': '到', 'All': '全部',
    // conditions
    'Mental health': '心理健康', 'Musculoskeletal': '肌肉骨骼', 'Both': '两者', 'Prefer not to say': '不愿透露',
    // symptoms
    'Pain / physical discomfort': '疼痛 / 身体不适', 'Fatigue / low energy': '疲劳 / 精力低下',
    'Low mood': '情绪低落', 'Anxiety / stress': '焦虑 / 压力', 'Sleep problems': '睡眠问题',
    'Concentration difficulty': '注意力困难',
    // barriers
    'Pain or physical limits': '疼痛或身体限制', 'Fatigue / low energy': '疲劳 / 精力低下',
    'Low mood': '情绪低落', 'Anxiety or stress': '焦虑或压力', 'Poor sleep': '睡眠不佳',
    'Difficulty concentrating': '注意力难以集中', 'High workload': '工作量大', 'Long / hard commute': '通勤远 / 费力',
    'Lack of flexible hours': '缺乏弹性工时', 'Unclear expectations': '期望不清晰',
    'Strained work relationships': '工作关系紧张', 'Low confidence': '信心不足',
    // activity types
    'Work': '工作', 'Household': '家务', 'Exercise': '运动', 'Social': '社交', 'Rest / recovery': '休息 / 恢复',
    'Hobby': '爱好', 'Errands / admin': '杂务 / 事务', 'Appointment': '就诊 / 预约',
    // coping categories
    'Pacing': '节律', 'Mind': '心理', 'Body': '身体',
    // frequencies / arms
    'Daily': '每日', 'Weekly': '每周', 'Intervention': '干预组', 'Control': '对照组',
    // questionnaire names
    'Return-to-Work Self-Efficacy': '返岗自我效能', 'Work Ability (short, adapted)': '工作能力(简版·改编)',
    'Depression screening (PHQ-9)': '抑郁筛查(PHQ-9)', 'Anxiety screening (GAD-7)': '焦虑筛查(GAD-7)',
    'Pain & interference (PEG-3)': '疼痛与影响(PEG-3)',
    // participant page titles / hub
    'Hi there 👋': '你好 👋',
    'All your WorkWell Return tools in one place.': '你的所有 WorkWell Return 工具都在这里。',
    'Activity & pacing diary': '活动与节律日记', 'Graded return planner': '渐进式返岗计划',
    'Coping toolbox': '应对策略工具箱', 'Insights': '洞察', 'Share a report': '分享报告',
    'Reminders & settings': '提醒与设置', 'Appearance & language': '外观与语言',

    // researcher page titles + subtitles
    'Researcher overview': '研究者概览', 'Aggregated, anonymised view of the participant cohort.': '参与者队列的匿名汇总视图。',
    'Exploratory, descriptive analyses of the matched cohort.': '对匹配队列的探索性描述分析。',
    'Engagement & retention': '参与度与留存', 'Who is active, and who may be at risk of dropping out.': '谁在活跃,谁可能有流失风险。',
    'Click a participant to drill into their anonymised trends.': '点击某位参与者以查看其匿名趋势。',
    'Compare groups': '分组对比', 'Study management': '研究管理',
    'Assign study arms and manage enrolment. Affects the “by study arm” analytics.': '分配研究分组并管理招募;会影响"按研究分组"的分析。',
    // researcher card titles
    'Filters': '筛选', 'Cohort trend (weekly means)': '队列趋势(每周均值)', 'Condition breakdown': '病种构成',
    'Top reported barriers': '最常报告的障碍', 'Cohort adherence': '队列依从率',
    'Work ability vs. symptom burden': '工作能力 vs 症状负担', 'Distribution of work ability': '工作能力分布',
    'Intervention vs. control': '干预组 vs 对照组', 'Group statistics': '分组统计',
    'Active participants per week': '每周活跃人数', 'Participant engagement': '参与者参与情况', 'Event timeline': '事件时间线',
    'Mean scores by condition': '按病种的平均分', 'Mean scores by study arm': '按研究分组的平均分',
    'Weekly work ability by condition': '按病种的每周工作能力', 'Weekly work ability by study arm': '按研究分组的每周工作能力',
    'Cohort statistics grouped by condition.': '按病种汇总的队列统计。', 'Cohort statistics grouped by study arm.': '按研究分组汇总的队列统计。',
    // stat labels
    'Check-ins': '打卡数', 'Mean work ability': '平均工作能力', 'Mean symptom burden': '平均症状负担',
    'Active this week': '本周活跃', 'Mean adherence': '平均依从率', 'At risk': '有风险', 'Enrolled': '已招募', 'Withdrawn': '已退出',
    'Work ability': '工作能力', 'Symptom burden': '症状负担', 'Readiness': '准备度', 'Check-in streak': '连续打卡',
    'Avg work ability': '平均工作能力', 'Avg symptom burden': '平均症状负担', 'Streak': '连续', 'Activities': '活动数', 'Avg energy after': '事后平均精力',
    // hints
    'Most recent first.': '最新在前。', 'Means ±SD across matched participants in the selected range.': '所选范围内匹配参与者的均值 ±标准差。',
    'Each point is one check-in. Dashed line = linear fit.': '每个点为一次打卡;虚线为线性拟合。',
    'Descriptive only — demo data, not significance testing.': '仅描述性——演示数据,非显著性检验。',
    '“Actual” comes from Work activities in your diary.': '"实际"来自日记中的"工作"活动。',
    'How often each barrier was reported in this range.': '该范围内每种障碍被报告的次数。',
    'Change a participant’s arm with the toggle, or withdraw/re-enroll.': '用切换按钮更改分组,或退出/重新招募。',
    // participant subtitles
    'Your progress': '你的进度', 'How your work ability, symptoms and readiness change over time.': '你的工作能力、症状与准备度随时间的变化。',
    'Small, realistic steps toward a sustainable return to work.': '迈向可持续返岗的细小而现实的步骤。',
    'Optional standardized self-report scales to complement your check-ins.': '可选的标准化自评量表,作为打卡的补充。',
    'Track what you do and how it leaves you — to find a sustainable pace.': '记录你做了什么、之后感觉如何——找到可持续的节律。',
    'Plan a gradual, sustainable increase in work hours.': '规划循序渐进、可持续的工时增加。',
    'Practical self-management ideas to try, then keep what helps.': '值得尝试的自我管理方法,保留有用的。',
    'Gentle reflections from your own data — not a clinical assessment.': '来自你自己数据的温和反思——非临床评估。',
    'A structured summary you can print or share with a clinician or manager.': '可打印或分享给医生/经理的结构化摘要。',
    'Return-to-work plan': '返岗计划',
    // participant card titles
    'Active goals': '进行中的目标', 'Quick actions': '快捷操作', 'This week': '本周', 'Recent check-in': '最近打卡',
    'Your return journey': '你的返岗旅程', 'Plan progress': '计划进度', 'Work ability & readiness': '工作能力与准备度',
    'Symptom burden (average)': '症状负担(平均)', 'Symptoms in detail': '症状细分', 'Most frequent barriers': '最常见的障碍',
    'Questionnaire scores': '问卷分数', 'Time by activity (last 7 days)': '各活动用时(近7天)',
    'Pacing: effort vs. energy afterwards': '节律:用力 vs 事后精力', 'Recent activities': '最近的活动',
    'Your toolbox': '你的工具箱', 'Achievements': '成就', 'Patterns': '规律', 'Start your plan': '开始你的计划',
    'Planned vs. actual weekly hours': '计划 vs 实际每周工时', 'Check-in schedule': '打卡安排', 'Notifications': '通知',
    'About your data': '关于你的数据', 'Build your report': '生成你的报告', 'Barriers to working': '工作障碍', 'Reflection': '反思',
    'Plan progress': '计划进度', 'Goals': '目标',
    // band labels
    'Minimal': '极轻微', 'Mild': '轻度', 'Moderate': '中度', 'Moderately severe': '中重度', 'Severe': '重度', 'Lower': '较低', 'Higher': '较高',
    // empties
    'No data.': '暂无数据。', 'No data in range.': '该范围内暂无数据。', 'No participants match the current filter.': '没有符合当前筛选的参与者。',
    'No goals recorded.': '未记录目标。', 'No activities logged yet.': '尚未记录活动。', 'No barriers reported.': '未报告障碍。',
    'No check-ins in this range.': '该范围内没有打卡。', 'Not enough data for a scatter plot.': '散点图数据不足。', 'Not enough data yet.': '数据尚不足。',
    // buttons
    '⬇ Export…': '⬇ 导出…', '⚖️ Balance arms': '⚖️ 均衡分组', '← Back to participants': '← 返回参与者列表',
    'Withdraw': '退出', 'Re-enroll': '重新招募', 'By condition': '按病种', 'By study arm': '按研究分组',
    'Active': '活跃', '⬇ Export summary': '⬇ 导出汇总',
    // table headers
    'Condition': '病种', 'Arm': '分组', 'Adherence': '依从率', 'Avg ability': '平均能力', 'Avg readiness': '平均准备度',
    'Last entry': '最近记录', 'Status': '状态', 'Study arm': '研究分组', 'Measure': '指标', 'Interv.': '干预', 'Diff': '差值',
    'Avg ability ±SD': '平均能力 ±SD', 'Avg burden ±SD': '平均负担 ±SD', 'Action': '操作', 'Last check-in': '最近打卡',
    // anon note + filters
    'Anonymised view. ': '匿名视图。', 'Participants are shown by coded ID only — no names or contact details are stored. Demo data.': '仅以编码 ID 显示参与者——不存储姓名或联系方式。演示数据。',
    'Time range': '时间范围', 'Min check-ins': '最少打卡数', 'Group to export': '导出分组', 'Theme': '主题', 'Accent colour': '强调色',
    // questionnaire UI
    'Last completed': '上次完成于', 'Not completed yet': '尚未完成', 'Take again': '再次填写', 'Take questionnaire': '填写问卷',
    'Please reach out for support. ': '请寻求支持。', 'A self-report score — not a clinical assessment.': '自评分数——非临床评估。',
    'complete ✓': '完成 ✓', 'Screening bands suggest possible severity only — they are not a diagnosis.': '分级仅提示可能的严重程度,并非诊断。',
    'Back to questionnaires': '返回问卷列表', 'Update responses': '更新作答', 'Submit': '提交',
    // data source (API) settings
    'Data source': '数据源', 'Demo (local)': '演示(本地)', 'REST API': 'REST 接口', 'API base URL': 'API 基础地址',
    'Access token (optional)': '访问令牌(可选)', 'Reload from source': '从数据源重新载入', 'Test connection': '测试连接',
    'Connected': '已连接', 'Connection failed': '连接失败', 'Using local demo data.': '正在使用本地演示数据。',
    'Export chart': '导出图表', 'Download PNG': '下载 PNG', 'Print / PDF': '打印 / PDF',
    // command palette + notifications
    'Search actions, pages, participants…': '搜索操作、页面、参与者…', 'Do a check-in': '去打卡',
    'Notifications': '通知', 'You’re all caught up.': '暂无新通知。', 'Your check-in is due.': '你的打卡到期了。',
    'Goal due soon': '目标即将到期', 'Try the questionnaire': '试试问卷',
    'participants at risk of dropout': '位参与者有流失风险', 'withdrawn participant(s)': '位已退出参与者',
    // resources
    'Resources': '资源', 'Short, practical reading to support your return to work.': '支持你返岗的简短实用读物。',
    'Library': '资料库', 'read': '已读', 'min': '分钟', 'Read': '已读', 'Mark as read': '标记为已读',
    'Marked as read': '已标记为已读', 'Marked unread': '已标记为未读', 'General information, not medical advice.': '一般信息,非医疗建议。',
    'Short reading on pacing, sleep, stress and returning to work.': '关于节律、睡眠、压力与返岗的简短读物。', 'Not found.': '未找到。',
    'Sleep': '睡眠', 'Stress': '压力', 'Returning to work': '返岗', 'Support': '支持',
    // calendar + correlation
    'Less': '较少', 'More activity': '更多活动', 'Check-in calendar': '打卡日历',
    'Check-ins and activities over recent weeks.': '近几周的打卡与活动。',
    'Correlation between measures': '各指标间的相关性',
    'Each cell is a Pearson correlation (−1 to 1) across all check-ins.': '每格为所有打卡上的皮尔逊相关(−1 到 1)。',
    'Not enough data.': '数据不足。',
    // profile
    'Your profile': '你的资料', 'Profile': '资料', 'Situation': '状况', 'Job role': '职业', 'Work setup': '工作方式',
    'Usual weekly hours': '每周常规工时', 'On sick leave since': '病假开始于', 'Target return date': '目标返岗日期',
    'Changes are saved automatically and reflected across your dashboard and report.': '更改会自动保存,并同步到你的仪表盘与报告。',
    // help / about
    'Help & about': '帮助与关于', 'About': '关于', 'Privacy & your data': '隐私与你的数据', 'Questionnaires & scales': '问卷与量表',
    'Keyboard shortcuts': '键盘快捷键', 'Credits': '致谢', 'Install app': '安装应用', 'Take a tour': '快速导览',
    'Instrument': '工具', 'Name': '名称', 'Items': '题数', 'Scoring': '计分', 'Range': '范围',
    'No names are collected — you are a coded ID': '不收集姓名——你是一个编码 ID',
    'Data is stored in your browser, or your configured backend. Demo data only.': '数据存储在你的浏览器或你配置的后端;仅演示数据。',
    'Export a full backup, restore, or reset your data in Reminders & settings.': '可在"提醒与设置"中导出完整备份、恢复或重置数据。',
    'Work ability & readiness: 0–10 (higher = better). Symptoms: 0–10 (higher = worse). Symptom burden = mean of the symptom items.': '工作能力与准备度:0–10(越高越好);症状:0–10(越高越差);症状负担 = 各症状的平均值。',
    'Open command palette': '打开命令面板', 'Close dialog / palette': '关闭对话框 / 面板', 'Navigate & run palette items': '移动并执行面板项',
    // accessibility
    'Text size': '文字大小', 'Normal': '正常', 'Large': '大', 'Extra large': '特大', 'High contrast': '高对比度', 'Off': '关', 'On': '开', 'Reduce motion': '减少动效',
    // backup
    'Backup & data': '备份与数据', 'Export a full backup, or restore from a backup file.': '导出完整备份,或从备份文件恢复。',
    'Export backup (JSON)': '导出备份(JSON)', 'Restore from file': '从文件恢复',
    // tour
    'Search pages, actions and participants (⌘/Ctrl+K).': '搜索页面、操作与参与者(⌘/Ctrl+K)。', 'Your notifications and nudges appear here.': '你的通知与提醒会出现在这里。',
    'Switch between the participant app and the researcher dashboard.': '在参与者应用与研究者面板间切换。', 'Switch language: English / 中文.': '切换语言:English / 中文。',
    'Light or dark theme.': '浅色或深色主题。', 'Move between the main sections here.': '在此切换主要板块。', 'Skip': '跳过', 'Next': '下一步', 'Done': '完成',
    // login / account
    'Account': '账户', 'Sign in': '登录', 'Sign in to continue': '登录以继续', 'Sign in as': '登录身份',
    'Participant ID': '参与者 ID', 'Passcode': '口令', 'Demo — any passcode works': '演示——任意口令均可',
    'Demo only — no real authentication. Any passcode works.': '仅演示——无真实身份验证;任意口令均可。',
    'Signed in': '已登录', 'Signed in as researcher.': '已以研究人员身份登录。', 'Signed in as': '已登录为',
    'Switch to researcher view': '切换到研究者视图', 'Switch to participant view': '切换到参与者视图', 'Log out': '退出登录',
    // customizable dashboard
    'Customize': '自定义', 'Hide': '隐藏', 'Add widgets': '添加组件', 'All widgets are shown.': '所有组件均已显示。',
    'Key stats': '关键指标', 'Return journey': '返岗旅程', 'Activities': '活动',
    'Over your last few check-ins, work ability is': '最近几次打卡中,你的工作能力变化为',
    'You are up to date.': '你已是最新状态。', 'Your check-in is overdue.': '你的打卡已逾期。',
    'days to target': '天到目标', 'target reached': '已到目标', 'Keep checking in to see insights.': '继续打卡即可看到洞察。',
    // study report
    'Study report': '研究报告', '📄 Report': '📄 报告', 'Anonymised cohort summary': '匿名队列摘要', 'Generated': '生成于',
    'Anonymised, self-reported data from a non-clinical prototype. Descriptive only.': '来自非临床原型的匿名自报数据;仅描述性。',
    'Cohort summary': '队列摘要', 'Weekly trend (means)': '每周趋势(均值)', 'Breakdown': '构成',
    // server / realtime / jwt
    'Server (optional — for JWT login)': '服务器(可选——用于 JWT 登录)', 'Sign in failed': '登录失败',
    'No server → local demo. With a server → real JWT login + live sync. Any passcode works in the demo.': '不填服务器=本地演示;填服务器=真实 JWT 登录 + 实时同步。演示下任意口令均可。',
    'Synced from server': '已从服务器同步'
  };

  WW.i18n = {
    lang: 'en',
    dicts: { zh: ZH },
    init: function () { try { var l = localStorage.getItem('ww-lang'); if (l) this.lang = l; } catch (e) {} },
    t: function (s) { if (this.lang === 'en') return s; var d = this.dicts[this.lang]; return (d && d[s] != null) ? d[s] : s; },
    set: function (l) { this.lang = l; try { localStorage.setItem('ww-lang', l); } catch (e) {} }
  };
  WW.i18n.init();
  WW.t = function (s) { return WW.i18n.t(s); };
})(window.WW);
