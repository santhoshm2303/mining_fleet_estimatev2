/* eslint-disable no-unused-vars */
import { useState, useMemo, useCallback, useRef } from "react";
import { ComposedChart, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── 1. GLOBAL DESIGN CONSTANTS ───────────────────────────────────────
var P={bg:"#f8f9fc",card:"#fff",input:"#f3f4f8",bd:"#e0e3ea",bdS:"#c7cbd4",pri:"#1d4ed8",priBg:"#eef2ff",priTx:"#1e3a8a",tx:"#1a1f2e",txM:"#4b5563",txD:"#8992a3",gn:"#0d7a5f",gnBg:"#ecfdf5",rd:"#c93131",rdBg:"#fef2f2",bl:"#2563eb",blBg:"#eff6ff",hdr:"#111827",hdrTx:"#f0f1f4",secBg:"#f1f4f9",hlBg:"#e8eeff",hlTx:"#1e3a8a"};
var ff="'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
var mf="'SF Mono','Fira Code','Cascadia Code',Consolas,monospace";
var mClr=["#1d4ed8","#0d7a5f","#c93131","#7c3aed","#be185d","#0e7490"];

let _id = 100; const uid = () => "m" + (++_id);

// ─── 2. FORMATTING HELPERS ──────────────────────────────────────────────
const fmt = (v,d=2) => { if(v===""||v==null||isNaN(v)) return "—"; return Number(v).toLocaleString("en-AU",{minimumFractionDigits:d,maximumFractionDigits:d}); };
const fmtInt = v => fmt(v,0);
const fmtC2 = v => { if(v===""||v==null||isNaN(v)) return "—"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtCur = v => { if(v===""||v==null||isNaN(v)) return "—"; if(Math.abs(v)>=1e6) return "$"+(v/1e6).toFixed(2)+"M"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:0,maximumFractionDigits:0}); };

// ─── 3. EXPRESSION ENGINE ─────────────────────────────────────────────────
function tokenize(e){const t=[];let i=0;while(i<e.length){if(/\s/.test(e[i])){i++;continue}if(/[0-9.]/.test(e[i])){let n="";while(i<e.length&&/[0-9.eE\-]/.test(e[i]))n+=e[i++];t.push({type:"num",val:parseFloat(n)})}else if(/[a-zA-Z_]/.test(e[i])){let d="";while(i<e.length&&/[a-zA-Z_0-9]/.test(e[i]))d+=e[i++];t.push({type:"id",val:d})}else if("+-*/(),<>=!&|?:".includes(e[i])){let o=e[i++];if("<>=!".includes(o[0])&&e[i]==='=')o+=e[i++];if(o==='&'&&e[i]==='&')o+=e[i++];if(o==='|'&&e[i]==='|')o+=e[i++];t.push({type:"op",val:o})}else i++}return t}
function evalExpr(expr,ctx){try{const tk=tokenize(expr);let p=0;const pk=()=>tk[p]||null,eat=(v)=>{const t=tk[p];if(v&&t?.val!==v)throw 0;p++;return t};function pT(){let r=pO();if(pk()?.val==='?'){eat('?');const a=pT();eat(':');const b=pT();return r?a:b}return r}function pO(){let r=pA();while(pk()?.val==='||'){eat();r=r||pA()}return r}function pA(){let r=pC();while(pk()?.val==='&&'){eat();r=r&&pC()}return r}function pC(){let r=pAd();while(pk()?.val&&['<','>','<=','>=','==','!='].includes(pk().val)){const o=eat().val,b=pAd();r=o==='<'?r<b:o==='>'?r>b:o==='<='?r<=b:o==='>='?r>=b:o==='=='?r==b:r!=b}return r}function pAd(){let r=pM();while(pk()?.val==='+'||pk()?.val==='-'){const o=eat().val,b=pM();r=o==='+'?r+b:r-b}return r}function pM(){let r=pU();while(pk()?.val==='*'||pk()?.val==='/'){const o=eat().val,b=pU();r=o==='*'?r*b:r/b}return r}function pU(){if(pk()?.val==='-'){eat();return -pP()}return pP()}function pP(){const t=pk();if(!t)throw 0;if(t.type==="num"){eat();return t.val}if(t.val==='('){eat('(');const r=pT();eat(')');return r}if(t.type==="id"){const nm=eat().val;const fns={ceil:Math.ceil,floor:Math.floor,max:Math.max,min:Math.min,abs:Math.abs,round:Math.round,CEIL:Math.ceil,FLOOR:Math.floor,MAX:Math.max,MIN:Math.min,ABS:Math.abs,ROUND:Math.round,ROUNDUP:Math.ceil,ROUNDDOWN:Math.floor};if((nm==="IF"||nm==="if")&&pk()?.val==='('){eat('(');const c=pT();eat(',');const a=pT();eat(',');const b=pT();eat(')');return c?a:b}if(fns[nm]&&pk()?.val==='('){eat('(');const args=[pT()];while(pk()?.val===','){eat(',');args.push(pT())}eat(')');return fns[nm](...args)}if(ctx.hasOwnProperty(nm)){const v=ctx[nm];return typeof v==="number"?v:(parseFloat(v)||0)}return 0}throw 0}const result=pT();return isFinite(result)?result:""}catch{return ""}}

