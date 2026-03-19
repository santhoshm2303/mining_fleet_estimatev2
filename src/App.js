/* eslint-disable no-unused-vars */
import { useState, useMemo, useCallback, useRef } from "react";
import { ComposedChart, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── 1. DESIGN CONSTANTS ──────────────────────────────────────────────
var P={bg:"#f8f9fc",card:"#fff",input:"#f3f4f8",bd:"#e0e3ea",bdS:"#c7cbd4",pri:"#1d4ed8",priBg:"#eef2ff",priTx:"#1e3a8a",tx:"#1a1f2e",txM:"#4b5563",txD:"#8992a3",gn:"#0d7a5f",gnBg:"#ecfdf5",rd:"#c93131",rdBg:"#fef2f2",bl:"#2563eb",blBg:"#eff6ff",hdr:"#111827",hdrTx:"#f0f1f4",secBg:"#f1f4f9",hlBg:"#e8eeff",hlTx:"#1e3a8a"};
var ff="'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
var mf="'SF Mono','Fira Code','Cascadia Code',Consolas,monospace";
var mClr=["#1d4ed8","#0d7a5f","#c93131","#7c3aed","#be185d","#0e7490"];

let _id = 100; const uid = () => "m" + (++_id);

// ─── 2. MODEL FACTORIES (MUST BE DEFINED BEFORE APP) ───────────────────
const mkTruck = (ov={}) => ({ id: uid(), truckName:"XCMG XGE150 Plus 10YMP", payload:85, powerSource:"Battery - Charge", batterySize:828, economicLife:80000, tkphLimit:254.2, availability:0.86, useOfAvailability:0.96, operatingEfficiency:0.79, utToSmuConversion:1.06, spotTimeLoad:0.46, queueTimeLoad:0, spotTimeDump:0.5, queueTimeDump:0, dumpTime:0.5, performanceEfficiency:0.99, totalTruckCapex:2185181.43, capexPerSmuHour:27.31, powerSystemCost:383890, opexPerSmuHour:156.54, operatorRate:133, nominalBatteryCapacityNew:828, averageBatteryUsableCapacity:563.04, travelToRechargeEnergy:10, travelToSwapChargerStationTime:2.96, chargerQueueTime:0, chargerConnectionPositioningTime:0, equivalentFullLifeCycles:4500, chargingTime:50, rechargeRateC:1.2, swapTotalSwapTime:14.5, chargerOperatingTime:6740.82, demandResponseAllowance:0, numBatteriesPerStation:1, totalChargerCapex:4703194.09, avgChargerEffectiveHours:6740.82, totalChargerOandO:70.19, ...ov });

const mkTruckL = () => mkTruck({ truckName:"Liebherr BET264 10ymp", payload:240, batterySize:2580, economicLife:84000, tkphLimit:1400, availability:0.88, useOfAvailability:0.936, operatingEfficiency:0.803, spotTimeLoad:0.46, queueTimeLoad:0, spotTimeDump:0.5, queueTimeDump:0, dumpTime:1.0, totalTruckCapex:11198255.71, capexPerSmuHour:133.31, powerSystemCost:2313980, opexPerSmuHour:478.80, nominalBatteryCapacityNew:2580, averageBatteryUsableCapacity:2037.5, travelToRechargeEnergy:17.4, equivalentFullLifeCycles:5950, chargingTime:33.18, rechargeRateC:2.0, totalChargerCapex:9722830, totalChargerOandO:143.25 });

const mkDigger = (ov={}) => ({ id: uid(), diggerName:"300t Cable Electric Backhoe", powerSource:"Cable Electric", availability:0.90, useOfAvailability:0.83, operatingEfficiency:0.38, utToSmuConversion:1.03, equipmentLife:80000, effectiveTime:2487, effectiveDigRate:2800, totalCapex:8995710, capexPerSmuHour:112.45, dieselElectricityCost:86.6, maintenanceLabour:91, oilAndCoolant:12.6, partsComponentsPM05:223, materialsConsumables:0, get:76.5, cableCost:2.4, tracks:0, tires:0, fmsLicenseFee:42.99, batteryReplacement:0, operatorCost:130, rehandleCostPerTonne:1.13, ...ov });

const mkDigger4 = () => mkDigger({ diggerName:"400t Cable Electric Backhoe", effectiveDigRate:5100, totalCapex:13698717.31, capexPerSmuHour:171.23, dieselElectricityCost:108.21, oilAndCoolant:21, partsComponentsPM05:304, get:90 });

const defaultOther = () => ({ moistureContent:0.052, exchangeRate:0.70, discountRate:0.115, electricityCost:0.1443, dieselCost:0.9102, allInFitterPerYear:182, mannedOperator:133, calendarTime:8760, diggerFleetRoundingThreshold:0.5 });

const mkFleet = (name,truckIdx=0,diggerIdx=0) => ({ id:uid(), name, truckIdx, diggerIdx, loadTime:1.0 });

const mkScenario = (name="New Scenario") => ({
  id: uid(), name,
  csvData: null, csvRawLabels: [],
  manualData: [{period:1,periodLabel:"2032/Q2",days:91,hours:2184,oreMined:0,wasteMined:77261,totalMined:77261,totalRampMined:77261,avgLoadedTravelTime:3.3,avgUnloadedTravelTime:2.5,avgTkphDelay:0,avgNetPower:255.9,oreFePct:61.5,oreSiPct:3.7,oreAlPct:2.2,orePPct:0.08}],
  fieldMappings: [{id:uid(),name:"Base Set",fields:{oreMined:"Ore Mined",wasteMined:"Waste Mined",totalMined:"Total Mined",totalRampMined:"Total Mined",avgLoadedTravelTime:"Average loaded travel time",avgUnloadedTravelTime:"Average unloaded travel time",avgTkphDelay:"Average TKPH delay",avgNetPower:"Average Net Power",oreFePct:"Ore Fe %",oreSiPct:"Ore Si %",oreAlPct:"Ore Al %",orePPct:"Ore P %"}}],
  activeFleetIds: [], fleetPhysicalSets: {}, schedPeriod: "Quarterly", unitMul: 1
});

// ─── 3. HELPERS & ENGINE ────────────────────────────────────────────────
const fmt = (v,d=2) => { if(v===""||v==null||isNaN(v)) return "—"; return Number(v).toLocaleString("en-AU",{minimumFractionDigits:d,maximumFractionDigits:d}); };
const fmtInt = v => fmt(v,0);
const fmtC2 = v => { if(v===""||v==null||isNaN(v)) return "—"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtCur = v => { if(v===""||v==null||isNaN(v)) return "—"; if(Math.abs(v)>=1e6) return "$"+(v/1e6).toFixed(2)+"M"; return "$"+Number(v).toLocaleString("en-AU",{minimumFractionDigits:0,maximumFractionDigits:0}); };

function tokenize(e){const t=[];let i=0;while(i<e.length){if(/\s/.test(e[i])){i++;continue}if(/[0-9.]/.test(e[i])){let n="";while(i<e.length&&/[0-9.eE\-]/.test(e[i]))n+=e[i++];t.push({type:"num",val:parseFloat(n)})}else if(/[a-zA-Z_]/.test(e[i])){let d="";while(i<e.length&&/[a-zA-Z_0-9]/.test(e[i]))d+=e[i++];t.push({type:"id",val:d})}else if("+-*/(),<>=!&|?:".includes(e[i])){let o=e[i++];if("<>=!".includes(o[0])&&e[i]==='=')o+=e[i++];if(o==='&'&&e[i]==='&')o+=e[i++];if(o==='|'&&e[i]==='|')o+=e[i++];t.push({type:"op",val:o})}else i++}return t}
function evalExpr(expr,ctx){try{const tk=tokenize(expr);let p=0;const pk=()=>tk[p]||null,eat=(v)=>{const t=tk[p];if(v&&t?.val!==v)throw 0;p++;return t};function pT(){let r=pO();if(pk()?.val==='?'){eat('?');const a=pT();eat(':');const b=pT();return r?a:b}return r}function pO(){let r=pA();while(pk()?.val==='||'){eat();r=r||pA()}return r}function pA(){let r=pC();while(pk()?.val==='&&'){eat();r=r&&pC()}return r}function pC(){let r=pAd();while(pk()?.val&&['<','>','<=','>=','==','!='].includes(pk().val)){const o=eat().val,b=pAd();r=o==='<'?r<b:o==='>'?r>b:o==='<='?r<=b:o==='>='?r>=b:o==='=='?r==b:r!=b}return r}function pAd(){let r=pM();while(pk()?.val==='+'||pk()?.val==='-'){const o=eat().val,b=pM();r=o==='+'?r+b:r-b}return r}function pM(){let r=pU();while(pk()?.val==='*'||pk()?.val==='/'){const o=eat().val,b=pU();r=o==='*'?r*b:r/b}return r}function pU(){if(pk()?.val==='-'){eat();return -pP()}return pP()}function pP(){const t=pk();if(!t)throw 0;if(t.type==="num"){eat();return t.val}if(t.val==='('){eat('(');const r=pT();eat(')');return r}if(t.type==="id"){const nm=eat().val;const fns={ceil:Math.ceil,floor:Math.floor,max:Math.max,min:Math.min,abs:Math.abs,round:Math.round,CEIL:Math.ceil,FLOOR:Math.floor,MAX:Math.max,MIN:Math.min,ABS:Math.abs,ROUND:Math.round,ROUNDUP:Math.ceil,ROUNDDOWN:Math.floor};if((nm==="IF"||nm==="if")&&pk()?.val==='('){eat('(');const c=pT();eat(',');const a=pT();eat(',');const b=pT();eat(')');return c?a:b}if(fns[nm]&&pk()?.val==='('){eat('(');const args=[pT()];while(pk()?.val===','){eat(',');args.push(pT())}eat(')');return fns[nm](...args)}if(ctx.hasOwnProperty(nm)){const v=ctx[nm];return typeof v==="number"?v:(parseFloat(v)||0)}return 0}throw 0}const result=pT();return isFinite(result)?result:""}catch{return ""}}

const defaultFormulas = () => [
  {key:"digOE",label:"Digger Overall Efficiency",unit:"ratio",section:"⛏️ DIGGER — Hours & Fleet",group:"Digger TUM",formula:"D_availability * D_useOfAvailability * D_operatingEfficiency",dec:4},
  {key:"digHrsReq",label:"Digger Hours Required",unit:"hrs",group:"Digger TUM",formula:"totalMined / D_effectiveDigRate"},
  {key:"smuHrs",label:"Digger SMU Hours",unit:"hrs",group:"Digger TUM",formula:"(digHrsReq / digOE) * D_utToSmuConversion"},
  {key:"digQty",label:"Digger Qty per Period",unit:"#",group:"Fleet Sizing",formula:"digHrsReq / (D_effectiveTime * periodMultiplier)",dec:3},
  {key:"digFleet",label:"Digger Fleet Required",unit:"#",group:"Fleet Sizing",formula:"IF(digQty <= 0, 0, IF((digQty - floor(digQty)) > O_diggerFleetRoundingThreshold, CEIL(digQty), MAX(1, floor(digQty))))",hl:1},
  {key:"digCapex",label:"Digger Capex",unit:"AUD",group:"Fleet Sizing",formula:"digFleet * D_totalCapex",cur:1},
  {key:"digOpxDiesel",label:"Diesel/Electricity",unit:"AUD",section:"⛏️ DIGGER — Opex",group:"Line Items",formula:"smuHrs * D_dieselElectricityCost",cur:1},
  {key:"digOpxMaint",label:"Maintenance Labour",unit:"AUD",group:"Line Items",formula:"smuHrs * D_maintenanceLabour",cur:1},
  {key:"digOpxOil",label:"Oil & Coolant",unit:"AUD",group:"Line Items",formula:"smuHrs * D_oilAndCoolant",cur:1},
  {key:"digOpxParts",label:"Parts & Components PM05",unit:"AUD",group:"Line Items",formula:"smuHrs * D_partsComponentsPM05",cur:1},
  {key:"digOpxMaterials",label:"Materials & Consumables",unit:"AUD",group:"Line Items",formula:"smuHrs * D_materialsConsumables",cur:1},
  {key:"digOpxGET",label:"GET",unit:"AUD",group:"Line Items",formula:"smuHrs * D_get",cur:1},
  {key:"digOpxCable",label:"Cable Cost",unit:"AUD",group:"Line Items",formula:"smuHrs * D_cableCost",cur:1},
  {key:"digOpxTracks",label:"Tracks",unit:"AUD",group:"Line Items",formula:"smuHrs * D_tracks",cur:1},
  {key:"digOpxTires",label:"Tires",unit:"AUD",group:"Line Items",formula:"smuHrs * D_tires",cur:1},
  {key:"digOpxFMS",label:"FMS License & Support",unit:"AUD",group:"Line Items",formula:"smuHrs * D_fmsLicenseFee",cur:1},
  {key:"digOpxBattery",label:"Battery Replacement",unit:"AUD",group:"Line Items",formula:"smuHrs * D_batteryReplacement",cur:1},
  {key:"digOpxOperator",label:"Operator Cost",unit:"AUD",group:"Line Items",formula:"smuHrs * D_operatorCost",cur:1},
  {key:"digOpxTotal",label:"Total Digger Opex (exc Cpx)",unit:"AUD",group:"Totals",formula:"digOpxDiesel+digOpxMaint+digOpxOil+digOpxParts+digOpxMaterials+digOpxGET+digOpxCable+digOpxTracks+digOpxTires+digOpxFMS+digOpxBattery+digOpxOperator",hl:1,cur:1},
  {key:"digOpxPerT",label:"Digger Opex/Tonne",unit:"$/t",group:"Totals",formula:"digOpxTotal / totalMined",cur:1},
  {key:"digOpxIncCpx",label:"Opex inc Capex/Tonne",unit:"$/t",group:"Totals",formula:"(digOpxTotal + smuHrs * D_capexPerSmuHour) / totalMined",cur:1},
  {key:"digCostActivity",label:"Total Digger Cost (inc Cpx)",unit:"AUD",group:"Totals",formula:"digOpxIncCpx * totalMined",hl:1,cur:1},
  {key:"digRehandle",label:"Digger Rehandle",unit:"AUD",group:"Totals",formula:"D_rehandleCostPerTonne * oreMined",cur:1},
  {key:"spotLoadQueueDump",label:"Spot/Load/Queue/Dump",unit:"min",section:"🚛 TRUCK — Cycle & Charging",group:"Cycle",formula:"T_spotTimeLoad + T_queueTimeLoad + F_loadTime + T_spotTimeDump + T_queueTimeDump + T_dumpTime",hl:1},
  {key:"cycleTime",label:"Total Cycle Time",unit:"min",group:"Cycle",formula:"spotLoadQueueDump + avgLoadedTravelTime + avgUnloadedTravelTime + avgTkphDelay"},
  {key:"energyBurn",label:"Energy Burn Rate",unit:"kWh/hr",group:"Cycle",formula:"avgNetPower / (cycleTime / 60)"},
  {key:"cycPerChg",label:"Cycles per Charge",unit:"#",group:"Charging",formula:"T_averageBatteryUsableCapacity / avgNetPower",dec:3},
  {key:"cycPerChgRD",label:"Cycles/Charge (Round Down)",unit:"#",group:"Charging",formula:"IF(cycPerChg <= 0, 0, IF(cycPerChg < 1, 1, floor(cycPerChg)))"},
  {key:"incompCyc",label:"Incomplete Cycles",unit:"#",group:"Charging",formula:"IF(cycPerChg == 0, 0, CEIL(1/cycPerChg)*cycPerChg - cycPerChgRD)",dec:4},
  {key:"batEngBefore",label:"Battery Energy Before Travel",unit:"kWh",group:"Eff Capacity",formula:"incompCyc * avgNetPower"},
  {key:"travRchgE",label:"Travel to Recharge Energy",unit:"kWh",group:"Eff Capacity",formula:"T_travelToRechargeEnergy"},
  {key:"effUsableCap",label:"Effective Usable Capacity",unit:"kWh",group:"Eff Capacity",formula:"IF(T_averageBatteryUsableCapacity==0,0,IF(travRchgE<batEngBefore,T_averageBatteryUsableCapacity-(batEngBefore-travRchgE),T_averageBatteryUsableCapacity-(avgNetPower+batEngBefore-travRchgE))+IF(cycPerChg==0,0,floor(1/cycPerChg))*T_averageBatteryUsableCapacity)",hl:1},
  {key:"effCycPerChg",label:"Effective Cycles/Charge",unit:"#",group:"Eff Capacity",formula:"IF(cycPerChg<1,cycPerChg,IF(travRchgE<batEngBefore,cycPerChgRD,cycPerChgRD-1))",dec:3},
  {key:"pctRchg",label:"% Battery Recharged",unit:"%",group:"Recharge",formula:"effUsableCap / T_averageBatteryUsableCapacity",dec:4},
  {key:"nomRchgT",label:"Nominal Recharge Time",unit:"min",group:"Recharge",formula:"T_chargingTime"},
  {key:"actRchgT",label:"Actual Recharge Time",unit:"min",group:"Recharge",formula:"pctRchg * nomRchgT"},
  {key:"totRchgT",label:"Total Recharge Time",unit:"min",group:"Recharge",formula:"IF(cycPerChg==0,0,actRchgT+(T_travelToSwapChargerStationTime*CEIL(1/effCycPerChg)+T_chargerQueueTime+T_chargerConnectionPositioningTime)*IF(cycPerChg<1,CEIL(1/cycPerChg),1))"},
  {key:"rchgPerHaul",label:"Recharges/Haul Cycle",unit:"#",group:"Per Cycle",formula:"1 / effCycPerChg",dec:4},
  {key:"totRchgPerCyc",label:"Total Recharge Time/Cycle",unit:"min",group:"Per Cycle",formula:"totRchgT * IF(cycPerChg < 1, 1, rchgPerHaul)"},
  {key:"swpRchgPerCyc",label:"Swap/Recharge Time/Cycle",unit:"min",section:"📊 TRUCK — Productivity",group:"Time Build-up",formula:"totRchgPerCyc"},
  {key:"effCycT",label:"Effective Cycle Time",unit:"min",group:"Time Build-up",formula:"spotLoadQueueDump + avgLoadedTravelTime + avgUnloadedTravelTime"},
  {key:"prodCycT",label:"Productive Cycle Time",unit:"min",group:"Time Build-up",formula:"effCycT / T_performanceEfficiency"},
  {key:"icEffNoTKPH",label:"In-Cycle Eff No TKPH",unit:"ratio",group:"Efficiency",formula:"T_operatingEfficiency / T_performanceEfficiency",dec:4},
  {key:"utNoTKPH",label:"Utilised Time No TKPH",unit:"min",group:"Efficiency",formula:"prodCycT / icEffNoTKPH"},
  {key:"utIncTKPH",label:"Utilised Time Inc TKPH",unit:"min",group:"Efficiency",formula:"utNoTKPH + avgTkphDelay"},
  {key:"icEffIncTKPH",label:"In-Cycle Eff Inc TKPH",unit:"ratio",group:"Efficiency",formula:"prodCycT / utIncTKPH",dec:4},
  {key:"avCycNoChg",label:"Available Cycle No Charging",unit:"min",group:"Availability",formula:"utIncTKPH / T_useOfAvailability"},
  {key:"avCycIncChg",label:"Available Cycle Inc Charging",unit:"min",group:"Availability",formula:"avCycNoChg + swpRchgPerCyc"},
  {key:"uoaAfter",label:"UoA After Charging",unit:"ratio",group:"Availability",formula:"utIncTKPH / avCycIncChg",dec:4},
  {key:"calCycT",label:"Calendar Cycle Time",unit:"min",group:"Output",formula:"avCycIncChg / T_availability",hl:1},
  {key:"productivity",label:"Productivity",unit:"tph",group:"Output",formula:"T_payload / (calCycT / 60)",hl:1},
  {key:"effHrsDayAfter",label:"Eff Hours/Day",unit:"hrs",group:"Output",formula:"24 * T_availability * uoaAfter * icEffIncTKPH * T_performanceEfficiency"},
  {key:"trkCalHrs",label:"Truck Calendar Hrs Required",unit:"hrs",section:"🚚 TRUCK — Fleet & SMU",group:"Fleet",formula:"totalRampMined / productivity"},
  {key:"trkReq",label:"Trucks Required (dec)",unit:"#",group:"Fleet",formula:"trkCalHrs / calendarHours",dec:2},
  {key:"trkReqR",label:"Trucks Required (rnd)",unit:"#",group:"Fleet",formula:"CEIL(trkReq)",hl:1},
  {key:"trkCapex",label:"Truck Capex",unit:"AUD",group:"Fleet",formula:"trkReqR * T_totalTruckCapex",cur:1},
  {key:"trkCycDay",label:"Truck Cycles/Day",unit:"#",group:"Utilisation",formula:"24 / (calCycT / 60)"},
  {key:"trkRchgDay",label:"Truck Recharges/Day",unit:"#",group:"Utilisation",formula:"trkCycDay * rchgPerHaul"},
  {key:"utHrsNotChg",label:"Utilised Hrs excl Charge",unit:"hrs",group:"SMU",formula:"utIncTKPH / 60"},
  {key:"utHrsDay",label:"Utilised Hrs/Day",unit:"hrs",group:"SMU",formula:"utHrsNotChg * trkCycDay"},
  {key:"trkSmuDay",label:"Truck SMU/Day",unit:"hrs",group:"SMU",formula:"utHrsDay * T_utToSmuConversion"},
  {key:"trkSmuPer",label:"Truck SMU/Period",unit:"hrs",group:"SMU",formula:"trkSmuDay * calendarDays"},
  {key:"totTrkSmu",label:"Total Truck SMU Hours",unit:"hrs",group:"SMU",formula:"trkSmuPer * trkReq",hl:1},
  {key:"netEngPerCyc",label:"Net Energy/Cycle",unit:"kWh",section:"🔋 BATTERY & ⚡ CHARGER",group:"Battery",formula:"avgNetPower + (rchgPerHaul * T_travelToRechargeEnergy)"},
  {key:"eqLifeCycPerHaul",label:"Equiv Life Cycles/Haul",unit:"#",group:"Battery",formula:"netEngPerCyc / T_nominalBatteryCapacityNew",dec:6},
  {key:"eqLifeCycDay",label:"Equiv Life Cycles/Day",unit:"#",group:"Battery",formula:"eqLifeCycPerHaul * trkCycDay",dec:4},
  {key:"eqLifeCycPer",label:"Equiv Life Cycles/Period",unit:"#",group:"Battery",formula:"eqLifeCycDay * calendarDays"},
  {key:"batLifePer",label:"Battery Life (periods)",unit:"per",group:"Replacement",formula:"T_equivalentFullLifeCycles / eqLifeCycPer",hl:1},
  {key:"batPerTrkPer",label:"Batteries/Truck/Period",unit:"#",group:"Replacement",formula:"eqLifeCycPer / T_equivalentFullLifeCycles",dec:4},
  {key:"totReplBatCost",label:"Replacement Battery Cost",unit:"AUD",group:"Battery Cost",formula:"T_powerSystemCost * batPerTrkPer",cur:1},
  {key:"batReplPerSmu",label:"Battery Repl Cost/SMU",unit:"$/SMU",group:"Battery Cost",formula:"totReplBatCost / trkSmuPer",cur:1},
  {key:"chgDur",label:"Charge Duration inc Connection",unit:"min",group:"Charger",formula:"T_chargerQueueTime + T_chargerConnectionPositioningTime + actRchgT"},
  {key:"chgReqDec",label:"Chargers Required (dec)",unit:"#",group:"Charger",formula:"(trkRchgDay*trkReq*(1+T_demandResponseAllowance))/(T_chargerOperatingTime/365/(chgDur/60))",dec:2},
  {key:"chgStaDec",label:"Charger Stations (dec)",unit:"#",group:"Charger",formula:"chgReqDec / T_numBatteriesPerStation",dec:2},
  {key:"chgStaRnd",label:"Charger Stations (rnd)",unit:"#",group:"Charger",formula:"CEIL(chgStaDec)",hl:1},
  {key:"chgCapex",label:"Charger Capex",unit:"AUD",group:"Charger Cost",formula:"chgStaRnd * T_totalChargerCapex",cur:1},
  {key:"chgHrsReq",label:"Charger Hours Required",unit:"hrs",group:"Charger Cost",formula:"chgStaDec * T_avgChargerEffectiveHours * periodMultiplier"},
  {key:"chgCost",label:"Total Charger Cost",unit:"AUD",group:"Charger Cost",formula:"chgHrsReq * T_totalChargerOandO",cur:1},
  {key:"chgCostPerTrkHr",label:"Charger Cost/Truck Hr",unit:"$/hr",group:"Charger Cost",formula:"chgCost / totTrkSmu",cur:1},
  {key:"trkOpex",label:"Truck Opex (base)",unit:"AUD",section:"💰 SUMMARY",group:"Truck Rates",formula:"T_opexPerSmuHour * totTrkSmu",cur:1},
  {key:"trkCphrExc",label:"Truck $/Hr exc Cpx",unit:"$/SMU",group:"Truck Rates",formula:"T_opexPerSmuHour + batReplPerSmu + chgCostPerTrkHr",cur:1},
  {key:"trkCphrInc",label:"Truck $/Hr inc Cpx",unit:"$/SMU",group:"Truck Rates",formula:"trkCphrExc + T_capexPerSmuHour",cur:1},
  {key:"totTrkExc",label:"Total Truck exc Cpx",unit:"AUD",group:"Truck Totals",formula:"trkCphrExc * totTrkSmu",hl:1,cur:1},
  {key:"trkPerTExc",label:"Truck $/t exc Cpx",unit:"$/t",group:"Truck Totals",formula:"totTrkExc / totalRampMined",cur:1},
  {key:"totTrk",label:"Total Truck Cost",unit:"AUD",group:"Truck Totals",formula:"trkCphrInc * totTrkSmu",hl:1,cur:1},
  {key:"trkPerT",label:"Truck $/t",unit:"$/t",group:"Truck Totals",formula:"totTrk / totalRampMined",cur:1},
  {key:"totExc",label:"Total Scenario exc Cpx",unit:"AUD",section:"🏆 GRAND TOTAL",group:"Exc Capex",formula:"totTrkExc + digOpxTotal + digRehandle",hl:1,cur:1},
  {key:"totPerTExc",label:"Total $/t exc Cpx",unit:"$/t",group:"Exc Capex",formula:"totExc / totalMined",hl:1,cur:1},
  {key:"totCost",label:"Total Scenario Cost",unit:"AUD",group:"Inc Capex",formula:"totTrk + digCostActivity + digRehandle",hl:1,cur:1},
  {key:"totPerT",label:"Total $/t",unit:"$/t",group:"Inc Capex",formula:"totCost / totalRampMined",hl:1,cur:1},
];

// ─── 4. UI COMPONENTS ──────────────────────────────────────────────────
const ST=({children,icon})=>(<div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 0 10px",marginTop:20,borderBottom:`2px solid ${P.pri}`,marginBottom:14}}><span style={{fontSize:18}}>{icon}</span><span style={{color:P.pri,fontWeight:700,fontSize:15,fontFamily:ff}}>{children}</span></div>);
const ChartToggles=({series,hidden,onToggle})=>(<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 16px 4px"}}>{series.map(function(s){var vis=!hidden[s.key];return(<button key={s.key} onClick={function(){onToggle(s.key)}} style={{padding:"3px 10px",borderRadius:12,border:"1.5px solid "+(vis?s.color:P.bd),background:vis?s.color+"18":"transparent",color:vis?s.color:P.txD,fontFamily:ff,fontSize:10,fontWeight:600,cursor:"pointer",opacity:vis?1:0.4}}>{vis?"●":"○"} {s.label}</button>)})}</div>);
const Btn=({children,onClick,color=P.pri,small,solid})=>(<button onClick={onClick} style={{padding:small?"5px 12px":"8px 20px",background:solid?color:"transparent",border:`1.5px solid ${color}`,borderRadius:7,color:solid?"#fff":color,fontFamily:ff,fontSize:12,cursor:"pointer",fontWeight:600}}>{children}</button>);
const cardS={background:P.card,borderRadius:10,border:`1px solid ${P.bd}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"};
const selS={padding:"6px 12px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:ff,fontSize:12};
const thS={padding:"9px 10px",color:P.txM,textAlign:"left",fontSize:11,fontWeight:600};

const CompRow=({label,field,models,onChange,unit,type="number",step,section})=>{
  if(section)return(<tr><td colSpan={models.length+2} style={{padding:"16px 14px 6px",color:P.pri,fontWeight:700,fontSize:13,borderBottom:`2px solid ${P.pri}20`,fontFamily:ff,background:P.secBg}}>{label}</td></tr>);
  return(<tr style={{borderBottom:`1px solid ${P.bd}`}}><td style={{padding:"7px 14px",color:P.txM,fontSize:13,fontFamily:ff,whiteSpace:"nowrap",position:"sticky",left:0,background:P.card,zIndex:1}}>{label}</td><td style={{padding:"7px 8px",color:P.txD,fontSize:11,fontFamily:mf}}>{unit}</td>{models.map((m,i)=>(<td key={m.id||i} style={{padding:"3px 6px"}}>{type==="text"?<input type="text" value={m[field]||""} onChange={e=>onChange(i,field,e.target.value)} style={{width:"100%",minWidth:115,padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:ff,fontSize:13}}/>:<input type="number" value={m[field]??""} onChange={e=>onChange(i,field,parseFloat(e.target.value)||0)} step={step||0.01} style={{width:"100%",minWidth:105,padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.tx,fontFamily:mf,fontSize:13,textAlign:"right"}}/>}</td>))}</tr>);
};

const truckRows=[{section:true,label:"Identity & TUM"},{field:"truckName",label:"Truck Name",type:"text"},{field:"payload",label:"Payload",unit:"t"},{field:"powerSource",label:"Power Source",type:"text"},{field:"availability",label:"Availability",unit:"%",step:0.01},{field:"useOfAvailability",label:"Use of Availability",unit:"%",step:0.01},{field:"operatingEfficiency",label:"Operating Efficiency",unit:"%",step:0.01},{field:"utToSmuConversion",label:"UT → SMU",unit:"#"},{field:"performanceEfficiency",label:"Perf Efficiency",unit:"%",step:0.01},{section:true,label:"Spot / Queue / Dump Times"},{field:"spotTimeLoad",label:"Spot Time at Load",unit:"min"},{field:"queueTimeLoad",label:"Queue Time at Load",unit:"min"},{field:"spotTimeDump",label:"Spot Time at Dump",unit:"min"},{field:"queueTimeDump",label:"Queue Time at Dump",unit:"min"},{field:"dumpTime",label:"Dump Time",unit:"min"},{section:true,label:"Capital Expenditure"},{field:"totalTruckCapex",label:"Total Capex",unit:"AUD",step:1000},{field:"capexPerSmuHour",label:"Capex/SMU Hr",unit:"$/SMU"},{field:"powerSystemCost",label:"Power System",unit:"AUD",step:1000},{section:true,label:"Operating Expenditure"},{field:"opexPerSmuHour",label:"Opex/SMU Hr",unit:"$/hr"},{field:"operatorRate",label:"Operator Rate",unit:"$/SMU"},{section:true,label:"Charging"},{field:"nominalBatteryCapacityNew",label:"Nom Battery Cap",unit:"kWh"},{field:"averageBatteryUsableCapacity",label:"Avg Usable Cap",unit:"kWh"},{field:"travelToRechargeEnergy",label:"Travel Rchg Energy",unit:"kWh"},{field:"travelToSwapChargerStationTime",label:"Travel to Charger",unit:"min"},{field:"chargerQueueTime",label:"Queue Time",unit:"min"},{field:"chargerConnectionPositioningTime",label:"Connection Time",unit:"min"},{field:"equivalentFullLifeCycles",label:"Equiv Life Cycles",unit:"#"},{field:"chargingTime",label:"Charging Time",unit:"min"},{field:"rechargeRateC",label:"Recharge Rate",unit:"C"},{section:true,label:"Charger Infrastructure"},{field:"chargerOperatingTime",label:"Charger Op Time",unit:"hrs"},{field:"demandResponseAllowance",label:"Demand Resp %",unit:"%",step:0.01},{field:"numBatteriesPerStation",label:"Batteries/Station",unit:"#"},{field:"totalChargerCapex",label:"Charger Capex",unit:"AUD",step:1000},{field:"avgChargerEffectiveHours",label:"Avg Charger Eff Hrs",unit:"hrs"},{field:"totalChargerOandO",label:"Charger O&O",unit:"$/SMU"}];
const diggerRows=[{section:true,label:"Identity & TUM"},{field:"diggerName",label:"Digger Name",type:"text"},{field:"powerSource",label:"Power Source",type:"text"},{field:"effectiveDigRate",label:"Eff Dig Rate",unit:"t/hr",step:100},{field:"availability",label:"Availability",unit:"%",step:0.01},{field:"useOfAvailability",label:"Use of Availability",unit:"%",step:0.01},{field:"operatingEfficiency",label:"Op Efficiency",unit:"%",step:0.01},{field:"utToSmuConversion",label:"UT → SMU",unit:"#"},{field:"equipmentLife",label:"Equip Life",unit:"hrs"},{field:"effectiveTime",label:"Eff Time",unit:"hrs"},{section:true,label:"Capital Expenditure"},{field:"totalCapex",label:"Total Capex",unit:"AUD",step:10000},{field:"capexPerSmuHour",label:"Capex/SMU",unit:"$/SMU"},{section:true,label:"Operating Expenditure (per SMU)"},{field:"dieselElectricityCost",label:"Diesel/Elec",unit:"$/SMU"},{field:"maintenanceLabour",label:"Maint Labour",unit:"$/SMU"},{field:"oilAndCoolant",label:"Oil & Coolant",unit:"$/SMU"},{field:"partsComponentsPM05",label:"Parts PM05",unit:"$/SMU"},{field:"materialsConsumables",label:"Materials",unit:"$/SMU"},{field:"get",label:"GET",unit:"$/SMU"},{field:"cableCost",label:"Cable Cost",unit:"$/SMU"},{field:"tracks",label:"Tracks",unit:"$/SMU"},{field:"tires",label:"Tires",unit:"$/SMU"},{field:"fmsLicenseFee",label:"FMS License",unit:"$/SMU"},{field:"batteryReplacement",label:"Battery Repl",unit:"$/SMU"},{field:"operatorCost",label:"Operator",unit:"$/SMU"},{field:"rehandleCostPerTonne",label:"Rehandle $/t",unit:"$/t"}];

// ─── 5. APP COMPONENT ──────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("scenarios");
  const [trucks,setTrucks]=useState(()=>[mkTruck(),mkTruckL()]);
  const [diggers,setDiggers]=useState(()=>[mkDigger(),mkDigger4()]);
  const [otherA,setOtherA]=useState(defaultOther);
  const [formulas,setFormulas]=useState(defaultFormulas);
  const [fleets,setFleets]=useState(()=>[mkFleet("Fleet 1",0,0),mkFleet("Fleet 2",1,1)]);
  const [scenarios,setScenarios]=useState(()=>[mkScenario("Scenario ST"),mkScenario("Scenario LT")]);
  const [activeScnIdx,setActiveScnIdx]=useState(0);
  const [formulaSearch,setFormulaSearch]=useState("");
  const [editingFormula,setEditingFormula]=useState(null);
  const [editText,setEditText]=useState("");
  const [collSec,setCollSec]=useState({});
  const [collGrp,setCollGrp]=useState({});
  const togSec=(s)=>setCollSec(p=>{const n={...p};n[s]=!n[s];return n});
  const togGrp=(g)=>setCollGrp(p=>{const n={...p};n[g]=!n[g];return n});
  const [testPeriodIdx,setTestPeriodIdx]=useState(0);
  const [testFleetIdx,setTestFleetIdx]=useState(0);
  const [hiddenSeries,setHiddenSeries]=useState({});
  const togSeries=(k)=>setHiddenSeries(p=>{const n={...p};n[k]=!n[k];return n});
  const isVis=(k)=>!hiddenSeries[k];
  const fileRef=useRef();

  const scn=scenarios[activeScnIdx]||scenarios[0];
  const updScn=(fn)=>setScenarios(prev=>{const n=[...prev];n[activeScnIdx]=fn({...n[activeScnIdx]});return n});

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

  const getPd=useCallback((pi,fleet)=>{
    const psIdx=scn.fleetPhysicalSets[fleet.id]||0;
    const mapping=scn.fieldMappings[psIdx]||scn.fieldMappings[0];
    if(!mapping)return null;
    if(scn.csvData){
      const r={period:pi+1,periodLabel:scn.csvData.gs("Period",pi)||`P${pi+1}`,days:scn.csvData.gv("Days",pi)||91};
      r.hours=scn.csvData.gv("Hours",pi)||r.days*24;
      for(const pf of PHYS_FIELDS)r[pf.key]=mapping.fields[pf.key]?scn.csvData.gv(mapping.fields[pf.key],pi):0;
      return r;
    }
    return scn.manualData[pi]||null;
  },[scn]);

  const numPeriods=scn.csvData?scn.csvData.np:scn.manualData.length;
  const activeFleets=fleets.filter(f=>scn.activeFleetIds.length===0||scn.activeFleetIds.includes(f.id));

  const results=useMemo(()=>{
    const all=[];
    for(let pi=0;pi<numPeriods;pi++){
      for(const fleet of activeFleets){
        const pd=getPd(pi,fleet);if(!pd)continue;
        const ti=Math.min(fleet.truckIdx,trucks.length-1),di=Math.min(fleet.diggerIdx,diggers.length-1);
        const res=calcWithFormulas({totalMined:(pd.totalMined||0)*scn.unitMul,oreMined:(pd.oreMined||0)*scn.unitMul,totalRampMined:(pd.totalRampMined||pd.totalMined||0)*scn.unitMul,avgLoadedTravelTime:pd.avgLoadedTravelTime||0,avgUnloadedTravelTime:pd.avgUnloadedTravelTime||0,avgNetPower:pd.avgNetPower||0,avgTkphDelay:pd.avgTkphDelay||0,schedPeriod:scn.schedPeriod,calendarDays:pd.days||91,calendarHours:pd.hours||2184,truck:trucks[ti],digger:diggers[di],other:otherA,fleet:fleet},formulas);
        all.push({pi,periodLabel:pd.periodLabel||`P${pi+1}`,fleet,fleetName:fleet.name,truckName:trucks[ti]?.truckName,diggerName:diggers[di]?.diggerName,equipKey:`${fleet.truckIdx}-${fleet.diggerIdx}`,res,pd});
      }
    }
    return all;
  },[numPeriods,activeFleets,trucks,diggers,otherA,formulas,scn,getPd]);

  const totals=useMemo(()=>{const t={m:0,c:0};results.forEach(r=>{if(!r.res)return;t.m+=(r.pd?.totalMined||0)*scn.unitMul;t.c+=r.res.totCost||0});t.cpt=t.m>0?t.c/t.m:0;return t},[results,scn.unitMul]);

  const updT=(i,f,v)=>setTrucks(p=>{const n=[...p];n[i]={...n[i],[f]:v};return n});
  const updD=(i,f,v)=>setDiggers(p=>{const n=[...p];n[i]={...n[i],[f]:v};return n});
  const uO=(k,v)=>setOtherA(p=>({...p,[k]:v}));
  const updFleet=(i,k,v)=>setFleets(p=>{const n=[...p];n[i]={...n[i],[k]:v};return n});

  const navGroups=[
    {label:"Assumptions",items:[{id:"other",label:"General",icon:"⚙️"},{id:"truck",label:"Trucks",icon:"🚛"},{id:"digger",label:"Diggers",icon:"⛏️"}]},
    {label:"Setup",items:[{id:"formulas",label:"Formulas",icon:"🧮"},{id:"fleets",label:"Fleet Combos",icon:"🏗️"}]},
    {label:"Scenario Manager",items:[{id:"scenarios",label:"Scenarios",icon:"📋"},{id:"schedule",label:"Schedule",icon:"📅"},{id:"results",label:"Results",icon:"📊"}]},
    {label:"Comparison",items:[{id:"comparison",label:"Comparison",icon:"⚖️"}]}
  ];
  const activeGroup=navGroups.find(g=>g.items.some(i=>i.id===page))||navGroups[0];

  return(
    <div style={{minHeight:"100vh",background:P.bg,color:P.tx,fontFamily:ff}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{background:P.hdr,padding:"12px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⛏️</div>
          <div><h1 style={{margin:0,fontSize:17,fontWeight:700,color:P.hdrTx}}>Mining Fleet Cost Engine</h1></div>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <select value={activeScnIdx} onChange={e=>setActiveScnIdx(parseInt(e.target.value))} style={{padding:"6px 14px",background:"#1f2937",border:"1px solid #374151",borderRadius:6,color:"#60a5fa",fontFamily:ff,fontSize:13,fontWeight:700}}>
            {scenarios.map((s,i)=><option key={i} value={i}>{s.name}</option>)}
          </select>
          {totals.c>0&&(<>
            <div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>$/Tonne</div><div style={{color:"#60a5fa",fontSize:20,fontWeight:800,fontFamily:mf}}>{fmtC2(totals.cpt)}</div></div>
            <div style={{width:1,height:32,background:"#374151"}}/>
            <div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Total</div><div style={{color:P.hdrTx,fontSize:15,fontWeight:700,fontFamily:mf}}>{fmtCur(totals.c)}</div></div>
          </>)}
        </div>
      </div>
      <div style={{display:"flex",padding:"0 32px",background:"#1f2937",overflowX:"auto"}}>
        {navGroups.map(g=>{const isA=g===activeGroup;return(<button key={g.label} onClick={()=>setPage(g.items[0].id)} style={{padding:"10px 24px",background:isA?"rgba(255,255,255,0.08)":"transparent",border:"none",borderBottom:isA?"2px solid #60a5fa":"2px solid transparent",color:isA?"#f0f1f4":"#9ca3af",fontFamily:ff,fontSize:13,fontWeight:isA?700:500,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:0.2}}>{g.label}</button>)})}
      </div>
      <div style={{display:"flex",padding:"0 32px",background:P.card,borderBottom:"1px solid "+P.bd,overflowX:"auto"}}>
        {activeGroup.items.map(n=>(<button key={n.id} onClick={()=>setPage(n.id)} style={{padding:"11px 20px",background:"transparent",border:"none",borderBottom:page===n.id?"3px solid "+P.pri:"3px solid transparent",color:page===n.id?P.pri:P.txD,fontFamily:ff,fontSize:12,fontWeight:page===n.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}><span style={{marginRight:6}}>{n.icon}</span>{n.label}</button>))}
      </div>
      <div style={{padding:"20px 32px 60px",maxWidth:1600,margin:"0 auto"}}>
        {page==="scenarios"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><ST icon="📋">Scenario Manager</ST><Btn onClick={()=>setScenarios(p=>[...p,mkScenario(`Scenario ${p.length+1}`)])} solid>+ New Scenario</Btn></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))",gap:16}}>{scenarios.map((s,si)=>(
              <div key={s.id} style={{...cardS,padding:20,border:si===activeScnIdx?`2px solid ${P.pri}`:`1px solid ${P.bd}`}}>
                <input type="text" value={s.name} onChange={e=>setScenarios(p=>{const n=[...p];n[si]={...n[si],name:e.target.value};return n})} style={{padding:"6px 10px",background:P.input,border:`1px solid ${P.bd}`,borderRadius:6,color:P.pri,fontFamily:ff,fontSize:16,fontWeight:700,width:200}}/>
                <div style={{fontSize:12,color:P.txM,marginTop:10}}>📅 {s.csvData?`${s.csvData.np} periods`:`${s.manualData.length} periods`}</div>
                <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>setActiveScnIdx(si)} solid={si===activeScnIdx} color={si===activeScnIdx?P.pri:P.txD} small>{si===activeScnIdx?"Active":"Select"}</Btn></div>
              </div>))}</div>
        </div>)}
        {page==="schedule"&&(<div><ST icon="📤">Schedule — {scn.name}</ST><div style={{...cardS,padding:18}}><input ref={fileRef} type="file" accept=".csv" onChange={handleUpload}/></div></div>)}
        {page==="truck"&&(<div><ST icon="🚛">Truck Models</ST>
          <div style={{...cardS,overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr style={{background:P.secBg}}><th style={thS}>Parameter</th><th style={thS}>Unit</th>{trucks.map((t,i)=>(<th key={i} style={thS}>Model {i+1}</th>))}</tr></thead>
            <tbody>{truckRows.map((r,i)=><CompRow key={i} {...r} models={trucks} onChange={updT}/>)}</tbody>
          </table></div>
        </div>)}
        {page==="digger"&&(<div><ST icon="⛏️">Digger Models</ST>
          <div style={{...cardS,overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr style={{background:P.secBg}}><th style={thS}>Parameter</th><th style={thS}>Unit</th>{diggers.map((d,i)=>(<th key={i} style={thS}>Model {i+1}</th>))}</tr></thead>
            <tbody>{diggerRows.map((r,i)=><CompRow key={i} {...r} models={diggers} onChange={updD}/>)}</tbody>
          </table></div>
        </div>)}
      </div>
    </div>
  );
}
