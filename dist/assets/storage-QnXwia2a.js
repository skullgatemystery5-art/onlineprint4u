import{c as u,$ as r,i as g,a0 as p,a1 as y,a2 as f}from"./index-BPRtwb6S.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=u("CreditCard",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);async function w(e,n,s){if(!g||!r)throw new Error("File storage is not configured.");const o=n.replace(/[^a-zA-Z0-9_-]/g,"_"),i=s.replace(/[^a-zA-Z0-9_-]/g,"_"),c=e.name.replace(/[^a-zA-Z0-9._-]/g,"_"),t=`orders/${o}/${i}-${c}`,a=p(r,t);await y(a,e,{contentType:e.type||void 0});const d=await f(a);return{path:t,url:d}}function C(e){return e&&(/^https?:\/\//i.test(e)||r)?e:null}export{m as C,C as g,w as u};