// ─── 4. CALC ENGINE ───────────────────────────────────────────────────────
function calcWithFormulas(inp,formulas){
  const{totalMined,oreMined,totalRampMined,avgLoadedTravelTime,avgUnloadedTravelTime,avgNetPower,avgTkphDelay,schedPeriod,calendarDays,calendarHours,truck:T,digger:D,other:O,fleet:F}=inp;
  if(!totalMined||totalMined<=0)return null;
  const pm=schedPeriod==="Quarterly"?0.25:schedPeriod==="Monthly"?1/12:1;
  const ctx={totalMined,oreMined,totalRampMined,avgLoadedTravelTime,avgUnloadedTravelTime,avgNetPower,avgTkphDelay,calendarDays,calendarHours,periodMultiplier:pm};
  for(const[k,v]of Object.entries(T))if(typeof v==="number")ctx["T_"+k]=v;
  for(const[k,v]of Object.entries(D))if(typeof v==="number")ctx["D_"+k]=v;
  for(const[k,v]of Object.entries(O))if(typeof v==="number")ctx["O_"+k]=v;
  if(F)for(const[k,v]of Object.entries(F))if(typeof v==="number")ctx["F_"+k]=v;
  const results={};
  for(const f of formulas){const val=evalExpr(f.formula,ctx);results[f.key]=val;ctx[f.key]=typeof val==="number"?val:0}
  return results;
}

