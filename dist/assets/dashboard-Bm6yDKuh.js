import{c as X,k as te,u as ae,r as u,i as le,E as ne,A as V,j as e,f as z,L as W,z as ie,t as b,G as de,p as ce,H as re}from"./index-Bvv0whLS.js";import{H as q,a as K,T as N,F as E,b as oe,P as me}from"./footer-kARsJ5gd.js";import{B as g,c as w}from"./button-ChYvT5ed.js";import{I as f}from"./input-BlOqXH0n.js";import{L as j}from"./label-vxP83q8Z.js";import{T as xe,a as pe,b as R,c as B,D as he}from"./tabs-DrA8fd1w.js";import{C as m,a as x}from"./card-Bivg4Bb0.js";import{B as U,P as ue}from"./badge-CPgj34p3.js";import{g as ge,T as P,O as fe}from"./order-tracking-modal-EqcirCjn.js";import{P as T}from"./package-DqBlkRsL.js";import{C as Y}from"./clock-D44J0bea.js";import{T as je}from"./trash-2-BcWtTUOe.js";import{C as be}from"./circle-check-CnndVEu1.js";import{C as ve}from"./circle-x-_lh3eZ5U.js";import"./phone-DKoPWuOZ.js";import"./house-HNUEmZuj.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne=X("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ye=X("Wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]),k={placed:{icon:Y,color:"bg-blue-500/10 text-blue-600",label:"Order Placed"},processing:{icon:me,color:"bg-amber-500/10 text-amber-600",label:"Processing"},packed:{icon:T,color:"bg-orange-500/10 text-orange-600",label:"Packed"},shipped:{icon:N,color:"bg-sky-500/10 text-sky-600",label:"Shipped"},out_for_delivery:{icon:N,color:"bg-indigo-500/10 text-indigo-600",label:"Out for Delivery"},delivered:{icon:be,color:"bg-emerald-500/10 text-emerald-600",label:"Delivered"},cancelled:{icon:ve,color:"bg-destructive/10 text-destructive",label:"Cancelled"}};function Be(){var G;const a=te(),{user:r,profile:i,loading:y}=ae(),[l,A]=u.useState([]),[S,v]=u.useState([]),[I,$]=u.useState(!0),[H,_]=u.useState(!1),[M,O]=u.useState(null),[L,C]=u.useState(null),[t,d]=u.useState({label:"Home",name:"",phone:"",line1:"",line2:"",city:"",state:"",pincode:""});u.useEffect(()=>{if(!y){if(!r){a("/login?redirect=/dashboard");return}if(!le){$(!1);return}Promise.all([ne(r.uid).catch(()=>[]),V(r.uid).catch(()=>[])]).then(([s,n])=>{A(s),v(n),$(!1)}).catch(()=>$(!1))}},[r,y,a]);const J=async()=>{if(r){if(!t.name||!t.phone||!t.line1||!t.city||!t.state||!t.pincode){b.error("Please fill in all address fields.");return}try{L?(await de(L.id,{label:t.label,name:t.name,phone:t.phone,line1:t.line1,line2:t.line2,city:t.city,state:t.state,pincode:t.pincode}),b.success("Address updated.")):(await ce({user_id:r.uid,...t,alternate_phone:null,email:null,house_flat:null,street_area:null,landmark:null,delivery_instructions:null,is_default:!1}),b.success("Address saved.")),_(!1),C(null),d({label:"Home",name:"",phone:"",line1:"",line2:"",city:"",state:"",pincode:""});const s=await V(r.uid);v(s)}catch{b.error("Failed to save address.")}}},Q=async s=>{try{await re(s),v(n=>n.filter(o=>o.id!==s)),b.success("Address deleted.")}catch{b.error("Failed to delete address.")}},Z=s=>{const n=we(s,(i==null?void 0:i.full_name)??""),o=new Blob([n],{type:"text/html"}),p=URL.createObjectURL(o),c=document.createElement("a");c.href=p,c.download=`Invoice-${s.order_number}.html`,c.click(),URL.revokeObjectURL(p),b.success("Invoice downloaded.")};if(y||I)return e.jsxs(e.Fragment,{children:[e.jsx(q,{}),e.jsx("main",{className:"flex min-h-screen items-center justify-center",children:e.jsx("div",{className:"text-muted-foreground",children:"Loading..."})})]});const ee=l.filter(s=>s.payment_status==="paid").reduce((s,n)=>s+n.total,0),se=l.filter(s=>!["delivered","cancelled"].includes(s.order_status)).length;return e.jsxs(e.Fragment,{children:[e.jsx(q,{}),e.jsx("main",{className:"min-h-screen bg-muted/30 py-10",children:e.jsxs("div",{className:"container mx-auto max-w-6xl px-4 lg:px-8",children:[e.jsxs("div",{className:"mb-8",children:[e.jsxs("h1",{className:"font-display text-3xl font-bold",children:["Welcome, ",((G=i==null?void 0:i.full_name)==null?void 0:G.split(" ")[0])??"Customer","!"]}),e.jsx("p",{className:"mt-1 text-muted-foreground",children:"Manage your orders, addresses, and invoices."})]}),e.jsxs("div",{className:"mb-8 grid gap-4 sm:grid-cols-3",children:[e.jsx(m,{children:e.jsxs(x,{className:"flex items-center gap-4 p-5",children:[e.jsx("div",{className:"flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary",children:e.jsx(T,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Total Orders"}),e.jsx("p",{className:"font-display text-2xl font-bold",children:l.length})]})]})}),e.jsx(m,{children:e.jsxs(x,{className:"flex items-center gap-4 p-5",children:[e.jsx("div",{className:"flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600",children:e.jsx(Ne,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Active Orders"}),e.jsx("p",{className:"font-display text-2xl font-bold",children:se})]})]})}),e.jsx(m,{children:e.jsxs(x,{className:"flex items-center gap-4 p-5",children:[e.jsx("div",{className:"flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600",children:e.jsx(ye,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Total Spent"}),e.jsx("p",{className:"font-display text-2xl font-bold",children:z(ee)})]})]})})]}),e.jsxs(xe,{defaultValue:"orders",children:[e.jsxs(pe,{className:"mb-6 grid w-full grid-cols-2 sm:w-auto sm:grid-cols-3",children:[e.jsxs(R,{value:"orders",className:"gap-1.5",children:[e.jsx(T,{className:"h-4 w-4"})," Orders"]}),e.jsxs(R,{value:"addresses",className:"gap-1.5",children:[e.jsx(K,{className:"h-4 w-4"})," Addresses"]}),e.jsxs(R,{value:"tracking",className:"gap-1.5",children:[e.jsx(N,{className:"h-4 w-4"})," Tracking"]})]}),e.jsx(B,{value:"orders",className:"space-y-4",children:l.length===0?e.jsx(m,{children:e.jsxs(x,{className:"flex flex-col items-center justify-center py-16 text-center",children:[e.jsx(T,{className:"mb-3 h-12 w-12 text-muted-foreground/40"}),e.jsx("p",{className:"font-display text-lg font-semibold",children:"No orders yet"}),e.jsx("p",{className:"mt-1 text-sm text-muted-foreground",children:"Start printing to see your orders here."}),e.jsx(W,{to:"/print",className:"mt-4",children:e.jsxs(g,{className:"gap-2",children:[e.jsx(E,{className:"h-4 w-4"})," Upload & Print"]})})]})}):l.map(s=>{var o,p,c;const n=((o=k[s.order_status])==null?void 0:o.icon)??Y;return e.jsx(m,{children:e.jsxs(x,{className:"p-5",children:[e.jsxs("div",{className:"flex flex-wrap items-start justify-between gap-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("p",{className:"font-mono text-sm font-semibold",children:s.order_number}),e.jsxs(U,{variant:"secondary",className:w("gap-1",(p=k[s.order_status])==null?void 0:p.color),children:[e.jsx(n,{className:"h-3 w-3"}),(c=k[s.order_status])==null?void 0:c.label]})]}),e.jsxs("p",{className:"mt-1 text-xs text-muted-foreground",children:[new Date(s.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})," • ",s.items.length," item",s.items.length!==1?"s":""," • ",s.payment_method==="cod"?"COD":s.payment_method==="advance"?"50% Advance":"100% Online"]})]}),e.jsxs("div",{className:"text-right",children:[e.jsx("p",{className:"font-display text-lg font-bold text-primary",children:z(s.total)}),e.jsx("p",{className:"text-xs text-muted-foreground",children:s.payment_status==="paid"?"Paid":"Pending"})]})]}),e.jsxs("div",{className:"mt-4 flex flex-wrap gap-2",children:[s.items.slice(0,3).map((h,D)=>e.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs",children:[e.jsx(E,{className:"h-3 w-3 text-primary"}),e.jsx("span",{className:"max-w-32 truncate",children:h.fileName}),e.jsxs("span",{className:"text-muted-foreground",children:[h.copies,"x"]})]},D)),s.items.length>3&&e.jsxs("div",{className:"flex items-center rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground",children:["+",s.items.length-3," more"]})]}),e.jsxs("div",{className:"mt-4 flex gap-2",children:[e.jsxs(g,{variant:"outline",size:"sm",className:"gap-1.5",onClick:()=>Z(s),children:[e.jsx(he,{className:"h-3.5 w-3.5"})," Invoice"]}),e.jsxs(g,{variant:"ghost",size:"sm",className:"gap-1.5",onClick:()=>O(s.id),children:[e.jsx(N,{className:"h-3.5 w-3.5"})," Track"]})]})]})},s.id)})}),e.jsxs(B,{value:"addresses",className:"space-y-4",children:[!H&&e.jsxs(g,{onClick:()=>{C(null),d({label:"Home",name:(i==null?void 0:i.full_name)??"",phone:(i==null?void 0:i.phone)??"",line1:"",line2:"",city:"",state:"",pincode:""}),_(!0)},className:"gap-2",children:[e.jsx(ie,{className:"h-4 w-4"})," Add New Address"]}),H&&e.jsx(m,{children:e.jsxs(x,{className:"p-6",children:[e.jsx("h3",{className:"mb-4 font-display text-lg font-bold",children:L?"Edit Address":"New Address"}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"Label"}),e.jsx(f,{value:t.label,onChange:s=>d({...t,label:s.target.value}),placeholder:"Home, Office, etc."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"Full Name"}),e.jsx(f,{value:t.name,onChange:s=>d({...t,name:s.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"Phone"}),e.jsx(f,{value:t.phone,onChange:s=>d({...t,phone:s.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"PIN Code"}),e.jsx(f,{value:t.pincode,onChange:s=>d({...t,pincode:s.target.value.replace(/\D/g,"").slice(0,6)}),maxLength:6})]}),e.jsxs("div",{className:"space-y-2 sm:col-span-2",children:[e.jsx(j,{children:"Address Line 1"}),e.jsx(f,{value:t.line1,onChange:s=>d({...t,line1:s.target.value})})]}),e.jsxs("div",{className:"space-y-2 sm:col-span-2",children:[e.jsx(j,{children:"Address Line 2 (optional)"}),e.jsx(f,{value:t.line2,onChange:s=>d({...t,line2:s.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"City"}),e.jsx(f,{value:t.city,onChange:s=>d({...t,city:s.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{children:"State"}),e.jsx(f,{value:t.state,onChange:s=>d({...t,state:s.target.value})})]})]}),e.jsxs("div",{className:"mt-4 flex gap-2",children:[e.jsx(g,{onClick:J,children:"Save Address"}),e.jsx(g,{variant:"outline",onClick:()=>{_(!1),C(null)},children:"Cancel"})]})]})}),e.jsx("div",{className:"grid gap-4 sm:grid-cols-2",children:S.map(s=>e.jsx(m,{children:e.jsxs(x,{className:"p-5",children:[e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary",children:e.jsx(K,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"font-display text-sm font-semibold",children:s.label}),s.is_default&&e.jsx(U,{variant:"secondary",className:"text-xs",children:"Default"})]})]}),e.jsxs("div",{className:"flex gap-1",children:[e.jsx("button",{onClick:()=>{C(s),d({label:s.label,name:s.name,phone:s.phone,line1:s.line1,line2:s.line2??"",city:s.city,state:s.state,pincode:s.pincode}),_(!0)},className:"rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground",children:e.jsx(ue,{className:"h-3.5 w-3.5"})}),e.jsx("button",{onClick:()=>Q(s.id),className:"rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",children:e.jsx(je,{className:"h-3.5 w-3.5"})})]})]}),e.jsxs("div",{className:"mt-3 text-sm text-muted-foreground",children:[e.jsx("p",{className:"font-medium text-foreground",children:s.name}),e.jsxs("p",{children:[s.line1,s.line2?", "+s.line2:""]}),e.jsxs("p",{children:[s.city,", ",s.state," - ",s.pincode]}),e.jsx("p",{children:s.phone})]})]})},s.id))})]}),e.jsx(B,{value:"tracking",className:"space-y-4",children:l.filter(s=>!["cancelled"].includes(s.order_status)).length===0?e.jsx(m,{children:e.jsxs(x,{className:"flex flex-col items-center justify-center py-16 text-center",children:[e.jsx(N,{className:"mb-3 h-12 w-12 text-muted-foreground/40"}),e.jsx("p",{className:"font-display text-lg font-semibold",children:"No active orders to track"}),e.jsx(W,{to:"/print",className:"mt-4",children:e.jsxs(g,{className:"gap-2",children:[e.jsx(E,{className:"h-4 w-4"})," Start Printing"]})})]})}):l.filter(s=>!["cancelled"].includes(s.order_status)).map(s=>{var o,p;const n=ge(s.order_status);return e.jsx(m,{children:e.jsxs(x,{className:"p-6",children:[e.jsxs("div",{className:"mb-6 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"font-mono text-sm font-semibold",children:s.order_number}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:[s.items.length," items • ",z(s.total)]})]}),e.jsx(U,{variant:"secondary",className:(o=k[s.order_status])==null?void 0:o.color,children:(p=k[s.order_status])==null?void 0:p.label})]}),e.jsxs("div",{className:"mb-6",children:[e.jsx("div",{className:"h-2 w-full overflow-hidden rounded-full bg-muted",children:e.jsx("div",{className:"h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700",style:{width:`${(n+1)/P.length*100}%`}})}),e.jsxs("div",{className:"mt-1.5 flex justify-between text-xs font-medium text-muted-foreground",children:[e.jsx("span",{children:"Placed"}),e.jsxs("span",{children:[Math.round((n+1)/P.length*100),"%"]}),e.jsx("span",{children:"Delivered"})]})]}),e.jsx("div",{className:"flex items-center",children:P.map((c,h)=>{const D=c.icon,F=h<=n;return e.jsxs("div",{className:"flex flex-1 flex-col items-center",children:[e.jsxs("div",{className:"flex w-full items-center",children:[h>0&&e.jsx("div",{className:w("h-1 flex-1",h<=n?"bg-primary":"bg-border")}),e.jsx("div",{className:w("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",F?"border-transparent text-white":"border-border bg-background text-muted-foreground",F&&c.bg),children:e.jsx(D,{className:"h-4 w-4"})}),h<P.length-1&&e.jsx("div",{className:w("h-1 flex-1",h<n?"bg-primary":"bg-border")})]}),e.jsx("p",{className:w("mt-2 text-center text-xs",F?"font-semibold text-foreground":"text-muted-foreground"),children:c.label})]},c.key)})}),s.tracking_id&&e.jsxs("div",{className:"mt-4 rounded-lg bg-muted/50 p-3 text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"Tracking ID: "}),e.jsx("span",{className:"font-mono font-semibold",children:s.tracking_id})]}),e.jsxs(g,{className:"mt-4 w-full gap-2",onClick:()=>O(s.id),children:[e.jsx(N,{className:"h-4 w-4"})," View Detailed Tracking"]})]})},s.id)})})]})]})}),e.jsx(oe,{}),e.jsx(fe,{orderId:M??"",open:M!==null,onClose:()=>O(null)})]})}function we(a,r){const y=a.items.map(l=>{const A=l.side==="double"?"Both Sides":"One Side",S=l.printType==="bw"?"B&W":"Color",v=l.pages*l.copies,I=v>0?l.price/v:0;return`
      <tr>
        <td>${l.fileName}</td>
        <td>${l.pages}</td>
        <td>${l.copies}</td>
        <td>${S} (${A})</td>
        <td>${l.paperGsm} GSM</td>
        <td>${l.binding}</td>
        <td style="text-align:right">₹${I.toFixed(2)}</td>
        <td style="text-align:right">₹${l.price.toFixed(2)}</td>
      </tr>`}).join("");return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${a.order_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a202c; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
  .invoice-title { font-size: 28px; font-weight: bold; }
  .section { margin-bottom: 20px; }
  .section h3 { color: #2563eb; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .totals { margin-left: auto; width: 300px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #2563eb; padding-top: 12px; font-size: 18px; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ONLINE PRINT 4U</div>
      <p style="font-size:12px;color:#64748b;margin-top:4px">Fast, Easy & Reliable Online Document Printing</p>
    </div>
    <div style="text-align:right">
      <div class="invoice-title">INVOICE</div>
      <p style="font-size:13px;color:#64748b">${a.order_number}</p>
      <p style="font-size:13px;color:#64748b">${new Date(a.created_at).toLocaleDateString("en-IN")}</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:30px">
    <div class="section">
      <h3>Bill To</h3>
      <p style="font-size:14px"><strong>${r}</strong></p>
      <p style="font-size:13px;color:#64748b">${a.shipping_address}</p>
      <p style="font-size:13px;color:#64748b">${a.shipping_phone}</p>
    </div>
    <div class="section">
      <h3>Payment</h3>
      <p style="font-size:13px">Method: ${a.payment_method==="cod"?"50% Advance Paid & 50% on Delivery":a.payment_method==="advance"?"50% Advance Paid (Online)":"100% Full Online Payment"}</p>
      <p style="font-size:13px">Status: ${a.payment_status}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Document</th>
        <th>Pages</th>
        <th>Copies</th>
        <th>Print Type</th>
        <th>Paper</th>
        <th>Binding</th>
        <th style="text-align:right">Rate/Page</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${y}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>₹${a.subtotal.toFixed(2)}</span></div>
    ${a.discount>0?`<div><span>Discount ${a.coupon_code?"("+a.coupon_code+")":""}</span><span>-₹${a.discount.toFixed(2)}</span></div>`:""}
    <div><span>Shipping</span><span>₹${a.shipping_cost.toFixed(2)}</span></div>
    <div class="grand"><span>Total</span><span>₹${a.total.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for choosing ONLINE PRINT 4U!</p>
    <p>For support: contact@onlineprint4u.in • +91 7858093865</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>`}export{Be as default};
