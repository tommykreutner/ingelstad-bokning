const fs=require("fs");
let c=fs.readFileSync("src/app/api/settings/route.ts","utf-8");
const old = "  const kokFields = ['kitchen_email','food_options','kitchen_email_text'];\r\n  const body2 = await req.clone().json().catch(()=>({}));\r\n  const isKokOnly = session?.role === 'kok' && Object.keys(body2).every((k:string) => kokFields.includes(k));\r\n  if (!session || (session.role !== 'admin' && !isKokOnly)) {\r\n    return NextResponse.json({ error: 'Ej beh\u00f6rig' }, { status: 40";
const newCode = "  if (!session) {\r\n    return NextResponse.json({ error: 'Ej beh\u00f6rig' }, { status: 40";
c=c.replace(old,newCode);
fs.writeFileSync("src/app/api/settings/route.ts",c);
console.log("Done:", !c.includes("kokFields"));
