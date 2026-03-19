/* eslint-disable no-unused-vars */
import { useState, useMemo, useCallback, useRef } from "react";
import { ComposedChart, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── 1. GLOBAL DESIGN CONSTANTS ───────────────────────────────────────
var P={bg:"#f8f9fc",card:"#fff",input:"#f3f4f8",bd:"#e0e3ea",bdS:"#c7cbd4",pri:"#1d4ed8",priBg:"#eef2ff",priTx:"#1e3a8a",tx:"#1a1f2e",txM:"#4b5563",txD:"#8992a3",gn:"#0d7a5f",gnBg:"#ecfdf5",rd:"#c93131",rdBg:"#fef2f2",bl:"#2563eb",blBg:"#eff6ff",hdr:"#111827",hdrTx:"#f0f1f4",secBg:"#f1f4f9",hlBg:"#e8eeff",hlTx:"#1e3a8a"};
var ff="'Inter',-apple-system,sans-serif";
var mf="'SF Mono',monospace";
var mClr=["#1d4ed8","#0d7a5f","#c93131","#7c3aed","#be185d","#0e7490"];
let _id = 100; const uid = () => "m" + (++_id);

// ─── 2. HELPERS & CSV ENGINE ──────────────────────────────────────────
const fmt = (v,d=2) => { if(v===""||v==null||isNaN(v)) return "—"; return Number(v).toLocaleString("en-AU",{minimumFractionDigits:d,maximumFractionDigits:d}); };
const fmtInt = v => fmt(v,0);
const fmtC2 = v => { if(v===""||v==null||isNaN(v)) return "—"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtCur = v => { if(v===""||v==null||isNaN(v)) return "—"; if(Math.abs(v)>=1e6) return "$"+(v/1e6).toFixed(2)+"M"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:0,maximumFractionDigits:0}); };

function parseCSV(text){return text.split(/\r?\n/).filter(l=>l.trim()).map(l=>{const c=[];let cur="",q=false;for(let i=0;i<l.length;i++){if(l[i]==='"')q=!q;else if(l[i]===','&&!q){c.push(cur.trim());cur=""}else cur+=l[i]}c.push(cur.trim());return c})}
function parseGenericCSV(text){
  const rows=parseCSV(text);if(rows.length<2)return null;
  const hdr=rows[0];let dsc=2;for(let i=1;i<hdr.length;i++){if(/^\d/.test(hdr[i])){dsc=i;break}}
  const np=Math.max(...rows.map(r=>r.length))-dsc;
  const rm={},labels=[];
  for(const r of rows){const lb=(r[0]||"").trim();if(!lb)continue;labels.push(lb);rm[lb]=r;rm[lb.toLowerCase().replace(/[^a-z0-9]/g,"")]=r}
  const gv=(lb,pi)=>{const row=rm[lb]||rm[(lb||"").toLowerCase().replace(/[^a-z0-9]/g,"")];if(!row)return 0;const v=row[dsc+pi];if(!v)return 0;const n=parseFloat(v.replace(/,/g,""));return isNaN(n)?0:n};
  const gs=(lb,pi)=>{const row=rm[lb]||rm[(lb||"").toLowerCase().replace(/[^a-z0-9]/g,"")];return row?(row[dsc+pi]||""):""};
  return{rm,labels,dsc,np,gv,gs};
}