// ─── 5. FACTORIES & CSV ───────────────────────────────────────────────
const mkTruck = (ov={}) => ({ id: uid(), truckName:"XCMG XGE150 Plus 10YMP", payload:85, powerSource:"Battery - Charge", batterySize:828, economicLife:80000, tkphLimit:254.2, availability:0.86, useOfAvailability:0.96, operatingEfficiency:0.79, utToSmuConversion:1.06, spotTimeLoad:0.46, queueTimeLoad:0, spotTimeDump:0.5, queueTimeDump:0, dumpTime:0.5, performanceEfficiency:0.99, totalTruckCapex:2185181.43, capexPerSmuHour:27.31, powerSystemCost:383890, opexPerSmuHour:156.54, operatorRate:133, nominalBatteryCapacityNew:828, averageBatteryUsableCapacity:563.04, travelToRechargeEnergy:10, travelToSwapChargerStationTime:2.96, chargerQueueTime:0, chargerConnectionPositioningTime:0, equivalentFullLifeCycles:4500, chargingTime:50, rechargeRateC:1.2, swapTotalSwapTime:14.5, chargerOperatingTime:6740.82, demandResponseAllowance:0, numBatteriesPerStation:1, totalChargerCapex:4703194.09, avgChargerEffectiveHours:6740.82, totalChargerOandO:70.19, ...ov });
const mkTruckL = () => mkTruck({ truckName:"Liebherr BET264 10ymp", payload:240, batterySize:2580, economicLife:84000, tkphLimit:1400, availability:0.88, useOfAvailability:0.936, operatingEfficiency:0.803, spotTimeLoad:0.46, queueTimeLoad:0, spotTimeDump:0.5, queueTimeDump:0, dumpTime:1.0, totalTruckCapex:11198255.71, capexPerSmuHour:133.31, powerSystemCost:2313980, opexPerSmuHour:478.80, nominalBatteryCapacityNew:2580, averageBatteryUsableCapacity:2037.5, travelToRechargeEnergy:17.4, equivalentFullLifeCycles:5950, chargingTime:33.18, rechargeRateC:2.0, totalChargerCapex:9722830, totalChargerOandO:143.25 });
const mkDigger = (ov={}) => ({ id: uid(), diggerName:"300t Cable Electric Backhoe", powerSource:"Cable Electric", availability:0.90, useOfAvailability:0.83, operatingEfficiency:0.38, utToSmuConversion:1.03, equipmentLife:80000, effectiveTime:2487, effectiveDigRate:2800, totalCapex:8995710, capexPerSmuHour:112.45, dieselElectricityCost:86.6, maintenanceLabour:91, oilAndCoolant:12.6, partsComponentsPM05:223, materialsConsumables:0, get:76.5, cableCost:2.4, tracks:0, tires:0, fmsLicenseFee:42.99, batteryReplacement:0, operatorCost:130, rehandleCostPerTonne:1.13, ...ov });
const mkDigger4 = () => mkDigger({ diggerName:"400t Cable Electric Backhoe", effectiveDigRate:5100, totalCapex:13698717.31, capexPerSmuHour:171.23, dieselElectricityCost:108.21, oilAndCoolant:21, partsComponentsPM05:304, get:90 });
const defaultOther = () => ({ moistureContent:0.052, exchangeRate:0.70, discountRate:0.115, electricityCost:0.1443, dieselCost:0.9102, allInFitterPerYear:182, mannedOperator:133, calendarTime:8760, diggerFleetRoundingThreshold:0.5 });
const mkFleet = (name,truckIdx=0,diggerIdx=0) => ({ id:uid(), name, truckIdx, diggerIdx, loadTime:1.0 });

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

const PHYS_FIELDS = [
  {key:"oreMined",label:"Ore Mined",unit:"t"}, {key:"wasteMined",label:"Waste Mined",unit:"t"}, {key:"totalMined",label:"Total Mined (driver)",unit:"t"},
  {key:"totalRampMined",label:"Ramp Build Tonnes",unit:"t"}, {key:"avgLoadedTravelTime",label:"Loaded Travel Time",unit:"min"},
  {key:"avgUnloadedTravelTime",label:"Unloaded Travel Time",unit:"min"}, {key:"avgTkphDelay",label:"TKPH Delay",unit:"min"},
  {key:"avgNetPower",label:"Net Power",unit:"kWh"}, {key:"oreFePct",label:"Ore Fe %",unit:"%"},
  {key:"oreSiPct",label:"Ore Si %",unit:"%"}, {key:"oreAlPct",label:"Ore Al %",unit:"%"}, {key:"orePPct",label:"Ore P %",unit:"%"}
];

const mkScenario = (name="New Scenario") => ({
  id: uid(), name, csvData: null, csvRawLabels: [],
  manualData: [{period:1,periodLabel:"2032/Q2",days:91,hours:2184,oreMined:0,wasteMined:77261,totalMined:77261,totalRampMined:77261,avgLoadedTravelTime:3.3,avgUnloadedTravelTime:2.5,avgTkphDelay:0,avgNetPower:255.9,oreFePct:61.5,oreSiPct:3.7,oreAlPct:2.2,orePPct:0.08}],
  fieldMappings: [{id:uid(),name:"Base Set",fields:{oreMined:"Ore Mined",wasteMined:"Waste Mined",totalMined:"Total Mined",totalRampMined:"Total Mined",avgLoadedTravelTime:"Average loaded travel time",avgUnloadedTravelTime:"Average unloaded travel time",avgTkphDelay:"Average TKPH delay",avgNetPower:"Average Net Power",oreFePct:"Ore Fe %",oreSiPct:"Ore Si %",oreAlPct:"Ore Al %",orePPct:"Ore P %"}}],
  activeFleetIds: [], fleetPhysicalSets: {}, schedPeriod: "Quarterly", unitMul: 1,
});

