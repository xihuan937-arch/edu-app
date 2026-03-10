import { useState } from "react";

// ─── 颜色主题 ──────────────────────────────────────────────────────────────────
const T = {
  bg: "#0D1117", card: "#161B22", border: "#21262D",
  accent: "#F0B429", accentDim: "#9B7A0A",
  blue: "#388BFD", green: "#3FB950", red: "#F85149", purple: "#BC8CFF",
  text: "#E6EDF3", textMuted: "#8B949E", textDim: "#484F58",
};

// ─── 全局样式 ──────────────────────────────────────────────────────────────────
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0D1117; font-family: 'DM Sans', 'PingFang SC', sans-serif; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
  input, select, textarea, button { font-family: 'DM Sans', 'PingFang SC', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes spin   { to { transform:rotate(360deg); } }
  .fade-up { animation: fadeUp .3s ease forwards; }
  .cursor::after { content:'▋'; animation: blink .7s ease infinite; color: #F0B429; }
`;

// ─── Claude API ────────────────────────────────────────────────────────────────
async function streamClaude(messages, onChunk) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        stream: true,
        messages,
      }),
    });
    if (!res.ok) { onChunk("⚠️ API 请求失败，请检查网络或 API Key 配置。"); return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split("\n")) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (d === "[DONE]") continue;
        try { const t = JSON.parse(d).delta?.text || ""; full += t; onChunk(full); } catch {}
      }
    }
    return full;
  } catch (e) {
    onChunk("⚠️ 网络错误：" + e.message);
  }
}

// ─── 公共组件 ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 13, height: 13,
      border: `2px solid currentColor`, borderTopColor: "transparent",
      borderRadius: "50%", animation: "spin 1s linear infinite",
    }} />
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); });
  };
  return (
    <button onClick={copy} style={{
      padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.border}`,
      background: "transparent", color: ok ? T.green : T.textMuted,
      fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    }}>
      {ok ? "✓ 已复制" : "复制"}
    </button>
  );
}

function Chip({ val, cur, onSet, color }) {
  const active = val === cur;
  return (
    <button onClick={() => onSet(val)} style={{
      padding: "5px 11px", borderRadius: 20,
      border: `1px solid ${active ? color : T.border}`,
      background: active ? color + "22" : "transparent",
      color: active ? color : T.textMuted,
      fontSize: 12, cursor: "pointer", transition: "all .15s",
    }}>{val}</button>
  );
}

function Field({ label, value, onChange, placeholder, focusColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>{label}</div>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none",
        }}
        onFocus={e => (e.target.style.borderColor = focusColor || T.accent)}
        onBlur={e => (e.target.style.borderColor = T.border)}
      />
    </div>
  );
}

function ResultBox({ out, loading, headerColor, headerLabel }) {
  if (!out && !loading) return null;
  return (
    <div className="fade-up" style={{
      background: T.bg, border: `1px solid ${headerColor}44`,
      borderRadius: 12, padding: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: headerColor, fontWeight: 500 }}>{headerLabel}</span>
        {out && <CopyBtn text={out} />}
      </div>
      <pre
        className={loading && out ? "cursor" : ""}
        style={{
          fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap",
          wordBreak: "break-word", color: T.text,
          fontFamily: "'Noto Serif SC', 'PingFang SC', serif",
        }}
      >
        {out || <span style={{ color: T.textDim }}>生成中…</span>}
      </pre>
    </div>
  );
}