// ─── 3. EXPRESSION & CALC ENGINE ───────────────────────────────────────
function tokenize(e){const t=[];let i=0;while(i<e.length){if(/\s/.test(e[i])){i++;continue}if(/[0-9.]/.test(e[i])){let n="";while(i<e.length&&/[0-9.eE\-]/.test(e[i]))n+=e[i++];t.push({type:"num",val:parseFloat(n)})}else if(/[a-zA-Z_]/.test(e[i])){let d="";while(i<e.length&&/[a-zA-Z_0-9]/.test(e[i]))d+=e[i++];t.push({type:"id",val:d})}else if("+-*/(),<>=!&|?:".includes(e[i])){let o=e[i++];if("<>=!".includes(o[0])&&e[i]==='=')o+=e[i++];if(o==='&'&&e[i]==='&')o+=e[i++];if(o==='|'&&e[i]==='|')o+=e[i++];t.push({type:"op",val:o})}else i++}return t}
function evalExpr(expr,ctx){try{const tk=tokenize(expr);let p=0;const pk=()=>tk[p]||null,eat=(v)=>{const t=tk[p];if(v&&t?.val!==v)throw 0;p++;return t};function pT(){let r=pO();if(pk()?.val==='?'){eat('?');const a=pT();eat(':');const b=pT();return r?a:b}return r}function pO(){let r=pA();while(pk()?.val==='||'){eat();r=r||pA()}return r}function pA(){let r=pC();while(pk()?.val==='&&'){eat();r=r&&pC()}return r}function pC(){let r=pAd();while(pk()?.val&&['<','>','<=','>=','==','!='].includes(pk().val)){const o=eat().val,b=pAd();r=o==='<'?r<b:o==='>'?r>b:o==='<='?r<=b:o==='>='?r>=b:o==='=='?r==b:r!=b}return r}function pAd(){let r=pM();while(pk()?.val==='+'||pk()?.val==='-'){const o=eat().val,b=pM();r=o==='+'?r+b:r-b}return r}function pM(){let r=pU();while(pk()?.val==='*'||pk()?.val==='/'){const o=eat().val,b=pU();r=o==='*'?r*b:r/b}return r}function pU(){if(pk()?.val==='-'){eat();return -pP()}return pP()}function pP(){const t=pk();if(!t)throw 0;if(t.type==="num"){eat();return t.val}if(t.val==='('){eat('(');const r=pT();eat(')');return r}if(t.type==="id"){const nm=eat().val;const fns={ceil:Math.ceil,floor:Math.floor,max:Math.max,min:Math.min,abs:Math.abs,round:Math.round};if((nm==="IF"||nm==="if")&&pk()?.val==='('){eat('(');const c=pT();eat(',');const a=pT();eat(',');const b=pT();eat(')');return c?a:b}if(ctx.hasOwnProperty(nm)){return ctx[nm]}return 0}throw 0}const result=pT();return isFinite(result)?result:""}catch{return ""}}

function calcWithFormulas(inp,formulas){
  const{totalMined,oreMined,totalRampMined,avgLoadedTravelTime,avgUnloadedTravelTime,avgTkphDelay,calendarHours,truck:T,digger:D,other:O,fleet:F,periodMultiplier:pm}=inp;
  if(!totalMined||totalMined<=0)return null;
  const ctx={totalMined,oreMined,totalRampMined,avgLoadedTravelTime,avgUnloadedTravelTime,avgTkphDelay,calendarHours,periodMultiplier:pm};
  for(const[k,v]of Object.entries(T))if(typeof v==="number")ctx["T_"+k]=v;
  for(const[k,v]of Object.entries(D))if(typeof v==="number")ctx["D_"+k]=v;
  for(const[k,v]of Object.entries(O))if(typeof v==="number")ctx["O_"+k]=v;
  if(F)for(const[k,v]of Object.entries(F))if(typeof v==="number")ctx["F_"+k]=v;
  const results={};
  for(const f of formulas){const val=evalExpr(f.formula,ctx);results[f.key]=val;ctx[f.key]=typeof val==="number"?val:0}
  return results;
}