const defaultFormulas = () => [
  {key:"digOE",label:"Digger Overall Efficiency",unit:"ratio",section:"⛏️ DIGGER — Hours & Fleet",group:"Digger TUM",formula:"D_availability * D_useOfAvailability * D_operatingEfficiency",dec:4},
  {key:"digHrsReq",label:"Digger Hours Required",unit:"hrs",group:"Digger TUM",formula:"totalMined / D_effectiveDigRate"},
  {key:"smuHrs",label:"Digger SMU Hours",unit:"hrs",group:"Digger TUM",formula:"(digHrsReq / digOE) * D_utToSmuConversion"},
  {key:"digQty",label:"Digger Qty per Period",unit:"#",group:"Fleet Sizing",formula:"digHrsReq / (D_effectiveTime * periodMultiplier)",dec:3},
  {key:"digFleet",label:"Digger Fleet Required",unit:"#",group:"Fleet Sizing",formula:"IF(digQty <= 0, 0, IF((digQty - floor(digQty)) > O_diggerFleetRoundingThreshold, CEIL(digQty), MAX(1, floor(digQty))))",hl:1},
  {key:"digCapex",label:"Digger Capex",unit:"AUD",group:"Fleet Sizing",formula:"digFleet * D_totalCapex",cur:1},
  {key:"digOpxDiesel",label:"Diesel/Electricity",unit:"AUD",section:"⛏️ DIGGER — Opex",group:"Line Items",formula:"smuHrs * D_dieselElectricityCost",cur:1},
  {key:"digOpxTotal",label:"Total Digger Opex (exc Cpx)",unit:"AUD",group:"Totals",formula:"smuHrs * (D_dieselElectricityCost + D_maintenanceLabour + D_oilAndCoolant + D_partsComponentsPM05 + D_get + D_operatorCost + D_fmsLicenseFee)",hl:1,cur:1},
  {key:"digCostActivity",label:"Total Digger Cost (inc Cpx)",unit:"AUD",group:"Totals",formula:"digOpxTotal + (smuHrs * D_capexPerSmuHour)",hl:1,cur:1},
  {key:"digRehandle",label:"Digger Rehandle",unit:"AUD",group:"Totals",formula:"D_rehandleCostPerTonne * oreMined",cur:1},
  {key:"spotLoadQueueDump",label:"Spot/Load/Queue/Dump",unit:"min",section:"🚛 TRUCK — Cycle & Charging",group:"Cycle",formula:"T_spotTimeLoad + T_queueTimeLoad + F_loadTime + T_spotTimeDump + T_queueTimeDump + T_dumpTime",hl:1},
  {key:"productivity",label:"Productivity",unit:"tph",group:"Output",formula:"T_payload / ((spotLoadQueueDump + avgLoadedTravelTime + avgUnloadedTravelTime + avgTkphDelay) / 60)",hl:1},
  {key:"trkReqR",label:"Trucks Required (rnd)",unit:"#",group:"Fleet",formula:"CEIL(totalRampMined / productivity / calendarHours)",hl:1},
  {key:"totTrk",label:"Total Truck Cost",unit:"AUD",group:"Truck Totals",formula:"(T_opexPerSmuHour + T_capexPerSmuHour) * (totalRampMined / productivity * T_utToSmuConversion)",hl:1,cur:1},
  {key:"totCost",label:"Total Scenario Cost",unit:"AUD",section:"🏆 GRAND TOTAL",group:"Inc Capex",formula:"totTrk + digCostActivity + digRehandle",hl:1,cur:1},
  {key:"totPerT",label:"Total $/t",unit:"$/t",group:"Inc Capex",formula:"totCost / totalRampMined",hl:1,cur:1},
];

