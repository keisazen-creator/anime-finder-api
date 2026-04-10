import{c as u}from"./index-DcrqjfEH.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=u("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=u("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]),l="kogemi_favorites";function c(){try{const t=localStorage.getItem(l);return t?JSON.parse(t):[]}catch{return[]}}function d(t){localStorage.setItem(l,JSON.stringify(t))}function S(t){return c().some(e=>e.animeId===t)}function I(t){const e=c(),a=e.findIndex(s=>s.animeId===t.animeId);return a>=0?(e.splice(a,1),d(e),!1):(e.unshift({...t,addedAt:Date.now()}),d(e),!0)}function y(){return c().sort((t,e)=>e.addedAt-t.addedAt)}const f="kogemi_watchlist";function o(){try{const t=localStorage.getItem(f);return t?JSON.parse(t):[]}catch{return[]}}function g(t){localStorage.setItem(f,JSON.stringify(t))}function v(){return o().sort((t,e)=>e.updatedAt-t.updatedAt)}function w(t){return o().filter(e=>e.status===t).sort((e,a)=>a.updatedAt-e.updatedAt)}function W(t){const e=o().find(a=>a.animeId===t);return(e==null?void 0:e.status)??null}function _(t,e,a,s){const n=o(),i=n.findIndex(p=>p.animeId===t),r=Date.now();i>=0?(n[i].status=e,n[i].updatedAt=r):n.unshift({animeId:t,title:a,coverImage:s,status:e,addedAt:r,updatedAt:r}),g(n.slice(0,200))}function F(t){g(o().filter(e=>e.animeId!==t))}const O={watching:"Continue",completed:"Completed",plan_to_watch:"Plan to Watch",dropped:"Dropped"};export{A as H,h as P,O as W,y as a,v as b,w as c,W as g,S as i,F as r,_ as s,I as t};