// ─── 模块1：招生文案 ───────────────────────────────────────────────────────────
function ContentGen() {
  const [type, setType] = useState("朋友圈招生");
  const [tone, setTone] = useState("走心感人");
  const [subject, setSubject] = useState("");
  const [age, setAge] = useState("");
  const [pain, setPain] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const types = ["朋友圈招生", "家长群通知", "试听课邀约", "暑假活动推广", "成绩捷报"];
  const tones = ["走心感人", "专业权威", "轻松活泼", "紧迫感强", "口碑推荐"];

  const run = async () => {
    if (!subject || !age) return;
    setLoading(true); setOut("");
    await streamClaude([{
      role: "user", content:
        `你是专业教培招生文案专家。生成一篇【${type}】文案：
科目：${subject}，年龄段：${age}，家长痛点：${pain || "成绩提升、升学压力"}，风格：${tone}
要求：200字内，适合手机阅读，含emoji，结尾有行动号召。直接输出文案，无需任何说明。`,
    }], t => setOut(t));
    setLoading(false);
  };

  const canRun = subject && age && !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>文案类型</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {types.map(v => <Chip key={v} val={v} cur={type} onSet={setType} color={T.accent} />)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>文案风格</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {tones.map(v => <Chip key={v} val={v} cur={tone} onSet={setTone} color={T.purple} />)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="教学科目 *" value={subject} onChange={setSubject} placeholder="数学 / 英语 / 编程…" />
        <Field label="目标年龄 *" value={age} onChange={setAge} placeholder="小学3-5年级 / 初中…" />
      </div>
      <Field label="家长痛点（可选）" value={pain} onChange={setPain} placeholder="孩子数学基础差、注意力不集中…" />
      <button
        onClick={run} disabled={!canRun}
        style={{
          alignSelf: "flex-start", padding: "11px 22px", borderRadius: 8, border: "none",
          background: canRun ? T.accent : T.accentDim, color: "#000",
          fontSize: 13, fontWeight: 600, cursor: canRun ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", gap: 8, opacity: canRun ? 1 : 0.6,
          transition: "all .15s",
        }}
      >
        {loading ? <><Spinner /> 生成中…</> : "✦ 一键生成文案"}
      </button>
      <ResultBox out={out} loading={loading} headerColor={T.accent} headerLabel="✦ AI 生成文案" />
    </div>
  );
}

// ─── 模块2：视频脚本 ───────────────────────────────────────────────────────────
function VideoScript() {
  const [platform, setPlatform] = useState("抖音");
  const [dur, setDur] = useState("60秒");
  const [hook, setHook] = useState("痛点引入");
  const [topic, setTopic] = useState("");
  const [course, setCourse] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!topic) return;
    setLoading(true); setOut("");
    await streamClaude([{
      role: "user", content:
        `你是教育短视频脚本导演。平台：${platform}，时长：${dur}，主题：${topic}，开场风格：${hook}，课程：${course || "教培课程"}
创作完整脚本，格式用【开场0-5秒】【镜头N】标注，含画面描述+口播台词+字幕文字，结尾有引流动作。直接输出脚本。`,
    }], t => setOut(t));
    setLoading(false);
  };

  const canRun = topic && !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          ["发布平台", platform, setPlatform, ["抖音", "视频号", "小红书", "快手"], T.blue],
          ["视频时长", dur, setDur, ["30秒", "60秒", "3分钟"], T.green],
          ["开场风格", hook, setHook, ["痛点引入", "数据震撼", "故事开场", "干货直给"], T.accent],
        ].map(([label, cur, set, opts, color]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {opts.map(v => <Chip key={v} val={v} cur={cur} onSet={set} color={color} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="视频主题 *" value={topic} onChange={setTopic} placeholder="孩子数学从60分到120分的秘密" focusColor={T.blue} />
        <Field label="主推课程" value={course} onChange={setCourse} placeholder="初中数学强化班" focusColor={T.blue} />
      </div>
      <button
        onClick={run} disabled={!canRun}
        style={{
          alignSelf: "flex-start", padding: "11px 22px", borderRadius: 8, border: "none",
          background: canRun ? T.blue : "#1a3a6a", color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: canRun ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", gap: 8, opacity: canRun ? 1 : 0.6,
          transition: "all .15s",
        }}
      >
        {loading ? <><Spinner /> 生成中…</> : "▶ 生成视频脚本"}
      </button>
      <ResultBox out={out} loading={loading} headerColor={T.blue} headerLabel={`◈ ${platform} · ${dur} 脚本`} />
    </div>
  );
}

// ─── 模块3：家长CRM ────────────────────────────────────────────────────────────
const STAGES = ["初次接触", "已试听", "跟进中", "意向强", "已报名"];
const SC = { "初次接触": T.textMuted, "已试听": T.blue, "跟进中": T.accent, "意向强": T.purple, "已报名": T.green };
const INIT_LEADS = [
  { id: 1, name: "张妈妈", child: "张小明", phone: "138****8888", subject: "数学", age: "初二", stage: "跟进中", note: "数学69分，已发过一次文案", date: "03-08" },
  { id: 2, name: "李爸爸", child: "李晓雨", phone: "139****9999", subject: "英语", age: "小学5年级", stage: "已试听", note: "试听反馈好，价格有犹豫", date: "03-09" },
  { id: 3, name: "王妈妈", child: "王浩然", phone: "135****7777", subject: "编程", age: "初一", stage: "意向强", note: "问过周末班安排", date: "03-10" },
];
const EMPTY_FORM = { name: "", child: "", phone: "", subject: "", age: "", stage: "初次接触", note: "" };

function CRM() {
  const [leads, setLeads] = useState(INIT_LEADS);
  const [filter, setFilter] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [aiMsg, setAiMsg] = useState({});
  const [aiLoad, setAiLoad] = useState(null);

  const shown = filter === "全部" ? leads : leads.filter(l => l.stage === filter);
  const counts = STAGES.reduce((a, s) => ({ ...a, [s]: leads.filter(l => l.stage === s).length }), {});

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (l) => { setForm({ name: l.name, child: l.child, phone: l.phone, subject: l.subject, age: l.age, stage: l.stage, note: l.note }); setEditId(l.id); setShowForm(true); };
  const save = () => {
    if (!form.name) return;
    const today = `${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    if (editId) setLeads(ls => ls.map(l => l.id === editId ? { ...l, ...form } : l));
    else setLeads(ls => [...ls, { ...form, id: Date.now(), date: today }]);
    setShowForm(false); setEditId(null);
  };
  const del = (id) => { if (window.confirm("确认删除？")) setLeads(ls => ls.filter(l => l.id !== id)); };

  const genAI = async (lead) => {
    setAiLoad(lead.id); setAiMsg(m => ({ ...m, [lead.id]: "" }));
    await streamClaude([{
      role: "user", content:
        `你是教培招生顾问，生成一条微信跟进消息。家长：${lead.name}，孩子：${lead.child || "孩子"}，科目：${lead.subject}，年级：${lead.age}，当前阶段：${lead.stage}，备注：${lead.note || "无"}。要求：80字内，亲切自然，针对${lead.stage}阶段重点，结尾有行动号召。直接输出消息。`,
    }], t => setAiMsg(m => ({ ...m, [lead.id]: t })));
    setAiLoad(null);
  };

  const setF = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* 漏斗统计 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        {STAGES.map(s => (
          <button key={s} onClick={() => setFilter(filter === s ? "全部" : s)}
            style={{
              padding: "10px 4px", borderRadius: 8, cursor: "pointer", textAlign: "center",
              border: `1px solid ${filter === s ? SC[s] : T.border}`,
              background: filter === s ? SC[s] + "18" : T.card,
            }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: SC[s] }}>{counts[s] || 0}</div>
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{s}</div>
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          {filter === "全部" ? `共 ${leads.length} 条线索` : `${filter} · ${shown.length} 条`}
        </span>
        <button onClick={openAdd} style={{
          padding: "8px 16px", borderRadius: 7, border: "none",
          background: T.green, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          + 添加线索
        </button>
      </div>

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="fade-up" style={{ background: T.card, border: `1px solid ${T.green}44`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.green, marginBottom: 14 }}>
            {editId ? "✎ 编辑线索" : "+ 新增线索"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Field label="家长称呼 *" value={form.name} onChange={setF("name")} placeholder="张妈妈" focusColor={T.green} />
            <Field label="孩子姓名" value={form.child} onChange={setF("child")} placeholder="张小明" focusColor={T.green} />
            <Field label="联系电话" value={form.phone} onChange={setF("phone")} placeholder="138****8888" focusColor={T.green} />
            <Field label="科目" value={form.subject} onChange={setF("subject")} placeholder="数学" focusColor={T.green} />
            <Field label="年级" value={form.age} onChange={setF("age")} placeholder="初二" focusColor={T.green} />
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>跟进阶段</div>
              <select value={form.stage} onChange={e => setF("stage")(e.target.value)}
                style={{
                  width: "100%", background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none", cursor: "pointer",
                }}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <Field label="跟进备注" value={form.note} onChange={setF("note")} placeholder="记录沟通情况、家长顾虑…" focusColor={T.green} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: T.green, color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>保存</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "9px 20px", borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer" }}>取消</button>
          </div>
        </div>
      )}

      {/* 线索列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map(lead => (
          <div key={lead.id} className="fade-up" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${SC[lead.stage]}`, borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: SC[lead.stage] + "22", color: SC[lead.stage],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, flexShrink: 0,
                }}>{lead.name[0]}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</span>
                    {lead.child && <span style={{ fontSize: 12, color: T.textMuted }}>· {lead.child}</span>}
                    <span style={{ padding: "2px 8px", borderRadius: 10, background: SC[lead.stage] + "22", color: SC[lead.stage], fontSize: 11, fontWeight: 500 }}>{lead.stage}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: T.textMuted, flexWrap: "wrap" }}>
                    {lead.subject && <span>📚 {lead.subject}</span>}
                    {lead.age && <span>🎒 {lead.age}</span>}
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    <span>🗓 {lead.date}</span>
                  </div>
                  {lead.note && <div style={{ marginTop: 5, fontSize: 12, color: T.textDim, fontStyle: "italic" }}>💬 {lead.note}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => genAI(lead)} disabled={aiLoad === lead.id}
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.accentDim}`, background: "transparent", color: T.accent, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  {aiLoad === lead.id ? <Spinner /> : "✦"} AI跟进
                </button>
                <button onClick={() => openEdit(lead)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 11, cursor: "pointer" }}>编辑</button>
                <button onClick={() => del(lead.id)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "transparent", color: T.red, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            {/* AI 跟进话术 */}
            {(aiMsg[lead.id] !== undefined && (aiMsg[lead.id] || aiLoad === lead.id)) && (
              <div className="fade-up" style={{ marginTop: 12, padding: "12px 14px", background: T.accent + "0D", border: `1px solid ${T.accentDim}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>✦ AI 跟进话术</span>
                  {aiMsg[lead.id] && <CopyBtn text={aiMsg[lead.id]} />}
                </div>
                <p className={aiLoad === lead.id && aiMsg[lead.id] ? "cursor" : ""}
                  style={{ fontSize: 13, lineHeight: 1.8, color: T.text, fontFamily: "'Noto Serif SC', serif" }}>
                  {aiMsg[lead.id] || <span style={{ color: T.textDim }}>生成中…</span>}
                </p>
              </div>
            )}
          </div>
        ))}

        {shown.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: T.textDim }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 13 }}>暂无{filter !== "全部" ? `「${filter}」阶段的` : ""}线索</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主应用 ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "content", label: "招生文案", icon: "✏️", color: T.accent },
  { id: "video",   label: "视频脚本", icon: "🎬", color: T.blue },
  { id: "crm",     label: "家长CRM",  icon: "👥", color: T.green },
];

export default function App() {
  const [tab, setTab] = useState("content");

  return (
    <>
      <style>{globalCss}</style>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${T.border}`, padding: "0 16px", position: "sticky", top: 0, background: T.bg, zIndex: 10 }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${T.accent},#E8950A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Noto Serif SC', serif" }}>教培获客助手</span>
                <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>AI 驱动 · MVP</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block" }} />
              <span style={{ fontSize: 11, color: T.textMuted }}>已连接</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: `1px solid ${T.border}`, padding: "0 16px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "13px 8px", background: "none", border: "none",
                  borderBottom: `2px solid ${tab === t.id ? t.color : "transparent"}`,
                  color: tab === t.id ? t.color : T.textMuted,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  marginBottom: -1, transition: "all .15s",
                }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 40px" }}>
          {tab === "content" && <ContentGen key="c" />}
          {tab === "video"   && <VideoScript key="v" />}
          {tab === "crm"     && <CRM key="r" />}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 11, color: T.textDim }}>教培获客助手 MVP · Powered by Claude AI · 数据仅存于本地</span>
        </div>
      </div>
    </>
  );
}