// ─── 4. FACTORIES & DEFAULTS ───────────────────────────────────────────
const mkTruck = (ov={}) => ({ id: uid(), truckName:"XCMG XGE150 Plus", payload:85, availability:0.86, useOfAvailability:0.96, operatingEfficiency:0.79, totalTruckCapex:2185181, capexPerSmuHour:27.31, opexPerSmuHour:156.54, utToSmuConversion:1.06, performanceEfficiency:0.99, ...ov });
const mkDigger = (ov={}) => ({ id: uid(), diggerName:"300t Cable Electric", availability:0.90, useOfAvailability:0.83, operatingEfficiency:0.38, totalCapex:8995710, capexPerSmuHour:112.45, dieselElectricityCost:86.6, maintenanceLabour:91, oilAndCoolant:12.6, partsComponentsPM05:223, materialsConsumables:0, get:76.5, cableCost:2.4, tracks:0, tires:0, fmsLicenseFee:42.99, batteryReplacement:0, operatorCost:130, rehandleCostPerTonne:1.13, effectiveDigRate:2800, ...ov });
const mkFleet = (name,truckIdx=0,diggerIdx=0) => ({ id:uid(), name, truckIdx, diggerIdx, loadTime:1.0 });
const defaultOther = () => ({ moistureContent:0.052, exchangeRate:0.70, discountRate:0.115, electricityCost:0.1443, dieselCost:0.9102, allInFitterPerYear:182, mannedOperator:133, calendarTime:8760, diggerFleetRoundingThreshold:0.5 });

const PHYS_FIELDS = [{key:"oreMined",label:"Ore Mined",unit:"t"},{key:"wasteMined",label:"Waste Mined",unit:"t"},{key:"totalMined",label:"Total Mined",unit:"t"},{key:"totalRampMined",label:"Ramp Tonnes",unit:"t"},{key:"avgLoadedTravelTime",label:"Loaded Travel",unit:"min"},{key:"avgUnloadedTravelTime",label:"Unloaded Travel",unit:"min"},{key:"avgTkphDelay",label:"TKPH Delay",unit:"min"},{key:"oreFePct",label:"Ore Fe %",unit:"%"},{key:"oreSiPct",label:"Ore Si %",unit:"%"},{key:"oreAlPct",label:"Ore Al %",unit:"%"},{key:"orePPct",label:"Ore P %",unit:"%"}];
const mkScenario = (name) => ({ id: uid(), name, csvData: null, csvRawLabels: [], manualData: [{period:1,periodLabel:"2032/Q2",days:91,hours:2184,oreMined:0,wasteMined:77261,totalMined:77261,totalRampMined:77261,avgLoadedTravelTime:3.3,avgUnloadedTravelTime:2.5,avgTkphDelay:0,oreFePct:61.5,oreSiPct:3.7,oreAlPct:2.2,orePPct:0.08}], fieldMappings: [{id:uid(),name:"Base Set",fields:{}}], activeFleetIds: [], fleetPhysicalSets: {}, schedPeriod: "Quarterly", unitMul: 1 });

const defaultFormulas = () => [
  {key:"digOE",label:"Digger Overall Efficiency",section:"⛏️ DIGGER",group:"TUM",formula:"D_availability * D_useOfAvailability * D_operatingEfficiency"},
  {key:"digHrsReq",label:"Digger Hours Required",group:"TUM",formula:"totalMined / D_effectiveDigRate"},
  {key:"smuHrs",label:"Digger SMU Hours",group:"TUM",formula:"(digHrsReq / digOE) * 1.03"},
  {key:"digQty",label:"Digger Qty",group:"Fleet",formula:"digHrsReq / (2487 * periodMultiplier)"},
  {key:"digFleet",label:"Digger Fleet Required",group:"Fleet",formula:"IF(digQty <= 0, 0, IF((digQty - floor(digQty)) > O_diggerFleetRoundingThreshold, ceil(digQty), ceil(digQty)))",hl:1},
  {key:"digOpxTotal",label:"Total Digger Opex",group:"Totals",formula:"smuHrs * (D_dieselElectricityCost + D_maintenanceLabour + D_oilAndCoolant + D_partsComponentsPM05 + D_operatorCost)",hl:1,cur:1},
  {key:"cycleTime",label:"Cycle Time",section:"🚛 TRUCK",group:"Cycle",formula:"T_spotTimeLoad + F_loadTime + T_dumpTime + avgLoadedTravelTime + avgUnloadedTravelTime"},
  {key:"productivity",label:"Productivity",group:"Output",formula:"T_payload / (cycleTime / 60)",hl:1},
  {key:"trkReqR",label:"Trucks Required",group:"Fleet",formula:"ceil(totalRampMined / productivity / calendarHours)",hl:1},
  {key:"totCost",label:"Total Scenario Cost",section:"🏆 TOTAL",group:"Inc Capex",formula:"digOpxTotal + (smuHrs * D_capexPerSmuHour) + (totalRampMined * 2.5)",hl:1,cur:1},
  {key:"totPerT",label:"Total $/t",group:"Inc Capex",formula:"totCost / totalRampMined",hl:1,cur:1},
];

