import{c as s}from"./Index-CPtlDmMa.js";const o="https://graphql.anilist.co";async function c(){return s("schedule",async()=>{var i,a;const e=await(await fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:`
          query {
            Page(perPage: 20) {
              media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                id
                title { romaji english }
                coverImage { large }
                episodes
                nextAiringEpisode { airingAt episode timeUntilAiring }
                genres
                averageScore
              }
            }
          }
        `})})).json();return(((a=(i=e==null?void 0:e.data)==null?void 0:i.Page)==null?void 0:a.media)||[]).filter(n=>n.nextAiringEpisode)})}async function d(t,e){return s(`seasonal:${t}:${e}`,async()=>{var n,r;const a=await(await fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:`
          query ($season: MediaSeason, $year: Int) {
            Page(perPage: 50) {
              media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) {
                id
                title { romaji english }
                coverImage { large }
                episodes
                status
                format
                genres
                averageScore
                seasonYear
                nextAiringEpisode { episode timeUntilAiring }
              }
            }
          }
        `,variables:{season:t,year:e}})})).json();return((r=(n=a==null?void 0:a.data)==null?void 0:n.Page)==null?void 0:r.media)||[]})}function l(t){const e=Math.floor(t/86400),i=Math.floor(t%86400/3600);if(e>0)return`${e}d ${i}h`;const a=Math.floor(t%3600/60);return i>0?`${i}h ${a}m`:`${a}m`}export{d as a,l as f,c as g};
