import{c as l,a3 as e,E as p}from"./index-D482EyHT.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=l("CreditCard",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]),a="order-files";async function m(r,n,s){if(!p||!e)throw new Error("File storage is not configured.");const c=n.replace(/[^a-zA-Z0-9_-]/g,"_"),u=s.replace(/[^a-zA-Z0-9_-]/g,"_"),i=r.name.replace(/[^a-zA-Z0-9._-]/g,"_"),t=`orders/${c}/${u}-${i}`,{error:d}=await e.storage.from(a).upload(t,r,{upsert:!0,contentType:r.type||void 0});if(d)throw new Error(`Unable to upload ${r.name}.`);const{data:o}=e.storage.from(a).getPublicUrl(t);if(!o.publicUrl)throw new Error(`Unable to create a download link for ${r.name}.`);return{path:t,url:o.publicUrl}}function b(r){return r?/^https?:\/\//i.test(r)?r:e?e.storage.from(a).getPublicUrl(r).data.publicUrl:null:null}export{f as C,b as g,m as u};