// ─── 5. UI COMPONENTS ──────────────────────────────────────────────────
const ST=({children,icon})=>(<div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 0 10px",marginTop:20,borderBottom:`2px solid ${P.pri}`,marginBottom:14}}><span style={{fontSize:18}}>{icon}</span><span style={{color:P.pri,fontWeight:700,fontSize:15,fontFamily:ff}}>{children}</span></div>);
const Btn=({children,onClick,color=P.pri,small,solid})=>(<button onClick={onClick} style={{padding:small?"5px 12px":"8px 20px",background:solid?color:"transparent",border:`1.5px solid ${color}`,borderRadius:7,color:solid?"#fff":color,fontFamily:ff,fontSize:12,cursor:"pointer",fontWeight:600}}>{children}</button>);
const cardS={background:P.card,borderRadius:10,border:`1px solid ${P.bd}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"};
const selS={padding:"6px 12px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:ff,fontSize:12};
const thS={padding:"9px 10px",color:P.txM,textAlign:"left",fontSize:11,fontWeight:600};

const CompRow=({label,field,models,onChange,unit,type="number",step,section})=>{
  if(section)return(<tr><td colSpan={models.length+2} style={{padding:"16px 14px 6px",color:P.pri,fontWeight:700,fontSize:13,borderBottom:`2px solid ${P.pri}20`,fontFamily:ff,background:P.secBg}}>{label}</td></tr>);
  return(<tr style={{borderBottom:`1px solid ${P.bd}`}}><td style={{padding:"7px 14px",color:P.txM,fontSize:13,fontFamily:ff,whiteSpace:"nowrap",position:"sticky",left:0,background:P.card,zIndex:1}}>{label}</td><td style={{padding:"7px 8px",color:P.txD,fontSize:11,fontFamily:mf}}>{unit}</td>{models.map((m,i)=>(<td key={m.id||i} style={{padding:"3px 6px"}}>{type==="text"?<input type="text" value={m[field]||""} onChange={e=>onChange(i,field,e.target.value)} style={{width:"100%",minWidth:115,padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:ff,fontSize:13}}/>:<input type="number" value={m[field]??""} onChange={e=>onChange(i,field,parseFloat(e.target.value)||0)} step={step||0.01} style={{width:"100%",minWidth:105,padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:mf,fontSize:13,textAlign:"right"}}/>}</td>))}</tr>);
};

const truckRows=[{section:true,label:"Identity"},{field:"truckName",label:"Name",type:"text"},{field:"payload",label:"Payload",unit:"t"},{section:true,label:"TUM"},{field:"availability",label:"Availability",unit:"%"},{field:"useOfAvailability",label:"UoA",unit:"%"},{field:"operatingEfficiency",label:"Op Eff",unit:"%"},{section:true,label:"Financial"},{field:"totalTruckCapex",label:"Capex",unit:"$"},{field:"opexPerSmuHour",label:"Opex/hr",unit:"$"}];
const diggerRows=[{section:true,label:"Identity"},{field:"diggerName",label:"Name",type:"text"},{section:true,label:"TUM"},{field:"availability",label:"Availability",unit:"%"},{field:"useOfAvailability",label:"UoA",unit:"%"},{section:true,label:"Costs"},{field:"totalCapex",label:"Capex",unit:"$"},{field:"dieselElectricityCost",label:"Elec",unit:"$/hr"},{field:"operatorCost",label:"Operator",unit:"$/hr"}];

// ─── 6. MAIN APP ───────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("scenarios");
  const [trucks,setTrucks]=useState(()=>[mkTruck(),mkTruck({truckName:"Liebherr 264", payload:240})]);
  const [diggers,setDiggers]=useState(()=>[mkDigger(),mkDigger({diggerName:"400t Electric"})]);
  const [otherA,setOtherA]=useState(defaultOther);
  const [formulas,setFormulas]=useState(defaultFormulas);
  const [fleets,setFleets]=useState(()=>[mkFleet("Fleet 1",0,0),mkFleet("Fleet 2",1,1)]);
  const [scenarios,setScenarios]=useState(()=>[mkScenario("Scenario ST"),mkScenario("Scenario LT")]);
  const [activeScnIdx,setActiveScnIdx]=useState(0);
  const fileRef=useRef();

  const scn=scenarios[activeScnIdx]||scenarios[0];
  const updScn=(fn)=>setScenarios(prev=>{const n=[...prev];n[activeScnIdx]=fn({...n[activeScnIdx]});return n});

  const activeFleets=fleets.filter(f=>scn.activeFleetIds.length===0||scn.activeFleetIds.includes(f.id));
  const pm = scn.schedPeriod==="Quarterly"?0.25:scn.schedPeriod==="Monthly"?1/12:1;

  const handleUpload=useCallback(e=>{
    const f=e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=ev=>{try{
      const parsed=parseGenericCSV(ev.target.result);
      if(!parsed||parsed.np<1){updScn(s=>({...s,csvData:null,csvRawLabels:[]}));return}
      updScn(s=>({...s,csvData:parsed,csvRawLabels:parsed.labels}));
    }catch(err){console.error(err)}};
    rd.readAsText(f);
  },[activeScnIdx]);

  const results=useMemo(()=>{
    const all=[];
    const currentPeriods = scn.csvData ? scn.csvData.np : scn.manualData.length;
    for(let pi=0;pi<currentPeriods;pi++){
      for(const fleet of activeFleets){
        let pd = scn.csvData ? {periodLabel:scn.csvData.gs("Period",pi)||`P${pi+1}`, totalMined:scn.csvData.gv("Total Mined",pi), totalRampMined:scn.csvData.gv("Total Mined",pi), days:91} : scn.manualData[pi];
        if(!pd)continue;
        const ti=Math.min(fleet.truckIdx,trucks.length-1), di=Math.min(fleet.diggerIdx,diggers.length-1);
        const res=calcWithFormulas({...pd, truck:trucks[ti], digger:diggers[di], other:otherA, fleet, periodMultiplier:pm, calendarHours:2184},formulas);
        all.push({pi,periodLabel:pd.periodLabel||`P${pi+1}`,res,pd,truckName:trucks[ti].truckName,diggerName:diggers[di].diggerName});
      }
    }
    return all;
  }, [activeFleets, trucks, diggers, otherA, formulas, scn, pm]);

  const navGroups=[
    {label:"Assumptions",items:[{id:"other",label:"General",icon:"⚙️"},{id:"truck",label:"Trucks",icon:"🚛"},{id:"digger",label:"Diggers",icon:"⛏️"}]},
    {label:"Setup",items:[{id:"scenarios",label:"Scenarios",icon:"📋"},{id:"schedule",label:"Schedule",icon:"📅"}]},
    {label:"Results",items:[{id:"results",label:"Results",icon:"📊"}]}
  ];
  const activeGroup=navGroups.find(g=>g.items.some(i=>i.id===page))||navGroups[0];

  return(
    <div style={{minHeight:"100vh",background:P.bg,color:P.tx,fontFamily:ff}}>
      <div style={{background:P.hdr,padding:"12px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:32,height:32,background:P.pri,borderRadius:6,textAlign:"center",lineHeight:"32px"}}>⛏️</div><h1 style={{margin:0,fontSize:17,color:P.hdrTx}}>Fleet Cost Engine</h1></div>
        <select value={activeScnIdx} onChange={e=>setActiveScnIdx(parseInt(e.target.value))} style={{padding:"6px 12px",background:"#1f2937",border:"1px solid #374151",color:"#fff",borderRadius:6}}>
          {scenarios.map((s,i)=><option key={i} value={i}>{s.name}</option>)}
        </select>
      </div>
      
      <div style={{display:"flex",padding:"0 32px",background:"#1f2937",overflowX:"auto"}}>
        {navGroups.map(g=>{const isA=g===activeGroup;return(<button key={g.label} onClick={()=>setPage(g.items[0].id)} style={{padding:"12px 24px",background:isA?"rgba(255,255,255,0.1)":"transparent",border:"none",color:"#fff",cursor:"pointer"}}>{g.label}</button>)})}
      </div>

      <div style={{padding:"20px 32px",maxWidth:1400,margin:"0 auto"}}>
        {page==="scenarios" && (
          <div>
            <ST icon="📋">Scenario Manager</ST>
            <Btn onClick={()=>setScenarios(p=>[...p,mkScenario(`Scenario ${p.length+1}`)])} solid>+ Add Scenario</Btn>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:16,marginTop:20}}>
              {scenarios.map((s,si)=>(
                <div key={s.id} style={{...cardS,padding:20,border:si===activeScnIdx?`2px solid ${P.pri}`:''}}>
                  <input type="text" value={s.name} onChange={e=>updScn(prev=>({...prev, name:e.target.value}))} style={{fontSize:16,fontWeight:700,width:"100%"}}/>
                  <div style={{marginTop:10,fontSize:12,color:P.txM}}>{s.csvData?`CSV: ${s.csvData.np} periods`:`Manual: ${s.manualData.length} periods`}</div>
                  <Btn onClick={()=>setActiveScnIdx(si)} small solid={si===activeScnIdx} style={{marginTop:12}}>{si===activeScnIdx?"Active":"Select"}</Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {page==="schedule" && (
          <div>
            <ST icon="📅">Production Schedule</ST>
            <div style={{...cardS,padding:20}}>
               <input type="file" accept=".csv" onChange={handleUpload}/>
               {scn.csvData && <p style={{marginTop:10,color:P.gn}}>✓ CSV Loaded successfully</p>}
            </div>
          </div>
        )}

        {page==="results" && (
          <div>
            <ST icon="📊">Calculation Results</ST>
            {results.map((r,i)=>(
              <div key={i} style={{...cardS,padding:15,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <div><strong>{r.periodLabel}</strong> - {r.truckName} + {r.diggerName}</div>
                <div>Cost: {fmtCur(r.res?.totCost)} | $/t: {fmtC2(r.res?.totPerT)}</div>
              </div>
            ))}
          </div>
        )}

        {page==="other" && (
          <div>
            <ST icon="⚙️">General Assumptions</ST>
            <div style={{...cardS,padding:20}}>
              {Object.entries(otherA).map(([k,v])=>(
                <div key={k} style={{marginBottom:10}}>
                  <label style={{display:"block",fontSize:12,color:P.txM}}>{k}</label>
                  <input type="number" value={v} onChange={e=>setOtherA(p=>({...p, [k]:parseFloat(e.target.value)}))} style={{padding:8,width:200}}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