// ─── 6. UI COMPONENTS ──────────────────────────────────────────────────
const ST=({children,icon})=>(<div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 0 10px",marginTop:20,borderBottom:`2px solid ${P.pri}`,marginBottom:14}}><span style={{fontSize:18}}>{icon}</span><span style={{color:P.pri,fontWeight:700,fontSize:15,fontFamily:ff}}>{children}</span></div>);
const Btn=({children,onClick,color=P.pri,small,solid})=>(<button onClick={onClick} style={{padding:small?"5px 12px":"8px 20px",background:solid?color:"transparent",border:`1.5px solid ${color}`,borderRadius:7,color:solid?"#fff":color,fontFamily:ff,fontSize:12,cursor:"pointer",fontWeight:600}}>{children}</button>);
const cardS={background:P.card,borderRadius:10,border:`1px solid ${P.bd}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"};
const selS={padding:"6px 12px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:ff,fontSize:12};
const thS={padding:"9px 10px",color:P.txM,textAlign:"left",fontSize:11,fontWeight:600};

// ─── 7. MAIN APP ───────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("scenarios");
  const [trucks,setTrucks]=useState(()=>[mkTruck(),mkTruckL()]);
  const [diggers,setDiggers]=useState(()=>[mkDigger(),mkDigger4()]);
  const [otherA,setOtherA]=useState(defaultOther);
  const [formulas,setFormulas]=useState(defaultFormulas);
  const [fleets,setFleets]=useState(()=>[mkFleet("Fleet 1",0,0),mkFleet("Fleet 2",1,1)]);
  const [scenarios,setScenarios]=useState(()=>[mkScenario("Scenario ST"),mkScenario("Scenario LT")]);
  const [activeScnIdx,setActiveScnIdx]=useState(0);
  const fileRef=useRef();

  const scn=scenarios[activeScnIdx]||scenarios[0];
  const updScn=(fn)=>setScenarios(prev=>{const n=[...prev];n[activeScnIdx]=fn({...n[activeScnIdx]});return n});

  const activeFleets=fleets.filter(f=>scn.activeFleetIds.length===0||scn.activeFleetIds.includes(f.id));

  const results=useMemo(()=>{
    const all=[];
    const currentPeriods = scn.csvData ? scn.csvData.np : scn.manualData.length;
    for(let pi=0;pi<currentPeriods;pi++){
      for(const fleet of activeFleets){
        const pd= (scn.csvData ? {periodLabel:scn.csvData.gs("Period",pi)||`P${pi+1}`, totalMined:scn.csvData.gv("Total Mined",pi), days:scn.csvData.gv("Days",pi)||91} : scn.manualData[pi]);
        if(!pd)continue;
        const ti=Math.min(fleet.truckIdx,trucks.length-1), di=Math.min(fleet.diggerIdx,diggers.length-1);
        const res=calcWithFormulas({totalMined:(pd.totalMined||0)*scn.unitMul,oreMined:(pd.oreMined||0)*scn.unitMul,totalRampMined:(pd.totalRampMined||pd.totalMined||0)*scn.unitMul,avgLoadedTravelTime:pd.avgLoadedTravelTime||0,avgUnloadedTravelTime:pd.avgUnloadedTravelTime||0,avgNetPower:pd.avgNetPower||0,avgTkphDelay:pd.avgTkphDelay||0,schedPeriod:scn.schedPeriod,calendarDays:pd.days||91,calendarHours:pd.hours||2184,truck:trucks[ti],digger:diggers[di],other:otherA,fleet:fleet},formulas);
        all.push({pi,periodLabel:pd.periodLabel||`P${pi+1}`,fleet,res,pd,truckName:trucks[ti].truckName,diggerName:diggers[di].diggerName});
      }
    }
    return all;
  }, [activeFleets, trucks, diggers, otherA, formulas, scn]);

  const totals=useMemo(()=>{const t={m:0,c:0};results.forEach(r=>{if(!r.res)return;t.m+=(r.pd?.totalMined||0)*scn.unitMul;t.c+=r.res.totCost||0});t.cpt=t.m>0?t.c/t.m:0;return t},[results,scn.unitMul]);

  const navGroups=[
    {label:"Assumptions",items:[{id:"other",label:"General",icon:"⚙️"},{id:"truck",label:"Trucks",icon:"🚛"},{id:"digger",label:"Diggers",icon:"⛏️"}]},
    {label:"Setup",items:[{id:"scenarios",label:"Scenarios",icon:"📋"}]},
    {label:"Results",items:[{id:"results",label:"Results",icon:"📊"}]}
  ];
  const activeGroup=navGroups.find(g=>g.items.some(i=>i.id===page))||navGroups[0];

  return(
    <div style={{minHeight:"100vh",background:P.bg,color:P.tx,fontFamily:ff}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{background:P.hdr,padding:"12px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⛏️</div>
          <h1 style={{margin:0,fontSize:17,fontWeight:700,color:P.hdrTx}}>Mining Fleet Cost Engine</h1>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <select value={activeScnIdx} onChange={e=>setActiveScnIdx(parseInt(e.target.value))} style={{padding:"6px 14px",background:"#1f2937",border:"1px solid #374151",borderRadius:6,color:"#60a5fa",fontFamily:ff,fontSize:13,fontWeight:700}}>
            {scenarios.map((s,i)=><option key={i} value={i}>{s.name}</option>)}
          </select>
          {totals.c>0&&(<>
            <div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>$/Tonne</div><div style={{color:"#60a5fa",fontSize:20,fontWeight:800,fontFamily:mf}}>{fmtC2(totals.cpt)}</div></div>
            <div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Total</div><div style={{color:P.hdrTx,fontSize:15,fontWeight:700,fontFamily:mf}}>{fmtCur(totals.c)}</div></div>
          </>) }
        </div>
      </div>
      <div style={{display:"flex",padding:"0 32px",background:"#1f2937",overflowX:"auto"}}>
        {navGroups.map(g=>{const isA=g===activeGroup;return(<button key={g.label} onClick={()=>setPage(g.items[0].id)} style={{padding:"10px 24px",background:isA?"rgba(255,255,255,0.08)":"transparent",border:"none",borderBottom:isA?"2px solid #60a5fa":"2px solid transparent",color:isA?"#f0f1f4":"#9ca3af",fontFamily:ff,fontSize:13,fontWeight:isA?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>{g.label}</button>)})}
      </div>
      <div style={{display:"flex",padding:"0 32px",background:P.card,borderBottom:"1px solid "+P.bd,overflowX:"auto"}}>
        {activeGroup.items.map(n=>(<button key={n.id} onClick={()=>setPage(n.id)} style={{padding:"11px 20px",background:"transparent",border:"none",borderBottom:page===n.id?"3px solid "+P.pri:"3px solid transparent",color:page===n.id?P.pri:P.txD,fontFamily:ff,fontSize:12,fontWeight:page===n.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}><span style={{marginRight:6}}>{n.icon}</span>{n.label}</button>))}
      </div>

      <div style={{padding:"20px 32px 60px",maxWidth:1600,margin:"0 auto"}}>
        {/* SCENARIOS PAGE RESTORED */}
        {page==="scenarios"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><ST icon="📋">Scenario Manager</ST><Btn onClick={()=>setScenarios(p=>[...p,mkScenario(`Scenario ${p.length+1}`)])} solid>+ New Scenario</Btn></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))",gap:16}}>{scenarios.map((s,si)=>(
              <div key={s.id} style={{...cardS,padding:20,border:si===activeScnIdx?`2px solid ${P.pri}`:`1px solid ${P.bd}`}}>
                <input type="text" value={s.name} onChange={e=>setScenarios(p=>{const n=[...p];n[si]={...n[si],name:e.target.value};return n})} style={{padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.pri,fontFamily:ff,fontSize:16,fontWeight:700,width:200}}/>
                <div style={{fontSize:12,color:P.txM,marginTop:10}}>📅 {s.csvData?`${s.csvData.np} periods`:`${s.manualData.length} manual periods`}</div>
                <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>setActiveScnIdx(si)} solid={si===activeScnIdx} color={si===activeScnIdx?P.pri:P.txD} small>{si===activeScnIdx?"Active":"Select"}</Btn></div>
              </div>))}</div>
        </div>)}

        {/* RESULTS PAGE RESTORED */}
        {page==="results"&&(<div>
          <ST icon="📊">Results — {scn.name}</ST>
          {results.reduce((acc, r) => {
              if(!acc.find(g => g.key === `${r.truckName}-${r.diggerName}`)) {
                acc.push({key: `${r.truckName}-${r.diggerName}`, truckName: r.truckName, diggerName: r.diggerName, periods: results.filter(x => x.truckName === r.truckName && x.diggerName === r.diggerName)});
              }
              return acc;
            }, []).map(grp => (
              <div key={grp.key} style={{marginBottom:28}}>
                <div style={{padding:"10px 16px",background:P.priBg,borderRadius:"8px 8px 0 0",border:`1px solid ${P.pri}22`}}>
                  <span style={{color:P.pri,fontWeight:700,fontSize:14}}>{grp.truckName} + {grp.diggerName}</span>
                </div>
                <div style={{...cardS,overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontFamily:ff,fontSize:12,width:"100%",minWidth:600}}>
                  <thead><tr style={{background:P.secBg,borderBottom:`2px solid ${P.bdS}`}}><th style={thS}>Variable</th><th style={thS}>Unit</th>{grp.periods.map((r,i)=><th key={i} style={{...thS,textAlign:"right"}}>{r.periodLabel}</th>)}</tr></thead>
                  <tbody>{formulas.map(f=>(<tr key={f.key} style={{borderBottom:`1px solid ${P.bd}`}}><td style={{padding:"5px 10px"}}>{f.label}</td><td style={{padding:"5px 6px"}}>{f.unit}</td>{grp.periods.map((r,pi)=>(<td key={pi} style={{padding:"5px 8px",textAlign:"right"}}>{f.cur?fmtC2(r.res?.[f.key]):fmt(r.res?.[f.key],f.dec||2)}</td>))}</tr>))}</tbody>
                </table></div>
              </div>
          ))}
        </div>)}

        {/* GENERAL ASSUMPTIONS RESTORED */}
        {page==="other"&&(<div><ST icon="⚙️">General Assumptions</ST><div style={{...cardS,padding:24}}>
          {[["moistureContent","Moisture Content","%",0.001],["exchangeRate","Exchange Rate (AUD:USD)","ratio",0.01],["discountRate","Discount Rate","%",0.005],["electricityCost","Electricity Cost","$/kWh",0.001],["dieselCost","Diesel Cost","$/L",0.01],["allInFitterPerYear","All-in Fitter Rate","$/hr"],["mannedOperator","Manned Operator","$/SMU"],["calendarTime","Calendar Time","hrs/yr"],["diggerFleetRoundingThreshold","Digger Rounding","frac",0.05]].map(([k,l,u,s])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}><div style={{flex:1,color:P.txM,fontSize:14,fontWeight:500}}>{l}</div><input type="number" value={otherA[k]} onChange={e=>uO(k,parseFloat(e.target.value)||0)} step={s||0.01} style={{width:145,padding:"7px 12px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:7,color:P.tx,fontFamily:mf,fontSize:14,textAlign:"right"}}/><span style={{color:P.txD,fontSize:12,fontWeight:500,minWidth:55}}>{u}</span></div>))}
        </div></div>)}
      </div>
    </div>
  );
}
